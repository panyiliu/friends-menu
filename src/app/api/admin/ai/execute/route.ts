import { ensureAdmin } from "@/lib/api-auth";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  callAiWithRetryForGenerateDishEnInfo,
  callAiWithRetryForGenerateDishEnInfoBatch,
  getSystemPromptForGenerateDishEnInfo,
  mergePrompts,
  writebackDishAndCategoryEnglishNames,
} from "@/lib/ai/execute";
import { createAiTaskLog, updateAiTaskLog } from "@/lib/ai/task-log";
import { NextRequest, NextResponse } from "next/server";

type GenerateDishEnInfoInputItem = {
  dishId: string;
  name_cn: string;
  category_cn: string;
  promptOverride?: string;
};

type GenerateDishEnInfoBody =
  | {
      functionCode: "generate_dish_en_info";
      input: GenerateDishEnInfoInputItem;
      batchId?: string;
    }
  | {
      functionCode: "generate_dish_en_info";
      input: GenerateDishEnInfoInputItem[];
      batchId?: string;
    };

type GenerateDishEnInfoResultItem = {
  dishId: string;
  success: boolean;
  name_en?: string;
  category_en?: string;
  writeback: {
    dishEnglishNameUpdated: boolean;
    categoryEnglishNameUpdated: boolean;
  };
  error?: string;
};

type GenerateDishEnInfoResponse = {
  success: boolean;
  data?: GenerateDishEnInfoResultItem[];
  batchId?: string;
  error?: string;
};

const SINGLETON_ADMIN_ID = "singleton-admin";
function makeBatchMappingError() {
  return "批量返回与请求项不一致";
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ success: false, error: "未登录或无权限" }, { status: 401 });
  }

  let body: GenerateDishEnInfoBody;
  try {
    body = (await req.json()) as GenerateDishEnInfoBody;
  } catch (error) {
    await logError("ai_execute_invalid_json", error);
    return NextResponse.json<GenerateDishEnInfoResponse>({ success: false, error: "请求体必须是合法 JSON" }, { status: 400 });
  }

  if (!body || body.functionCode !== "generate_dish_en_info") {
    return NextResponse.json<GenerateDishEnInfoResponse>({ success: false, error: "功能不存在" }, { status: 400 });
  }

  const input = Array.isArray(body.input) ? body.input : [body.input];
  if (input.length === 0) {
    return NextResponse.json<GenerateDishEnInfoResponse>({ success: false, error: "input 不能为空" }, { status: 400 });
  }
  if (input.length > 500) {
    return NextResponse.json<GenerateDishEnInfoResponse>({ success: false, error: "单次最多支持 500 条" }, { status: 400 });
  }
  const batchId = String(body.batchId || "").trim() || `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const aiConfig = await prisma.aiUserConfig.findUnique({
    where: { adminUserId: SINGLETON_ADMIN_ID },
  });

  if (!aiConfig || !aiConfig.enabled) {
    return NextResponse.json<GenerateDishEnInfoResponse>({ success: false, error: "AI 未配置或已禁用" }, { status: 400 });
  }

  const systemPrompt = getSystemPromptForGenerateDishEnInfo();
  const userDefaultPrompt = aiConfig.promptGenerateDishEnInfo || "";
  const mergedPrompt = mergePrompts(systemPrompt, userDefaultPrompt);
  const isBatch = Array.isArray(body.input);

  if (isBatch) {
    const startedAt = Date.now();
    const taskLog = await createAiTaskLog({
      adminUserId: SINGLETON_ADMIN_ID,
      functionCode: "generate_dish_en_info",
      requestPayload: {
        requestType: "batch",
        batchId,
        method: "POST",
        endpoint: "/api/admin/ai/execute",
        eventType: "request",
        input,
        prompt: mergedPrompt,
      },
      status: "PENDING",
    });

    try {
      const aiRes = await callAiWithRetryForGenerateDishEnInfoBatch(
        { provider: aiConfig.provider, model: aiConfig.model, apiKey: aiConfig.apiKey },
        mergedPrompt,
        input,
      );
      await updateAiTaskLog(taskLog.id, {
        status: aiRes.ok && aiRes.data ? "SUCCESS" : "FAILED",
        responsePayload: {
          durationMs: Date.now() - startedAt,
          batchId,
          eventType: "response",
          modelRawResponse: aiRes.rawResponse || "",
          result: aiRes.data || null,
        },
        errorMessage: aiRes.error || "",
      });
      if (!aiRes.ok || !aiRes.data) {
        return NextResponse.json<GenerateDishEnInfoResponse>({
          success: false,
          batchId,
          error: aiRes.error || "AI 批量返回错误",
        });
      }

      const expectedIds = new Set(input.map((x) => x.dishId));
      const resultIds = new Set(aiRes.data.map((x) => x.dishId));
      if (expectedIds.size !== resultIds.size || Array.from(expectedIds).some((id) => !resultIds.has(id))) {
        await updateAiTaskLog(taskLog.id, {
          status: "FAILED",
          responsePayload: {
            durationMs: Date.now() - startedAt,
            batchId,
            eventType: "response",
            result: aiRes.data,
          },
          errorMessage: makeBatchMappingError(),
        });
        return NextResponse.json<GenerateDishEnInfoResponse>({
          success: false,
          batchId,
          error: makeBatchMappingError(),
        });
      }

      const writebackResults: GenerateDishEnInfoResultItem[] = [];
      for (const one of aiRes.data) {
        const writeback = await writebackDishAndCategoryEnglishNames({
          dishId: one.dishId,
          nameEn: one.name_en,
          categoryEn: one.category_en,
        });
        writebackResults.push({
          dishId: one.dishId,
          success: true,
          name_en: one.name_en,
          category_en: one.category_en,
          writeback,
        });
      }

      await updateAiTaskLog(taskLog.id, {
        status: "SUCCESS",
        responsePayload: {
          durationMs: Date.now() - startedAt,
          batchId,
          eventType: "writeback",
          results: writebackResults,
        },
        errorMessage: "",
      });

      return NextResponse.json<GenerateDishEnInfoResponse>({
        success: true,
        batchId,
        data: writebackResults,
      });
    } catch (error) {
      await logError("ai_execute_batch_failed", error);
      await updateAiTaskLog(taskLog.id, {
        status: "FAILED",
        responsePayload: { durationMs: Date.now() - startedAt, batchId, eventType: "response" },
        errorMessage: "服务内部错误",
      });
      return NextResponse.json<GenerateDishEnInfoResponse>({
        success: false,
        batchId,
        error: "服务内部错误",
      });
    }
  }

  const results: GenerateDishEnInfoResultItem[] = [];

  for (const item of input) {
    const mergedSinglePrompt = mergePrompts(systemPrompt, userDefaultPrompt, item.promptOverride);
    const startedAt = Date.now();
    const taskLog = await createAiTaskLog({
      adminUserId: SINGLETON_ADMIN_ID,
      functionCode: "generate_dish_en_info",
      requestPayload: {
        requestType: Array.isArray(body.input) ? "batch" : "single",
        batchId,
        method: "POST",
        endpoint: "/api/admin/ai/execute",
        eventType: "request",
        input: { ...item, prompt: mergedSinglePrompt },
      },
      status: "PENDING",
    });

    try {
      const aiRes = await callAiWithRetryForGenerateDishEnInfo(
        { provider: aiConfig.provider, model: aiConfig.model, apiKey: aiConfig.apiKey },
        mergedSinglePrompt,
        item,
      );

      await updateAiTaskLog(taskLog.id, {
        status: aiRes.ok && aiRes.data ? "SUCCESS" : "FAILED",
        responsePayload: {
          durationMs: Date.now() - startedAt,
          batchId,
          eventType: "response",
          modelRawResponse: aiRes.rawResponse || "",
          result: aiRes.data || null,
        },
        errorMessage: aiRes.error || "",
      });

      if (!aiRes.ok || !aiRes.data) {
        results.push({
          dishId: item.dishId,
          success: false,
          writeback: {
            dishEnglishNameUpdated: false,
            categoryEnglishNameUpdated: false,
          },
          error: aiRes.error || "AI 返回格式错误",
        });
        continue;
      }

      const { name_en, category_en } = aiRes.data;
      const writeback = await writebackDishAndCategoryEnglishNames({
        dishId: item.dishId,
        nameEn: name_en,
        categoryEn: category_en,
      });
      await updateAiTaskLog(taskLog.id, {
        status: "SUCCESS",
        responsePayload: {
          durationMs: Date.now() - startedAt,
          batchId,
          eventType: "writeback",
          modelRawResponse: aiRes.rawResponse || "",
          result: aiRes.data || null,
          writeback,
        },
        errorMessage: "",
      });

      results.push({
        dishId: item.dishId,
        success: true,
        name_en,
        category_en,
        writeback,
      });
    } catch (error) {
      await logError("ai_execute_single_item_failed", error);
      await updateAiTaskLog(taskLog.id, {
        status: "FAILED",
        responsePayload: { durationMs: Date.now() - startedAt, batchId, eventType: "response" },
        errorMessage: "服务内部错误",
      });
      results.push({
        dishId: item.dishId,
        success: false,
        writeback: {
          dishEnglishNameUpdated: false,
          categoryEnglishNameUpdated: false,
        },
        error: "服务内部错误",
      });
    }
  }

  const allOk = results.every((r) => r.success);
  return NextResponse.json<GenerateDishEnInfoResponse>({
    success: allOk,
    batchId,
    data: results,
    error: allOk ? undefined : "部分记录处理失败，请查看逐条结果",
  });
}


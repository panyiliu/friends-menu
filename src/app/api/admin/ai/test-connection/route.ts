import { callAiWithRetryForGenerateDishEnInfo, getSystemPromptForGenerateDishEnInfo, mergePrompts } from "@/lib/ai/execute";
import { createAiTaskLog, updateAiTaskLog } from "@/lib/ai/task-log";
import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const SINGLETON_ADMIN_ID = "singleton-admin";

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ success: false, error: "未登录或无权限" }, { status: 401 });
  }

  const aiConfig = await prisma.aiUserConfig.findUnique({
    where: { adminUserId: SINGLETON_ADMIN_ID },
  });
  if (!aiConfig || !aiConfig.enabled) {
    return NextResponse.json({ success: false, error: "AI 未配置或已禁用" }, { status: 400 });
  }

  const startedAt = Date.now();
  const log = await createAiTaskLog({
    adminUserId: SINGLETON_ADMIN_ID,
    functionCode: "test_connection",
    requestPayload: {
      requestType: "testConnection",
      method: "POST",
      endpoint: "/api/admin/ai/test-connection",
      provider: aiConfig.provider,
      model: aiConfig.model,
    },
  });

  const prompt = mergePrompts(
    getSystemPromptForGenerateDishEnInfo(),
    aiConfig.promptGenerateDishEnInfo || "",
    "这是连通性测试请求，请正常返回 JSON。",
  );

  const result = await callAiWithRetryForGenerateDishEnInfo(
    { provider: aiConfig.provider, model: aiConfig.model, apiKey: aiConfig.apiKey },
    prompt,
    { dishId: "test-connection", name_cn: "红烧肉", category_cn: "热菜" },
  );

  const durationMs = Date.now() - startedAt;
  await updateAiTaskLog(log.id, {
    status: result.ok ? "SUCCESS" : "FAILED",
    responsePayload: {
      durationMs,
      modelRawResponse: result.rawResponse || "",
      parsed: result.data || null,
    },
    errorMessage: result.error || "",
  });

  if (!result.ok || !result.data) {
    return NextResponse.json({
      success: false,
      error: result.error || "连通性测试失败",
      durationMs,
    });
  }

  return NextResponse.json({
    success: true,
    durationMs,
    data: result.data,
  });
}


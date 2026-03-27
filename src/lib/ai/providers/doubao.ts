import {
  AiProvider,
  AiProviderConfig,
  GenerateDishEnInfoAiResult,
  GenerateDishEnInfoBatchAiResult,
  GenerateDishEnInfoParams,
} from "./base";

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function extractJsonText(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return "";
}

function parseModelResponse(payload: unknown) {
  const obj = (payload && typeof payload === "object") ? (payload as Record<string, unknown>) : null;
  if (!obj) return "";

  // Ark /responses style
  const output = Array.isArray(obj.output) ? obj.output : [];
  for (const item of output) {
    const content = (item && typeof item === "object" && Array.isArray((item as Record<string, unknown>).content))
      ? ((item as Record<string, unknown>).content as Array<Record<string, unknown>>)
      : [];
    for (const c of content) {
      const text = typeof c?.text === "string" ? c.text : "";
      if (text) return text;
    }
  }

  // Ark /chat/completions style
  const choices = Array.isArray(obj.choices) ? obj.choices : [];
  for (const ch of choices) {
    const message = ch && typeof ch === "object" ? (ch as Record<string, unknown>).message : null;
    if (message && typeof message === "object" && typeof (message as Record<string, unknown>).content === "string") {
      return (message as Record<string, unknown>).content as string;
    }
  }
  return "";
}

export class DoubaoProvider implements AiProvider {
  private async requestModel(config: AiProviderConfig, systemPrompt: string, userPrompt: string) {
    const endpoint = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3/responses";
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userPrompt }],
          },
        ],
      }),
    });
    const rawResponse = await resp.text();
    return { resp, rawResponse };
  }

  async generateDishEnInfo(
    config: AiProviderConfig,
    params: GenerateDishEnInfoParams,
  ): Promise<GenerateDishEnInfoAiResult> {
    const name = params.nameCn?.trim();
    const category = params.categoryCn?.trim();
    if (!name) return { ok: false, error: "缺少中文名称" };
    if (!config.apiKey?.trim()) return { ok: false, error: "AI apiKey 为空" };

    const userPrompt = `中文名称：${name}\n中文分类：${category || ""}\n请输出 JSON。`;

    try {
      const { resp, rawResponse } = await this.requestModel(config, params.prompt, userPrompt);
      if (!resp.ok) {
        return { ok: false, error: `AI 请求失败(${resp.status})`, rawResponse };
      }

      const payload = safeJsonParse(rawResponse);
      const modelText = parseModelResponse(payload);
      const jsonText = extractJsonText(modelText);
      const parsed = safeJsonParse(jsonText) as { name_en?: unknown; category_en?: unknown } | null;

      if (!parsed || typeof parsed.name_en !== "string" || typeof parsed.category_en !== "string") {
        return { ok: false, error: "AI 返回格式错误", rawResponse };
      }

      return {
        ok: true,
        data: {
          name_en: parsed.name_en.trim(),
          category_en: parsed.category_en.trim(),
        },
        rawResponse,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "AI 调用异常",
      };
    }
  }

  async generateDishEnInfoBatch(
    config: AiProviderConfig,
    params: { prompt: string; items: Array<{ dishId: string; nameCn: string; categoryCn: string }> },
  ): Promise<GenerateDishEnInfoBatchAiResult> {
    if (!config.apiKey?.trim()) return { ok: false, error: "AI apiKey 为空" };
    if (!Array.isArray(params.items) || params.items.length === 0) return { ok: false, error: "items 不能为空" };

    const inputList = params.items.map((x) => ({
      dishId: x.dishId,
      name_cn: x.nameCn,
      category_cn: x.categoryCn || "",
    }));
    const userPrompt = [
      "请将下面列表翻译为英文，并严格返回 JSON。",
      "必须完整返回每一项，不允许遗漏，不允许新增。",
      '返回格式必须是数组：[{"dishId":"string","name_en":"string","category_en":"string"}]',
      `输入列表：${JSON.stringify(inputList)}`,
    ].join("\n");

    try {
      const { resp, rawResponse } = await this.requestModel(config, params.prompt, userPrompt);
      if (!resp.ok) {
        return { ok: false, error: `AI 请求失败(${resp.status})`, rawResponse };
      }

      const payload = safeJsonParse(rawResponse);
      const modelText = parseModelResponse(payload);
      const parsedCandidate = safeJsonParse(modelText) ?? safeJsonParse(extractJsonText(modelText));
      const parsedArray = Array.isArray(parsedCandidate)
        ? parsedCandidate
        : (
            parsedCandidate &&
            typeof parsedCandidate === "object" &&
            Array.isArray((parsedCandidate as Record<string, unknown>).items)
          )
            ? ((parsedCandidate as Record<string, unknown>).items as unknown[])
            : null;

      if (!parsedArray) return { ok: false, error: "AI 批量返回格式错误", rawResponse };

      const data: Array<{ dishId: string; name_en: string; category_en: string }> = [];
      for (const row of parsedArray) {
        const item = row as Record<string, unknown>;
        const dishId = typeof item?.dishId === "string" ? item.dishId.trim() : "";
        const name_en = typeof item?.name_en === "string" ? item.name_en.trim() : "";
        const category_en = typeof item?.category_en === "string" ? item.category_en.trim() : "";
        if (!dishId || !name_en) return { ok: false, error: "AI 批量返回字段缺失", rawResponse };
        data.push({ dishId, name_en, category_en });
      }
      return { ok: true, data, rawResponse };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "AI 批量调用异常",
      };
    }
  }
}


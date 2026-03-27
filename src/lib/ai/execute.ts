import { prisma } from "@/lib/prisma";
import { getAiProvider } from "./providers";
import type { GenerateDishEnInfoAiResult, GenerateDishEnInfoBatchAiResult } from "./providers/base";

type GenerateDishEnInfoInputItem = {
  dishId: string;
  name_cn: string;
  category_cn: string;
  promptOverride?: string;
};

export function getSystemPromptForGenerateDishEnInfo() {
  return [
    "你是一个专业的菜单翻译助手，只输出 JSON，不要包含任何解释。",
    '输出格式必须为：{"name_en": "string", "category_en": "string"}',
    "英文菜品名优先短词或短语，避免过长句子，便于移动端显示。",
    "英文分类名保持简洁统一风格。",
  ].join("\n");
}

export function mergePrompts(systemPrompt: string, userDefaultPrompt: string, override?: string) {
  const parts = [systemPrompt];
  if (userDefaultPrompt?.trim()) parts.push(userDefaultPrompt.trim());
  if (override?.trim()) parts.push(override.trim());
  return parts.join("\n\n");
}

export async function callAiWithRetryForGenerateDishEnInfo(
  config: { provider: string; model: string; apiKey: string },
  prompt: string,
  item: GenerateDishEnInfoInputItem,
): Promise<GenerateDishEnInfoAiResult> {
  const provider = getAiProvider(config.provider);
  let last: GenerateDishEnInfoAiResult = { ok: false, error: "未知错误" };

  for (let i = 0; i < 2; i++) {
    const res = await provider.generateDishEnInfo(
      { provider: config.provider, model: config.model, apiKey: config.apiKey },
      { nameCn: item.name_cn, categoryCn: item.category_cn, prompt },
    );
    last = res;
    if (res.ok && res.data) return res;
  }
  return last;
}

export async function callAiWithRetryForGenerateDishEnInfoBatch(
  config: { provider: string; model: string; apiKey: string },
  prompt: string,
  items: GenerateDishEnInfoInputItem[],
): Promise<GenerateDishEnInfoBatchAiResult> {
  const provider = getAiProvider(config.provider);
  let last: GenerateDishEnInfoBatchAiResult = { ok: false, error: "未知错误" };

  for (let i = 0; i < 2; i++) {
    const res = await provider.generateDishEnInfoBatch(
      { provider: config.provider, model: config.model, apiKey: config.apiKey },
      {
        prompt,
        items: items.map((x) => ({ dishId: x.dishId, nameCn: x.name_cn, categoryCn: x.category_cn })),
      },
    );
    last = res;
    if (res.ok && res.data) return res;
  }
  return last;
}

export async function writebackDishAndCategoryEnglishNames(params: {
  dishId: string;
  nameEn?: string;
  categoryEn?: string;
}) {
  const dish = await prisma.dish.findUnique({
    where: { id: params.dishId },
    include: { category: true },
  });
  if (!dish) {
    return { dishEnglishNameUpdated: false, categoryEnglishNameUpdated: false };
  }

  let dishEnglishNameUpdated = false;
  let categoryEnglishNameUpdated = false;

  const updates: Parameters<typeof prisma.dish.update>[0]["data"] = {};
  const nameEn = params.nameEn?.trim();
  const categoryEn = params.categoryEn?.trim();

  if (!dish.englishName && nameEn) {
    updates.englishName = nameEn;
    dishEnglishNameUpdated = true;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.dish.update({
      where: { id: dish.id },
      data: updates,
    });
  }

  if (dish.category && !dish.category.englishName && categoryEn) {
    await prisma.category.update({
      where: { id: dish.categoryId },
      data: { englishName: categoryEn },
    });
    categoryEnglishNameUpdated = true;
  }

  return { dishEnglishNameUpdated, categoryEnglishNameUpdated };
}


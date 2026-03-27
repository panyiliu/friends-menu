export type AiProviderConfig = {
  provider: string;
  model: string;
  apiKey: string;
};

export type GenerateDishEnInfoParams = {
  nameCn: string;
  categoryCn: string;
  prompt: string;
};

export type GenerateDishEnInfoBatchItem = {
  dishId: string;
  nameCn: string;
  categoryCn: string;
};

export type GenerateDishEnInfoAiResult = {
  ok: boolean;
  data?: { name_en: string; category_en: string };
  error?: string;
  rawResponse?: string;
};

export type GenerateDishEnInfoBatchAiResult = {
  ok: boolean;
  data?: Array<{ dishId: string; name_en: string; category_en: string }>;
  error?: string;
  rawResponse?: string;
};

export interface AiProvider {
  generateDishEnInfo(
    config: AiProviderConfig,
    params: GenerateDishEnInfoParams,
  ): Promise<GenerateDishEnInfoAiResult>;
  generateDishEnInfoBatch(
    config: AiProviderConfig,
    params: { prompt: string; items: GenerateDishEnInfoBatchItem[] },
  ): Promise<GenerateDishEnInfoBatchAiResult>;
}


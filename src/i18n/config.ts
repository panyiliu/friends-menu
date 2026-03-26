export const SUPPORTED_LANGS = ["zh", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: Lang = "zh";
export const LANG_STORAGE_KEY = "app-lang";
export const LANG_COOKIE_KEY = "app-lang";


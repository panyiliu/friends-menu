"use client";

import { useI18n } from "@/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const nextLang = lang === "zh" ? "en" : "zh";

  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200/80 bg-white/75 text-stone-700 shadow-sm backdrop-blur-sm transition hover:bg-white ${className}`}
      onClick={() => setLang(nextLang)}
      aria-label={`${t("common.actions.switchLanguage")} (${nextLang === "zh" ? t("common.lang.zh") : t("common.lang.en")})`}
      title={`${t("common.actions.switchLanguage")} (${nextLang === "zh" ? t("common.lang.zh") : t("common.lang.en")})`}
    >
      <span aria-hidden className="text-sm leading-none">🌐</span>
    </button>
  );
}


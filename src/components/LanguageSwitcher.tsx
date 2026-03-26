"use client";

import { useI18n } from "@/i18n";
import { SUPPORTED_LANGS, type Lang } from "@/i18n/config";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-stone-200/80 bg-white/70 px-2 py-1 text-xs text-stone-700 shadow-sm backdrop-blur-sm ${className}`}>
      {(SUPPORTED_LANGS as readonly Lang[]).map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            className={`rounded-full px-2 py-1 transition ${active ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`}
            onClick={() => setLang(l)}
            aria-pressed={active}
          >
            {l === "zh" ? t("common.lang.zh") : t("common.lang.en")}
          </button>
        );
      })}
    </div>
  );
}


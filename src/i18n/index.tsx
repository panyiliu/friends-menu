"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, type Lang, SUPPORTED_LANGS } from "./config";
import { persistClientLang, resolveClientLang } from "./utils";
import zhCommon from "@/locales/zh/common.json";
import zhGuest from "@/locales/zh/guest.json";
import zhAdmin from "@/locales/zh/admin.json";
import zhErrors from "@/locales/zh/errors.json";
import enCommon from "@/locales/en/common.json";
import enGuest from "@/locales/en/guest.json";
import enAdmin from "@/locales/en/admin.json";
import enErrors from "@/locales/en/errors.json";

type DictLeaf = string | number | boolean | null;
export type DictValue = DictLeaf | DictValue[] | { [k: string]: DictValue };
export type Dict = Record<string, DictValue>;

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);
const dictionaries: Record<Lang, Dict> = {
  zh: { ...(zhCommon as Dict), ...(zhGuest as Dict), ...(zhAdmin as Dict), ...(zhErrors as Dict) },
  en: { ...(enCommon as Dict), ...(enGuest as Dict), ...(enAdmin as Dict), ...(enErrors as Dict) },
};

function getByPath(dict: Dict, key: string): unknown {
  const parts = String(key).split(".").filter(Boolean);
  let cur: unknown = dict;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function formatTemplate(input: string, params?: Record<string, string | number>) {
  if (!params) return input;
  return input.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] === undefined ? `{${k}}` : String(params[k])));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [dict, setDict] = useState<Dict>(dictionaries[DEFAULT_LANG]);

  useEffect(() => {
    const resolved = resolveClientLang();
    setLangState(resolved);
  }, []);

  useEffect(() => {
    setDict(dictionaries[lang] || dictionaries[DEFAULT_LANG]);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    const v: Lang = (SUPPORTED_LANGS as readonly string[]).includes(next) ? next : DEFAULT_LANG;
    persistClientLang(v);
    setLangState(v);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const raw = getByPath(dict, key);
      if (typeof raw === "string") return formatTemplate(raw, params);
      const isDev = process.env.NODE_ENV === "development";
      if (isDev) {
        console.warn(`[i18n] missing key: ${key}`);
        return `[Missing: ${key}]`;
      }
      return String(key);
    },
    [dict],
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}


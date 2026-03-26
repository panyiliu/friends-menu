"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, type Lang, SUPPORTED_LANGS } from "./config";
import { persistClientLang, resolveClientLang } from "./utils";

type DictLeaf = string | number | boolean | null;
export type DictValue = DictLeaf | DictValue[] | { [k: string]: DictValue };
export type Dict = Record<string, DictValue>;

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

async function loadModule(lang: Lang, moduleName: string): Promise<Dict> {
  // Keep it explicit so bundler can include JSON.
  if (lang === "zh") {
    if (moduleName === "common") return (await import("@/locales/zh/common.json")).default as Dict;
    if (moduleName === "guest") return (await import("@/locales/zh/guest.json")).default as Dict;
    if (moduleName === "admin") return (await import("@/locales/zh/admin.json")).default as Dict;
    if (moduleName === "errors") return (await import("@/locales/zh/errors.json")).default as Dict;
  }
  if (lang === "en") {
    if (moduleName === "common") return (await import("@/locales/en/common.json")).default as Dict;
    if (moduleName === "guest") return (await import("@/locales/en/guest.json")).default as Dict;
    if (moduleName === "admin") return (await import("@/locales/en/admin.json")).default as Dict;
    if (moduleName === "errors") return (await import("@/locales/en/errors.json")).default as Dict;
  }
  return {};
}

async function loadAll(lang: Lang): Promise<Dict> {
  const [common, guest, admin, errors] = await Promise.all([
    loadModule(lang, "common"),
    loadModule(lang, "guest"),
    loadModule(lang, "admin"),
    loadModule(lang, "errors"),
  ]);
  return { ...common, guest, admin, errors };
}

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
  const [dict, setDict] = useState<Dict>({});

  useEffect(() => {
    const resolved = resolveClientLang();
    setLangState(resolved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await loadAll(lang);
      if (!cancelled) setDict(next);
    })();
    return () => {
      cancelled = true;
    };
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


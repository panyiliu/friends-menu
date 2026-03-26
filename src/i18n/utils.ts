import { DEFAULT_LANG, LANG_COOKIE_KEY, LANG_STORAGE_KEY, SUPPORTED_LANGS, type Lang } from "./config";

export function isLang(x: string): x is Lang {
  return (SUPPORTED_LANGS as readonly string[]).includes(x);
}

export function normalizeNavigatorLang(raw: string | undefined | null): Lang {
  const v = String(raw || "").toLowerCase();
  if (v.startsWith("en")) return "en";
  if (v.startsWith("zh")) return "zh";
  return DEFAULT_LANG;
}

export function getCookieValue(cookie: string, key: string): string {
  const parts = cookie.split(";").map((x) => x.trim());
  for (const p of parts) {
    if (!p) continue;
    const i = p.indexOf("=");
    if (i <= 0) continue;
    const k = decodeURIComponent(p.slice(0, i));
    if (k !== key) continue;
    return decodeURIComponent(p.slice(i + 1));
  }
  return "";
}

export function resolveClientLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const ls = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (ls && isLang(ls)) return ls;
  } catch {}
  try {
    const cv = getCookieValue(document.cookie || "", LANG_COOKIE_KEY);
    if (cv && isLang(cv)) return cv;
  } catch {}
  try {
    return normalizeNavigatorLang(navigator.language);
  } catch {
    return DEFAULT_LANG;
  }
}

export function persistClientLang(lang: Lang) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
  try {
    // 400 days max-age is safe for most browsers.
    document.cookie = `${encodeURIComponent(LANG_COOKIE_KEY)}=${encodeURIComponent(lang)}; Path=/; Max-Age=${60 * 60 * 24 * 400}; SameSite=Lax`;
  } catch {}
}


const STORAGE_KEY = "order_debug_ui";
const LOG_KEY = "order_debug_client_logs";
const MAX_LINES = 300;

export function isDebugUiEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setDebugUiEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
}

export function appendClientDebugLine(text: string) {
  if (typeof window === "undefined") return;
  const prev = window.localStorage.getItem(LOG_KEY) || "";
  const line = `[${new Date().toISOString()}] ${text}`;
  const next = (prev + "\n" + line).split("\n").slice(-MAX_LINES).join("\n");
  window.localStorage.setItem(LOG_KEY, next);
}

export function getClientDebugLogText() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LOG_KEY) || "";
}

export function clearClientDebugLog() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOG_KEY);
}

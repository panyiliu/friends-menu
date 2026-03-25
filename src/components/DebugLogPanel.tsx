"use client";

import { appendClientDebugLine, clearClientDebugLog, getClientDebugLogText, isDebugUiEnabled } from "@/lib/client-debug-log";
import { useCallback, useEffect, useState } from "react";

type Props = {
  /** 已登录时可拉取服务端环状日志 */
  fetchServerLogs?: boolean;
  /** 不传则从 localStorage 读取 */
  enabled?: boolean;
};

export function DebugLogPanel({ fetchServerLogs, enabled }: Props) {
  const on = enabled ?? isDebugUiEnabled();
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const [serverLines, setServerLines] = useState<string[]>([]);
  const refresh = useCallback(async () => {
    setText(getClientDebugLogText());
    if (fetchServerLogs) {
      try {
        const res = await fetch("/api/admin/debug-logs?limit=200");
        const data = (await res.json()) as { ok?: boolean; lines?: string[] };
        if (data.ok && Array.isArray(data.lines)) setServerLines(data.lines);
        else appendClientDebugLine(`debug-logs: ${res.status} ${JSON.stringify(data)}`);
      } catch (e) {
        appendClientDebugLine(`debug-logs fetch error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }, [fetchServerLogs]);

  useEffect(() => {
    if (!on) return;
    const t0 = window.setTimeout(() => void refresh(), 0);
    if (!fetchServerLogs) return () => clearTimeout(t0);
    const t = setInterval(() => void refresh(), 8000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [on, refresh, fetchServerLogs]);

  useEffect(() => {
    if (!on) return;
    const orig = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || "GET";
      appendClientDebugLine(`${method} ${url}`);
      try {
        const res = await orig(input, init);
        appendClientDebugLine(`→ ${res.status} ${url}`);
        return res;
      } catch (e) {
        appendClientDebugLine(`→ error ${e instanceof Error ? e.message : String(e)} ${url}`);
        throw e;
      }
    };
    return () => {
      window.fetch = orig;
    };
  }, [on]);

  if (!on) return null;

  return (
    <div className="fixed bottom-0 right-0 z-[100] max-h-[50vh] w-full max-w-lg border border-amber-700/50 bg-stone-950/95 text-left text-xs text-amber-100 shadow-lg md:bottom-4 md:right-4 md:rounded-md">
      <div className="flex items-center justify-between gap-2 border-b border-amber-800/50 px-2 py-1">
        <span className="font-medium text-amber-200">调试日志</span>
        <div className="flex gap-1">
          <button type="button" className="rounded bg-amber-900/80 px-2 py-0.5 text-amber-100" onClick={() => void refresh()}>
            刷新
          </button>
          <button type="button" className="rounded bg-amber-900/80 px-2 py-0.5 text-amber-100" onClick={() => clearClientDebugLog()}>
            清空客户端
          </button>
          <button type="button" className="rounded bg-stone-800 px-2 py-0.5" onClick={() => setOpen((o) => !o)}>
            {open ? "收起" : "展开"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="max-h-[40vh] overflow-auto p-2 font-mono leading-relaxed">
          {fetchServerLogs && serverLines.length > 0 ? (
            <>
              <div className="mb-2 text-amber-300/90">— 服务端（近期）—</div>
              <pre className="mb-3 whitespace-pre-wrap break-all text-[10px] text-stone-300">{serverLines.join("\n")}</pre>
            </>
          ) : null}
          <div className="mb-1 text-amber-300/90">— 客户端 —</div>
          <pre className="whitespace-pre-wrap break-all text-[10px] text-stone-400">{text || "（无）"}</pre>
        </div>
      ) : null}
    </div>
  );
}

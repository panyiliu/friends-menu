"use client";

import { useCallback, useEffect, useState } from "react";

const MAX_LOG = 50;

export default function AdminLoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [logOpen, setLogOpen] = useState(true);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [sessionRechecking, setSessionRechecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/session", { credentials: "include", cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          window.location.replace("/admin");
          return;
        }
      } catch {
        /* 忽略，留在登录页 */
      } finally {
        if (!cancelled) setSessionRechecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const log = useCallback((line: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogLines((prev) => [...prev.slice(-(MAX_LOG - 1)), `[${ts}] ${line}`]);
  }, []);

  async function submit() {
    setMessage("");
    setBusy(true);
    log("点击登录，准备请求 POST /api/admin/login");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const text = await res.text();
      log(`POST /api/admin/login → HTTP ${res.status}，响应长度 ${text.length}`);

      let data: { ok?: boolean; message?: string } = {};
      try {
        data = JSON.parse(text) as { ok?: boolean; message?: string };
      } catch {
        log(`响应非 JSON，前 120 字：${text.slice(0, 120).replace(/\s+/g, " ")}`);
        setMessage("登录接口返回异常（非 JSON），请查看终端/服务端日志");
        return;
      }

      if (!data.ok) {
        setMessage(data.message || "登录失败");
        log(`接口返回失败：${data.message || "无 message"}`);
        return;
      }

      log("接口返回 ok=true，正在校验会话 GET /api/admin/session（需携带 Cookie）");
      const sess = await fetch("/api/admin/session", { credentials: "include", cache: "no-store" });
      const sessText = await sess.text();
      log(`GET /api/admin/session → HTTP ${sess.status}`);

      if (sess.status !== 200) {
        log(`会话校验失败，响应：${sessText.slice(0, 200).replace(/\s+/g, " ")}`);
        setMessage(
          "密码校验已通过，但浏览器未带上有效会话。请检查：① 使用 HTTP 访问时把环境变量 ADMIN_SESSION_SECURE 设为 false；② Docker/生产需在反代上传 X-Forwarded-Proto；③ 勿禁用第三方 Cookie（本站为同站，一般无需）。详情见 docs/product-auth.md。",
        );
        return;
      }

      log("会话有效，使用整页跳转进入 /admin（避免客户端路由未带上 Cookie）");
      window.location.assign("/admin");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`请求异常：${msg}`);
      setMessage(`网络或浏览器异常：${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto mt-16 max-w-lg rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-zinc-900">后台登录</h1>
      {sessionRechecking ? <p className="mt-2 text-xs text-zinc-500">正在检测是否已登录…</p> : null}
      <input
        className="mt-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        type="password"
        autoComplete="current-password"
        placeholder="密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="button"
        className="mt-4 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy ? "登录中…" : "登录"}
      </button>
      <p className="mt-2 text-xs text-zinc-500">默认：admin / admin123456</p>
      {message ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{message}</p>
      ) : null}

      <div className="mt-6 border-t border-zinc-200 pt-3">
        <button type="button" className="flex w-full items-center justify-between text-left text-sm font-medium text-zinc-700" onClick={() => setLogOpen((v) => !v)}>
          <span>登录诊断日志（每步自动记录）</span>
          <span className="text-zinc-400">{logOpen ? "收起" : "展开"}</span>
        </button>
        {logOpen ? (
          <div className="mt-2 max-h-56 overflow-auto rounded-md border border-zinc-200 bg-zinc-950 p-2 font-mono text-[11px] leading-relaxed text-emerald-200/90">
            {logLines.length === 0 ? <span className="text-zinc-500">提交登录后将在此显示步骤与 HTTP 状态</span> : null}
            {logLines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-[11px] text-zinc-400">设置里另有「调试日志面板」开关，可记录全站 fetch；此处仅针对登录流程。</p>
      </div>
    </main>
  );
}

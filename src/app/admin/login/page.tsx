"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function submit() {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const text = await res.text();
    let data: { ok?: boolean; message?: string } = {};
    let jsonParseOk = true;
    try {
      data = JSON.parse(text);
    } catch {
      jsonParseOk = false;
      data = { ok: false, message: "登录接口返回异常，请查看服务端日志" };
    }
    // #region agent log
    fetch("http://127.0.0.1:7917/ingest/05fed06c-f8fa-4faf-9eb8-fc18d081b49e", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c4f207" },
      body: JSON.stringify({
        sessionId: "c4f207",
        runId: "login-flow",
        hypothesisId: "H1",
        location: "admin/login/page.tsx:submit",
        message: "login_fetch_result",
        data: { httpStatus: res.status, ok: data.ok === true, bodyLen: text.length, jsonParseOk },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (data.ok) router.push("/admin");
    else setMessage(data.message || "登录失败");
  }

  return (
    <main className="mx-auto mt-24 max-w-sm rounded border p-6">
      <h1 className="text-xl font-bold">后台登录</h1>
      <input className="mt-4 w-full rounded border px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input
        className="mt-3 w-full rounded border px-3 py-2"
        type="password"
        placeholder="密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="mt-4 w-full rounded bg-black py-2 text-white" onClick={submit}>
        登录
      </button>
      <p className="mt-2 text-xs text-gray-500">默认：admin / admin123456</p>
      {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
    </main>
  );
}

import { ensureAdmin } from "@/lib/api-auth";
import { appendFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(req: NextRequest) {
  const hasCookie = Boolean(req.cookies.get("admin_session")?.value);
  const sessionOk = ensureAdmin(req);
  // #region agent log
  const dbg = {
    sessionId: "c4f207",
    runId: "login-flow",
    hypothesisId: "H2",
    location: "api/admin/session/route.ts:GET",
    message: "session_check",
    data: { hasCookie, sessionOk },
    timestamp: Date.now(),
  };
  await fetch("http://127.0.0.1:7917/ingest/05fed06c-f8fa-4faf-9eb8-fc18d081b49e", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c4f207" },
    body: JSON.stringify(dbg),
  }).catch(() => {});
  await appendFile(path.join(process.cwd(), "debug-c4f207.log"), JSON.stringify(dbg) + "\n").catch(() => {});
  // #endregion
  if (!sessionOk) {
    return NextResponse.json({ ok: false, message: "未登录或会话已过期" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

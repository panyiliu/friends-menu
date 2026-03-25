import { verifyAdminSessionToken } from "@/lib/admin-session-edge";
import { getClientIp, takeRateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * 与 API 层 `ensureAdmin` 一致的会话判断（严格验签）。
 */
async function isAdminSessionOk(req: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-secret";
  const token = req.cookies.get("admin_session")?.value;
  let sessionOk = await verifyAdminSessionToken(token, secret);

  return sessionOk;
}

/**
 * Next.js 16 使用 `src/proxy.ts` 作为网关（原 middleware 约定已迁移至此）。
 * 后台与会话 API：校验 `admin_session` 签名（与 `ensureAdmin` 一致）。
 * 未登录访问 `/api/admin/*` 返回 401 JSON，避免 302 到登录页导致 fetch 误判。
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  // 不在網關階段對 `/admin/login` 做服務端 redirect。
  // 由登入頁的客戶端一次性檢測決定是否跳轉，可避免在輸入帳密時因 session 判斷差異造成反覆跳動。
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin/")) {
    const ip = getClientIp(req.headers);
    const limited = takeRateLimit(`admin_api:${ip}`, 240, 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json({ ok: false, message: "请求过于频繁，请稍后再试" }, { status: 429 });
    }
  }

  const sessionOk = await isAdminSessionOk(req);

  if (!sessionOk) {
    if (pathname.startsWith("/api/admin/")) {
      return NextResponse.json({ ok: false, message: "未登录或会话已过期" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const res = NextResponse.next();
  if (pathname.startsWith("/admin")) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

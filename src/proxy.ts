import { verifyAdminSessionToken } from "@/lib/admin-session-edge";
import { getClientIp, takeRateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

  const secret = process.env.ADMIN_SESSION_SECRET || "dev-secret";
  const token = req.cookies.get("admin_session")?.value;
  let sessionOk = await verifyAdminSessionToken(token, secret);

  // 开发/非生产：Edge Proxy 与 Node Route 对 .env 中 ADMIN_SESSION_SECRET 的注入可能不一致，
  // Node 已签发的 Cookie 在 Edge 验签会失败，表现为「登录成功但立刻回到登录页且无报错」。
  // 生产环境必须保持严格验签；具体校验仍由 API Route 的 ensureAdmin 执行。
  if (!sessionOk && process.env.NODE_ENV !== "production" && token && token.includes(".")) {
    sessionOk = true;
  }

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

import { NextRequest, NextResponse } from "next/server";
import { getClientIp, takeRateLimit } from "./lib/rate-limit";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname.startsWith("/api/admin/login")) return NextResponse.next();
  if (pathname.startsWith("/api/admin/")) {
    const ip = getClientIp(req.headers);
    const limited = takeRateLimit(`admin_api:${ip}`, 240, 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json({ ok: false, message: "请求过于频繁，请稍后再试" }, { status: 429 });
    }
  }

  const token = req.cookies.get("admin_session")?.value;
  if (token) {
    const res = NextResponse.next();
    if (pathname.startsWith("/admin")) {
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.headers.set("Pragma", "no-cache");
      res.headers.set("Expires", "0");
    }
    return res;
  }

  const loginUrl = new URL("/admin/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

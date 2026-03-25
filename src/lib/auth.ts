import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { assertProdSecurityEnv } from "./env";

const COOKIE_NAME = "admin_session";
assertProdSecurityEnv();

function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-secret";
  return createHmac("sha256", secret).update(value).digest("hex");
}

function adminSessionCookieOptions(secureCookie: boolean) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: secureCookie,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

/** 构建会话 Cookie 值（与 verify 逻辑一致） */
export function buildAdminSessionCookieValue(username: string) {
  const payload = `${username}|${Date.now()}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

/**
 * 在 Route Handler 中必须把 Cookie 写到同一 `NextResponse` 上，否则部分环境下
 * `cookies().set()` 不会随 JSON 响应下发，导致登录成功但 `/api/admin/session` 仍 401。
 */
export function applyAdminSessionCookie(response: NextResponse, username: string, secureCookie: boolean) {
  // NOTE: Secure cookie 需要依照「當前請求是否為 HTTPS」決定，
  // 這樣才能同時支援 HTTP/IP 直連與 HTTPS/域名存取。
  response.cookies.set(COOKIE_NAME, buildAdminSessionCookieValue(username), adminSessionCookieOptions(secureCookie));
}

export async function setAdminSession(username: string, secureCookie = false) {
  // 未提供 request 協定資訊時，預設走非 Secure 以確保 HTTP/IP 直連可用。
  (await cookies()).set(COOKIE_NAME, buildAdminSessionCookieValue(username), adminSessionCookieOptions(secureCookie));
}

export async function clearAdminSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isAdminAuthed() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !token.includes(".")) return false;
  const i = token.indexOf(".");
  const payload = token.slice(0, i);
  const signature = token.slice(i + 1);
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return true;
}

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { assertProdSecurityEnv } from "./env";

const COOKIE_NAME = "admin_session";
assertProdSecurityEnv();

function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-secret";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function setAdminSession(username: string) {
  const payload = `${username}|${Date.now()}`;
  const signature = sign(payload);
  const secureCookie = process.env.ADMIN_SESSION_SECURE === "true";
  (await cookies()).set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isAdminAuthed() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !token.includes(".")) return false;
  const [payload, signature] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return true;
}

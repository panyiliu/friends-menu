import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-secret";
  return createHmac("sha256", secret).update(value).digest("hex");
}

function splitSessionToken(token: string) {
  const i = token.indexOf(".");
  if (i <= 0) return null;
  return { payload: token.slice(0, i), signature: token.slice(i + 1) };
}

export function ensureAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token || !token.includes(".")) return false;
  const parts = splitSessionToken(token);
  if (!parts) return false;
  const { payload, signature } = parts;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

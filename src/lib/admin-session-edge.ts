/**
 * Edge / Web Crypto 会话校验，与 `api-auth.ts` 中 HMAC-SHA256(hex) 逻辑一致。
 * Middleware 运行在 Edge，不能使用 `node:crypto`。
 */

const COOKIE = "admin_session";

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyAdminSessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  const dot = token.indexOf(".");
  const payload = token.slice(0, dot);
  const signatureHex = token.slice(dot + 1);
  if (!payload || !signatureHex) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expectedHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqualHex(expectedHex, signatureHex);
}

export function getAdminSessionCookie(req: { cookies: { get: (n: string) => { value: string } | undefined } }) {
  return req.cookies.get(COOKIE)?.value;
}

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function takeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const prev = buckets.get(key);
  if (!prev || prev.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs };
  }

  if (prev.count >= limit) {
    return { ok: false, remaining: 0, resetAt: prev.resetAt };
  }
  prev.count += 1;
  buckets.set(key, prev);
  return { ok: true, remaining: Math.max(0, limit - prev.count), resetAt: prev.resetAt };
}

export function getClientIp(headers: Headers) {
  const xff = headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip") || "";
  return first || realIp || "unknown";
}

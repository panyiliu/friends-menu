/* eslint-disable no-console */

const DEFAULT_PORT = process.env.PORT ? String(process.env.PORT) : "3000";
const baseUrl = process.env.SMOKE_BASE_URL || `http://localhost:${DEFAULT_PORT}`;

const adminUsername = process.env.ADMIN_SMOKE_USERNAME || "admin";
const adminPassword = process.env.ADMIN_SMOKE_PASSWORD || "admin123456";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url, options, timeoutMs = 10000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function extractAdminSessionCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  // Expected: admin_session=PAYLOAD.SIGNATURE; Path=/; ...
  const m = String(setCookieHeader).match(/admin_session=([^;]+)/);
  return m ? m[1] : null;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return { ok: false };
  }
}

async function login() {
  const res = await fetchWithTimeout(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  }, Number(process.env.SMOKE_FETCH_TIMEOUT_MS || 10000));
  const d = await safeJson(res);
  if (!res.ok || !d.ok) {
    throw new Error(`login failed: status=${res.status} body=${JSON.stringify(d)}`);
  }

  // Undici's fetch only exposes one set-cookie header string in most cases.
  const setCookie = res.headers.get("set-cookie");
  const token = extractAdminSessionCookie(setCookie);
  if (!token) throw new Error(`login succeeded but admin_session cookie missing (set-cookie=${setCookie || "n/a"})`);

  return `admin_session=${token}`;
}

async function checkJsonOk(path, cookie) {
  const res = await fetchWithTimeout(`${baseUrl}${path}`, {
    method: "GET",
    headers: cookie ? { cookie } : undefined,
  }, Number(process.env.SMOKE_FETCH_TIMEOUT_MS || 10000));
  const d = await safeJson(res);
  return { res, d };
}

async function runWithRetries(fn, { retries = 10, intervalMs = 1000 } = {}) {
  let lastErr = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[stage1-smoke-test] retry ${i + 1}/${retries} failed: ${msg}`);
      await sleep(intervalMs);
    }
  }
  throw lastErr || new Error("unknown error");
}

async function main() {
  console.log(`[stage1-smoke-test] baseUrl=${baseUrl}`);

  const cookie = await runWithRetries(async () => {
    return await login();
  }, { retries: 12, intervalMs: 1000 });

  const checks = [
    { name: "health", path: "/api/health", requireOk: true },
    { name: "admin/invite", path: "/api/admin/invite", requireOk: true },
    { name: "admin/settings", path: "/api/admin/settings", requireOk: true },
  ];

  const results = [];
  for (const c of checks) {
    const { res, d } = await checkJsonOk(c.path, cookie);
    const pass = res.status === 200 && (!c.requireOk || Boolean(d?.ok));
    results.push({ ...c, status: res.status, body: d, pass });
    if (!pass) {
      console.error(`[stage1-smoke-test] FAIL: ${c.name} status=${res.status} body=${JSON.stringify(d)}`);
      process.exit(1);
    }
  }

  console.log("[stage1-smoke-test] OK: all checks passed.");
  console.log(
    results.map((r) => `${r.name}=${r.status}`).join(", "),
  );
}

main().catch((e) => {
  console.error("[stage1-smoke-test] failed:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});


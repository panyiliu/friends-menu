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

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return { ok: false };
  }
}

function extractAdminSessionCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const m = String(setCookieHeader).match(/admin_session=([^;]+)/);
  return m ? m[1] : null;
}

async function login() {
  const res = await fetchWithTimeout(
    `${baseUrl}/api/admin/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: adminUsername, password: adminPassword }),
    },
    Number(process.env.SMOKE_FETCH_TIMEOUT_MS || 10000),
  );

  const d = await safeJson(res);
  if (!res.ok || !d.ok) {
    throw new Error(`login failed: status=${res.status} body=${JSON.stringify(d)}`);
  }

  const setCookie = res.headers.get("set-cookie");
  const token = extractAdminSessionCookie(setCookie);
  if (!token) throw new Error(`admin_session cookie missing (set-cookie=${setCookie || "n/a"})`);

  return `admin_session=${token}`;
}

async function getJson(path, cookie) {
  const res = await fetchWithTimeout(
    `${baseUrl}${path}`,
    { method: "GET", headers: cookie ? { cookie } : undefined },
    Number(process.env.SMOKE_FETCH_TIMEOUT_MS || 10000),
  );
  const d = await safeJson(res);
  return { res, d };
}

async function putJson(path, cookie, body) {
  const res = await fetchWithTimeout(
    `${baseUrl}${path}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    },
    Number(process.env.SMOKE_FETCH_TIMEOUT_MS || 10000),
  );
  const d = await safeJson(res);
  return { res, d };
}

async function main() {
  console.log(`[stage2-verify] baseUrl=${baseUrl}`);

  const cookie = await login();

  // Pre-check: invite + settings should read successfully.
  for (const p of ["/api/admin/invite", "/api/admin/settings"]) {
    const { res, d } = await getJson(p, cookie);
    if (res.status !== 200 || !d?.ok) {
      throw new Error(`pre-check failed: ${p} status=${res.status} body=${JSON.stringify(d)}`);
    }
  }

  // Light write test: toggle debugUiEnabled and revert.
  const settingsBeforeRes = await getJson("/api/admin/settings", cookie);
  if (settingsBeforeRes.res.status !== 200 || !settingsBeforeRes.d?.ok) {
    throw new Error(`failed to load settings: ${JSON.stringify(settingsBeforeRes.d)}`);
  }

  const before = settingsBeforeRes.d.setting || {};
  const original = Boolean(before.debugUiEnabled);
  const toggled = !original;

  const payload = {
    debugUiEnabled: toggled,
    adminTitle: before.adminTitle || "点餐系统",
    guestTitle: before.guestTitle || "朋友·聚",
    guestSubtitle: before.guestSubtitle || "欢聚时刻 · 臻选风味",
    guestBannerUrl: before.guestBannerUrl || "",
    welcomeAlwaysShow: Boolean(before.welcomeAlwaysShow),
    refreshIntervalSec: Number(before.refreshIntervalSec || 8),
    emailEnabled: Boolean(before.emailEnabled),
    emailSender: before.emailSender ?? null,
    emailPassword: before.emailPassword ?? null,
    emailReceiver: before.emailReceiver ?? null,
    smtpServer: before.smtpServer ?? "smtp.qq.com",
    smtpPort: Number(before.smtpPort || 587),
  };

  const putRes1 = await putJson("/api/admin/settings", cookie, payload);
  if (putRes1.res.status !== 200 || !putRes1.d?.ok) {
    throw new Error(`PUT settings failed: status=${putRes1.res.status} body=${JSON.stringify(putRes1.d)}`);
  }

  // Verify toggled.
  const afterToggleRes = await getJson("/api/admin/settings", cookie);
  const debugAfterToggle = Boolean(afterToggleRes.d?.setting?.debugUiEnabled);
  if (!afterToggleRes.d?.ok || debugAfterToggle !== toggled) {
    throw new Error(
      `settings toggle verification failed: ok=${afterToggleRes.d?.ok} debug=${debugAfterToggle} expected=${toggled}`,
    );
  }

  // Revert.
  payload.debugUiEnabled = original;
  const putRes2 = await putJson("/api/admin/settings", cookie, payload);
  if (putRes2.res.status !== 200 || !putRes2.d?.ok) {
    throw new Error(`revert PUT settings failed: status=${putRes2.res.status} body=${JSON.stringify(putRes2.d)}`);
  }

  const afterRevertRes = await getJson("/api/admin/settings", cookie);
  const debugAfterRevert = Boolean(afterRevertRes.d?.setting?.debugUiEnabled);
  if (!afterRevertRes.d?.ok || debugAfterRevert !== original) {
    throw new Error(
      `settings revert verification failed: ok=${afterRevertRes.d?.ok} debug=${debugAfterRevert} expected=${original}`,
    );
  }

  // Post-check: invite/settings should still work.
  for (const p of ["/api/admin/invite", "/api/admin/settings"]) {
    const { res, d } = await getJson(p, cookie);
    if (res.status !== 200 || !d?.ok) {
      throw new Error(`post-check failed: ${p} status=${res.status} body=${JSON.stringify(d)}`);
    }
  }

  console.log("[stage2-verify] OK: settings write/read path verified.");
}

main().catch((e) => {
  console.error("[stage2-verify] failed:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});


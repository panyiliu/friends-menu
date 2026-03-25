let checked = false;

function invalid(msg: string) {
  throw new Error(`[env] ${msg}`);
}

export function assertProdSecurityEnv() {
  if (checked) return;
  checked = true;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (!secret || secret === "dev-secret" || secret.length < 24) {
    invalid("ADMIN_SESSION_SECRET 缺失或过短（生产环境要求 >=24 且不能是默认值）");
  }

  const db = process.env.DATABASE_URL || "";
  if (!db) invalid("DATABASE_URL 缺失");
}

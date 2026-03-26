type Level = "INFO" | "WARN" | "ERROR";

const RING_MAX = 400;
const ring: string[] = [];

function nowIso() {
  return new Date().toISOString();
}

function asText(input: unknown) {
  if (input instanceof Error) return `${input.name}: ${input.message}\n${input.stack || ""}`;
  if (typeof input === "string") return input;
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function pushRing(line: string) {
  ring.push(line);
  while (ring.length > RING_MAX) ring.shift();
}

async function writeLog(level: Level, message: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    time: nowIso(),
    level,
    message,
    ...(meta || {}),
  });
  pushRing(line);
  // Production规范：日志必须输出到 stdout/stderr，便于容器运行时采集。
  try {
    if (level === "ERROR") console.error(line);
    else console.log(line);
  } catch {
    // Never block request flow due to logging failure.
  }
}

/** 供 `/api/admin/debug-logs` 拉取近期结构化日志（内存环，进程重启后清空） */
export function getRecentLogLines(limit = 200) {
  const n = Math.min(Math.max(limit, 1), RING_MAX);
  return ring.slice(-n);
}

export async function logInfo(message: string, meta?: Record<string, unknown>) {
  await writeLog("INFO", message, meta);
}

export async function logWarn(message: string, meta?: Record<string, unknown>) {
  await writeLog("WARN", message, meta);
}

export async function logError(message: string, error?: unknown, meta?: Record<string, unknown>) {
  await writeLog("ERROR", message, { ...(meta || {}), error: asText(error) });
}

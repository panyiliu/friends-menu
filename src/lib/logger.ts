import { appendFile, mkdir } from "fs/promises";
import path from "path";

type Level = "INFO" | "WARN" | "ERROR";

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

async function writeLog(level: Level, message: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    time: nowIso(),
    level,
    message,
    ...(meta || {}),
  });
  try {
    const logDir = path.join(process.cwd(), "logs");
    await mkdir(logDir, { recursive: true });
    await appendFile(path.join(logDir, "app.log"), `${line}\n`, "utf8");
  } catch {
    // Never block request flow due to logging failure.
  }
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

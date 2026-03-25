import { NextResponse } from "next/server";
import { execSync } from "node:child_process";

export const runtime = "nodejs";

let gitSha = process.env.GIT_SHA || "unknown";
try {
  // Local/dev can often have .git; container images likely won't.
  const sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
  if (sha) gitSha = sha;
} catch {
  // ignore
}

const buildTime = process.env.BUILD_TIME || new Date().toISOString();

export async function GET() {
  return NextResponse.json({
    ok: true,
    gitSha,
    buildTime,
  });
}


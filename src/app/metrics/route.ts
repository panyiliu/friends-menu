import { NextResponse } from "next/server";

export const runtime = "nodejs";

const startMs = Date.now();

function escapeLabelValue(v: string) {
  // Prometheus label values are double-quoted strings; escape backslash and quotes.
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function GET() {
  const gitSha = String(process.env.GIT_SHA || "unknown");
  const buildTime = String(process.env.BUILD_TIME || "");
  const uptimeSeconds = Math.floor((Date.now() - startMs) / 1000);

  const lines = [
    "# HELP app_uptime_seconds Uptime of the service process in seconds.",
    "# TYPE app_uptime_seconds gauge",
    `app_uptime_seconds ${uptimeSeconds}`,
    "# HELP app_build_info Build information as a constant 1 value.",
    "# TYPE app_build_info gauge",
    `app_build_info{gitSha="${escapeLabelValue(gitSha)}",buildTime="${escapeLabelValue(buildTime)}"} 1`,
  ];

  return new NextResponse(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    },
  });
}


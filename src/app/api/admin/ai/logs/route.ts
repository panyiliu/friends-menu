import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const SINGLETON_ADMIN_ID = "singleton-admin";

function parseJsonField(raw: string) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ success: false, error: "未登录或无权限" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 100)));
  const batchId = String(url.searchParams.get("batchId") || "").trim();

  const logs = await prisma.aiTaskLog.findMany({
    where: { adminUserId: SINGLETON_ADMIN_ID },
    orderBy: { createdAt: "desc" },
    take: Math.max(limit, batchId ? 300 : limit),
  });
  const filtered = batchId
    ? logs.filter((x) => x.requestPayload.includes(`"batchId":"${batchId}"`) || x.responsePayload.includes(`"batchId":"${batchId}"`))
    : logs;

  return NextResponse.json({
    success: true,
    data: filtered.slice(0, limit).map((x) => ({
      id: x.id,
      functionCode: x.functionCode,
      status: x.status,
      errorMessage: x.errorMessage,
      createdAt: x.createdAt,
      requestPayload: parseJsonField(x.requestPayload),
      responsePayload: parseJsonField(x.responsePayload),
    })),
  });
}

export async function DELETE(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ success: false, error: "未登录或无权限" }, { status: 401 });
  }

  const result = await prisma.aiTaskLog.deleteMany({
    where: { adminUserId: SINGLETON_ADMIN_ID },
  });

  return NextResponse.json({ success: true, deleted: result.count });
}


import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      status: "healthy",
      time: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "health check failed";
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        message: msg,
        time: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

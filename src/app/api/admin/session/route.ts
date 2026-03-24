import { ensureAdmin } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ ok: false, message: "未登录或会话已过期" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

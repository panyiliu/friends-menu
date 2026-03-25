import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findFirst();
    return NextResponse.json({ ok: true, debugUiEnabled: Boolean(setting?.debugUiEnabled) });
  } catch {
    return NextResponse.json({ ok: true, debugUiEnabled: false });
  }
}

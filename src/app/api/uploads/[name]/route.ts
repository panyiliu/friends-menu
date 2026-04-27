import { NextRequest, NextResponse } from "next/server";

function badName(name: string) {
  return !name || name.includes("/") || name.includes("\\") || name.includes("..");
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(String(rawName || ""));
  if (badName(name)) {
    return NextResponse.json({ ok: false, message: "文件名非法" }, { status: 400 });
  }
  const redirectUrl = new URL(`/uploads/${encodeURIComponent(name)}`, "http://localhost");
  return NextResponse.redirect(redirectUrl.pathname, 308);
}

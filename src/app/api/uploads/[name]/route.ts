import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const mimeByExt: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
};

function badName(name: string) {
  return !name || name.includes("/") || name.includes("\\") || name.includes("..");
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name: rawName } = await params;
    const name = decodeURIComponent(String(rawName || ""));
    if (badName(name)) {
      return NextResponse.json({ ok: false, message: "文件名非法" }, { status: 400 });
    }
    const filePath = path.join(process.cwd(), "public", "uploads", name);
    await fs.access(filePath);

    const ext = path.extname(name).toLowerCase();
    const contentType = mimeByExt[ext] || "application/octet-stream";
    const fileBuf = await fs.readFile(filePath);
    return new NextResponse(fileBuf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "图片不存在" }, { status: 404 });
  }
}

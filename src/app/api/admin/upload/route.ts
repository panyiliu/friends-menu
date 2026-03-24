import { ensureAdmin } from "@/lib/api-auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { imageSize } from "image-size";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 10);

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "未上传文件" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, message: "仅支持图片" }, { status: 400 });
  }
  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ ok: false, message: "图片不能超过3MB" }, { status: 400 });
  }
  const ext = file.name.split(".").pop() || "jpg";
  const name = `${Date.now()}-${nanoid()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const dim = imageSize(buffer);
  if (!dim.width || !dim.height || dim.width < 300 || dim.height < 300) {
    return NextResponse.json({ ok: false, message: "图片尺寸过小，最少300x300" }, { status: 400 });
  }
  await writeFile(path.join(uploadDir, name), buffer);
  return NextResponse.json({ ok: true, url: `/uploads/${name}` });
}

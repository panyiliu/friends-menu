import { ensureAdmin } from "@/lib/api-auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { imageSize } from "image-size";
import { buildVariantUrl } from "@/lib/image-variants";

const DERIVATIVE_SIZES = {
  thumb: 160,
  small: 480,
  medium: 960,
  large: 1440,
} as const;

function sanitizeBaseName(name: string) {
  return String(name || "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60) || "image";
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false, message: "未登录或会话已过期" }, { status: 401 });
  try {
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

    const extRaw = path.extname(file.name || "").replace(".", "").toLowerCase();
    const ext = extRaw || "jpg";
    const base = sanitizeBaseName(file.name || "image");
    const name = `${base}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    let dim: ReturnType<typeof imageSize> | null = null;
    try {
      dim = imageSize(buffer);
    } catch {
      return NextResponse.json({ ok: false, message: "图片格式无法识别，请换 JPG/PNG/WebP" }, { status: 400 });
    }

    if (!dim.width || !dim.height || dim.width < 300 || dim.height < 300) {
      return NextResponse.json({ ok: false, message: "图片尺寸过小，最少300x300" }, { status: 400 });
    }

    await writeFile(path.join(uploadDir, name), buffer, { flush: true });
    const staticUrl = `/uploads/${encodeURIComponent(name)}`;

    // Generate optimized derivative files for list/detail contexts.
    try {
      const sharpModule = await import("sharp");
      const sharp = sharpModule.default;
      const baseImage = sharp(buffer, { failOn: "none" }).rotate();
      const jobs: Promise<unknown>[] = [];
      for (const [sizeName, width] of Object.entries(DERIVATIVE_SIZES) as Array<[keyof typeof DERIVATIVE_SIZES, number]>) {
        const webpUrl = buildVariantUrl(staticUrl, sizeName, "webp");
        const avifUrl = buildVariantUrl(staticUrl, sizeName, "avif");
        jobs.push(
          baseImage
            .clone()
            .resize({ width, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 82, effort: 4 })
            .toFile(path.join(process.cwd(), "public", decodeURIComponent(webpUrl.slice(1)))),
        );
        jobs.push(
          baseImage
            .clone()
            .resize({ width, fit: "inside", withoutEnlargement: true })
            .avif({ quality: 52, effort: 4 })
            .toFile(path.join(process.cwd(), "public", decodeURIComponent(avifUrl.slice(1)))),
        );
      }
      await Promise.allSettled(jobs);
    } catch {
      // Do not block upload flow if derivative generation fails.
    }

    return NextResponse.json({
      ok: true,
      url: staticUrl,
      variants: {
        thumb: { webp: buildVariantUrl(staticUrl, "thumb", "webp"), avif: buildVariantUrl(staticUrl, "thumb", "avif") },
        small: { webp: buildVariantUrl(staticUrl, "small", "webp"), avif: buildVariantUrl(staticUrl, "small", "avif") },
        medium: { webp: buildVariantUrl(staticUrl, "medium", "webp"), avif: buildVariantUrl(staticUrl, "medium", "avif") },
        large: { webp: buildVariantUrl(staticUrl, "large", "webp"), avif: buildVariantUrl(staticUrl, "large", "avif") },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "上传失败";
    return NextResponse.json({ ok: false, message: `上传失败：${msg}` }, { status: 500 });
  }
}

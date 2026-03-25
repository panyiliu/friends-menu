import { ensureAdmin } from "@/lib/api-auth";
import { logError, logInfo } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

type BackupDish = {
  name: string;
  englishName: string;
  tags: string;
  description: string;
  method: string;
  ingredients: string;
  seasonings: string;
  price: number;
  isPublished: boolean;
  isAvailable: boolean;
  categoryName: string;
  categorySortOrder: number;
  images: string[];
  imageSources?: string[];
};

function safeFolderName(input: string) {
  const base = String(input || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return base || "未命名菜品";
}

function toPosix(input: string) {
  return input.replace(/\\/g, "/");
}

function normalizeZipRelPath(input: string) {
  const raw = toPosix(String(input || "").trim().replace(/^\.?\//, "")).replace(/^\/+/, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function toLocalUploadPath(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/api/uploads/")) {
    return `/uploads/${decodeURIComponent(raw.replace("/api/uploads/", ""))}`;
  }
  if (raw.startsWith("/uploads/")) return raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (u.pathname.startsWith("/api/uploads/")) {
        return `/uploads/${decodeURIComponent(u.pathname.replace("/api/uploads/", ""))}`;
      }
      if (u.pathname.startsWith("/uploads/")) return u.pathname;
    } catch {
      return "";
    }
  }
  return "";
}

function extFromUrl(raw: string) {
  try {
    const u = new URL(raw, "http://localhost");
    const ext = path.extname(u.pathname || "").toLowerCase();
    if (ext) return ext;
  } catch {
    // ignore
  }
  return ".jpg";
}

function alternateInternalUrl(src: string): string | null {
  const pub = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "");
  const internal = process.env.INTERNAL_BASE_URL?.replace(/\/$/, "");
  if (!pub || !internal || !src.startsWith(pub)) return null;
  return internal + src.slice(pub.length);
}

async function fetchRemoteImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

async function loadImageFromSource(raw: string, publicDir: string): Promise<Buffer | null> {
  const src = String(raw || "").trim();
  if (!src) return null;

  const localPath = toLocalUploadPath(src);
  if (localPath) {
    const fsPath = path.join(publicDir, localPath.replace(/^\//, ""));
    try {
      return await fs.readFile(fsPath);
    } catch {
      // continue to remote fetch fallback
    }
  }

  // 兼容老备份里 imageSources 只存相对路径（/uploads/... 或 /api/uploads/...）的情况。
  // 当本地文件不存在时，尝试拼接站点基址从当前/原站拉取。
  if (src.startsWith("/uploads/") || src.startsWith("/api/uploads/")) {
    const bases = [process.env.INTERNAL_BASE_URL, process.env.PUBLIC_SITE_URL]
      .map((x) => String(x || "").trim().replace(/\/+$/, ""))
      .filter(Boolean);
    const normalizedPath = src.startsWith("/uploads/") ? `/api${src}` : src;
    for (const base of bases) {
      const buf = await fetchRemoteImage(`${base}${normalizedPath}`);
      if (buf) return buf;
    }
  }

  if (/^https?:\/\//i.test(src)) {
    let buf = await fetchRemoteImage(src);
    if (!buf) {
      const alt = alternateInternalUrl(src);
      if (alt) buf = await fetchRemoteImage(alt);
    }
    return buf;
  }
  return null;
}

function findZipFileByPath(zip: JSZip, preferredPath: string, dir: string) {
  const preferred = normalizeZipRelPath(preferredPath);
  const full = normalizeZipRelPath(path.join(dir, preferred));
  const candidates = [full, preferred].filter(Boolean).map((x) => normalizeZipRelPath(x).toLowerCase());
  const files = Object.values(zip.files).filter((f) => !f.dir);

  // 1) 完全路径匹配（对 zip 实际文件名先做标准化，兼容 Windows 压缩包里的反斜杠）。
  for (const c of candidates) {
    const exact = files.find((f) => normalizeZipRelPath(f.name).toLowerCase() === c);
    if (exact) return exact;
  }

  // 2) 末尾路径匹配（兼容多一层根目录，如 2222/xxx/images/a.jpg）。
  for (const c of candidates) {
    const suffix = `/${c}`;
    const end = files.find((f) => normalizeZipRelPath(f.name).toLowerCase().endsWith(suffix));
    if (end) return end;
  }

  // 3) 仅文件名匹配（兜底）。
  const basename = path.posix.basename(preferred).toLowerCase();
  if (basename) {
    const fallback = files.find((f) => path.posix.basename(normalizeZipRelPath(f.name)).toLowerCase() === basename);
    if (fallback) return fallback;
  }
  return null;
}

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const dishes = await prisma.dish.findMany({
      include: { category: true, images: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { createdAt: "asc" }],
    });
    const zip = new JSZip();
    zip.file(
      "manifest.json",
      JSON.stringify(
        {
          schemaVersion: 2,
          version: 1,
          exportedAt: new Date().toISOString(),
          dishCount: dishes.length,
        },
        null,
        2,
      ),
    );

    const publicDir = path.join(process.cwd(), "public");
    for (const dish of dishes) {
      const folderName = safeFolderName(`${dish.category?.name || "未分类"}-${dish.name}`);
      const dishFolder = zip.folder(folderName);
      if (!dishFolder) continue;

      const imagePaths: string[] = [];
      const imageSources: string[] = [];
      for (const image of dish.images) {
        const rawUrl = String(image.url || "").trim();
        if (rawUrl) imageSources.push(rawUrl);
        const normalized = toLocalUploadPath(String(image.url || ""));
        if (!normalized) continue;
        const fsPath = path.join(publicDir, normalized.replace(/^\//, ""));
        try {
          const fileBuf = await fs.readFile(fsPath);
          const fileName = path.basename(fsPath);
          dishFolder.file(path.join("images", fileName), fileBuf);
          imagePaths.push(toPosix(path.join("images", fileName)));
        } catch {
          // Ignore missing files and continue exporting metadata.
        }
      }

      const meta: BackupDish = {
        name: dish.name,
        englishName: dish.englishName || "",
        tags: dish.tags || "",
        description: dish.description || "",
        method: dish.method || "",
        ingredients: dish.ingredients || "",
        seasonings: dish.seasonings || "",
        price: Number(dish.price || 0),
        isPublished: Boolean(dish.isPublished),
        isAvailable: Boolean(dish.isAvailable),
        categoryName: dish.category?.name || "未分类",
        categorySortOrder: Number(dish.category?.sortOrder || 0),
        images: imagePaths,
        imageSources,
      };
      dishFolder.file("dish.json", JSON.stringify(meta, null, 2));
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="menu-backup-${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "导出备份失败";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const form = await req.formData();
    const mode = String(form.get("mode") || "apply").toLowerCase();
    const dryRun = mode === "dry-run";
    const zipFile = form.get("file");
    if (!(zipFile instanceof File)) {
      return NextResponse.json({ ok: false, message: "请上传 ZIP 文件" }, { status: 400 });
    }
    if (!/\.zip$/i.test(zipFile.name)) {
      return NextResponse.json({ ok: false, message: "文件格式错误，请上传 .zip" }, { status: 400 });
    }

    const zip = await JSZip.loadAsync(Buffer.from(await zipFile.arrayBuffer()));
    const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(publicUploadsDir, { recursive: true });

    const warnings: string[] = [];

    const manifestEntry = zip.file("manifest.json");
    if (manifestEntry) {
      try {
        const manifestRaw = await manifestEntry.async("string");
        const m = JSON.parse(manifestRaw) as { schemaVersion?: number; version?: number };
        const schema = typeof m.schemaVersion === "number" ? m.schemaVersion : typeof m.version === "number" ? m.version : 1;
        if (schema < 1 || schema > 2) {
          return NextResponse.json(
            { ok: false, message: `不支持的备份格式：manifest schemaVersion=${schema}（仅支持 1–2）` },
            { status: 400 },
          );
        }
      } catch {
        warnings.push("manifest.json 无法解析，将按 dish.json 继续尝试导入");
      }
    } else {
      warnings.push("ZIP 中未包含 manifest.json（旧版备份），将按 dish.json 导入");
    }

    const dishEntries = Object.values(zip.files).filter((f) => /(^|\/)dish\.json$/i.test(f.name));
    if (dishEntries.length === 0) {
      return NextResponse.json({ ok: false, message: "ZIP 中未找到 dish.json，无法恢复" }, { status: 400 });
    }

    let imported = 0;
    let imageCount = 0;
    const details: Array<{ dish: string; imageRelCount: number; imageSourceCount: number; restored: number; miss: number }> = [];
    for (const entry of dishEntries) {
      if (entry.dir) continue;
      const dir = entry.name.split("/").slice(0, -1).join("/");
      const raw = await entry.async("string");
      let meta: Partial<BackupDish>;
      try {
        meta = JSON.parse(raw) as Partial<BackupDish>;
      } catch {
        warnings.push(`无效JSON: ${entry.name}`);
        continue;
      }
      const categoryName = String(meta.categoryName || "").trim() || "未分类";

      const name = String(meta.name || "").trim();
      if (!name) continue;
      if (dryRun) {
        imported += 1;
        imageCount += (Array.isArray(meta.images) ? meta.images : []).length;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const existedCategory = await tx.category.findFirst({ where: { name: categoryName } });
        const category = existedCategory
          ? await tx.category.update({
              where: { id: existedCategory.id },
              data: { sortOrder: Number(meta.categorySortOrder || existedCategory.sortOrder || 0), isEnabled: true },
            })
          : await tx.category.create({
              data: {
                name: categoryName,
                sortOrder: Number(meta.categorySortOrder || 0),
                isEnabled: true,
              },
            });

        const existing = await tx.dish.findFirst({ where: { name, categoryId: category.id } });
        const dishData = {
          name,
          englishName: String(meta.englishName || ""),
          tags: String(meta.tags || ""),
          description: String(meta.description || ""),
          method: String(meta.method || ""),
          ingredients: String(meta.ingredients || ""),
          seasonings: String(meta.seasonings || ""),
          price: Number(meta.price || 0),
          isPublished: Boolean(meta.isPublished ?? true),
          isAvailable: Boolean(meta.isAvailable ?? true),
          categoryId: category.id,
        };
        const dish = existing
          ? await tx.dish.update({ where: { id: existing.id }, data: dishData })
          : await tx.dish.create({ data: dishData });

        const imageRelPaths = Array.isArray(meta.images) ? meta.images : [];
        const imageSources = Array.isArray(meta.imageSources) ? meta.imageSources.map((x) => String(x || "").trim()).filter(Boolean) : [];
        const restoredUrls: string[] = [];
        let missCount = 0;
        const sourcePublicDir = path.join(process.cwd(), "public");
        for (let idx = 0; idx < imageRelPaths.length; idx += 1) {
          const relPath = imageRelPaths[idx];
          const fileInZip = findZipFileByPath(zip, String(relPath || ""), dir);
          if (!fileInZip) {
            const source = imageSources[idx] || String(relPath || "").trim();
            const sourceAsZip = source ? findZipFileByPath(zip, source, dir) : null;
            if (sourceAsZip) {
              const fileBytes = await sourceAsZip.async("nodebuffer");
              const ext = path.extname(sourceAsZip.name) || ".jpg";
              const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
              const target = path.join(publicUploadsDir, filename);
              await fs.writeFile(target, fileBytes, { flush: true });
              restoredUrls.push(`/api/uploads/${encodeURIComponent(filename)}`);
              imageCount += 1;
              continue;
            }
            const fileBytes = await loadImageFromSource(source, sourcePublicDir);
            if (fileBytes) {
              const ext = extFromUrl(source);
              const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
              const target = path.join(publicUploadsDir, filename);
              await fs.writeFile(target, fileBytes, { flush: true });
              restoredUrls.push(`/api/uploads/${encodeURIComponent(filename)}`);
              imageCount += 1;
            } else {
              missCount += 1;
              warnings.push(`图片未恢复: ${name}（路径 ${String(relPath || "")} 未命中，且来源 ${source || "(空)"} 不可拉取）`);
            }
            continue;
          }
          const fileBytes = await fileInZip.async("nodebuffer");
          const ext = path.extname(fileInZip.name) || ".jpg";
          const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
          const target = path.join(publicUploadsDir, filename);
          await fs.writeFile(target, fileBytes, { flush: true });
          restoredUrls.push(`/api/uploads/${encodeURIComponent(filename)}`);
          imageCount += 1;
        }

        if (imageRelPaths.length === 0 && imageSources.length > 0) {
          for (const source of imageSources) {
            const fileBytes = await loadImageFromSource(source, sourcePublicDir);
            if (!fileBytes) {
              missCount += 1;
              warnings.push(`图片未恢复: ${name}（imageSources: ${source} 无法拉取）`);
              continue;
            }
            const ext = extFromUrl(source);
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
            const target = path.join(publicUploadsDir, filename);
            await fs.writeFile(target, fileBytes, { flush: true });
            restoredUrls.push(`/api/uploads/${encodeURIComponent(filename)}`);
            imageCount += 1;
          }
        }

        if (restoredUrls.length > 0) {
          await tx.dishImage.deleteMany({ where: { dishId: dish.id } });
          await tx.dishImage.createMany({
            data: restoredUrls.map((url, idx) => ({
              dishId: dish.id,
              url,
              isCover: idx === 0,
            })),
          });
        } else if (imageRelPaths.length > 0 || imageSources.length > 0) {
          warnings.push(`图片缺失: ${name}（未成功恢复到任何图片）`);
        }
        details.push({ dish: name, imageRelCount: imageRelPaths.length, imageSourceCount: imageSources.length, restored: restoredUrls.length, miss: missCount });
      });
      imported += 1;
    }

    await logInfo("backup_restore_completed", { imported, imageCount, dryRun, warnings: warnings.length, details });
    return NextResponse.json({ ok: true, imported, imageCount, dryRun, warnings, details });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "恢复失败";
    await logError("backup_restore_failed", error);
    return NextResponse.json({ ok: false, message: `恢复失败：${msg}` }, { status: 400 });
  }
}

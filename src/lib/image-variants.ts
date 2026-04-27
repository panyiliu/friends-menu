const UPLOADS_PREFIX = "/uploads/";
const LEGACY_UPLOADS_PREFIX = "/api/uploads/";

export type ImageVariantSize = "thumb" | "small" | "medium" | "large";
export type ImageVariantFormat = "webp" | "avif";

export function normalizeUploadUrl(rawUrl: string): string {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  if (value.startsWith(LEGACY_UPLOADS_PREFIX)) {
    const filename = value.slice(LEGACY_UPLOADS_PREFIX.length);
    return `${UPLOADS_PREFIX}${filename}`;
  }
  return value;
}

function splitUploadPath(url: string): { dir: string; base: string; ext: string } | null {
  if (!url.startsWith(UPLOADS_PREFIX)) return null;
  const clean = url.split("?")[0].split("#")[0];
  const lastSlash = clean.lastIndexOf("/");
  const lastDot = clean.lastIndexOf(".");
  if (lastDot <= lastSlash) return null;
  return {
    dir: clean.slice(0, lastSlash + 1),
    base: clean.slice(lastSlash + 1, lastDot),
    ext: clean.slice(lastDot + 1),
  };
}

export function buildVariantUrl(rawUrl: string, size: ImageVariantSize, format: ImageVariantFormat): string {
  const normalized = normalizeUploadUrl(rawUrl);
  const info = splitUploadPath(normalized);
  if (!info) return normalized;
  return `${info.dir}${info.base}__${size}.${format}`;
}

export function buildVariantCandidates(rawUrl: string, size: ImageVariantSize): string[] {
  const normalized = normalizeUploadUrl(rawUrl);
  const info = splitUploadPath(normalized);
  if (!info) return [normalized];
  return [buildVariantUrl(normalized, size, "avif"), buildVariantUrl(normalized, size, "webp"), normalized];
}

export function isUploadPath(rawUrl: string): boolean {
  return normalizeUploadUrl(rawUrl).startsWith(UPLOADS_PREFIX);
}

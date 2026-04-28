/**
 * Client-side image compression. Resizes to a max edge of `maxDim` and
 * re-encodes as JPEG at `quality`. Typical 12 MB phone photos shrink to
 * 200-500 KB, which is plenty for a memorial page (display max ~1920px).
 *
 * The function is intentionally permissive: if anything fails (HEIC on a
 * non-Safari browser, OOM on a 100MP image, etc.) it returns the original
 * file unchanged. The server still enforces the 10 MB hard limit, so a
 * compression failure can't ship a broken upload.
 */

const DEFAULT_MAX_DIM = 1920;
const DEFAULT_QUALITY = 0.85;
/** Below this, compression's overhead (re-encode artifacts) isn't worth it. */
const SKIP_BELOW_BYTES = 500 * 1024;

export type CompressOptions = {
  maxDim?: number;
  quality?: number;
};

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  if (!file.type.startsWith("image/")) return file;
  if (file.size < SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = scaleToFit(
      bitmap.width,
      bitmap.height,
      maxDim
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;

    // If somehow the "compressed" output is bigger (small images sometimes
    // grow when JPEG-encoded), keep the original.
    if (blob.size >= file.size) return file;

    const newName = renameToJpg(file.name);
    return new File([blob], newName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function scaleToFit(
  w: number,
  h: number,
  maxDim: number
): { width: number; height: number } {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const ratio = w > h ? maxDim / w : maxDim / h;
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

function renameToJpg(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.jpg`;
}

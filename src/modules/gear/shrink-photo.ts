/** Upload limit for my own shoe photos (the gear-photos bucket allows 300 KB). */
export const PHOTO_TARGET_BYTES = 280 * 1024;

/** Longest side and quality steps tried in order until the photo fits. */
export const SHRINK_STEPS: { side: number; quality: number }[] = [
  { side: 1280, quality: 0.82 },
  { side: 1280, quality: 0.7 },
  { side: 1024, quality: 0.7 },
  { side: 800, quality: 0.65 },
  { side: 640, quality: 0.6 },
];

/** Scale that fits width × height inside a square of `side`, never enlarging. */
export const fitScale = (width: number, height: number, side: number) => Math.min(1, side / Math.max(width, height));

/**
 * Shrinks a camera or gallery photo in the browser before upload. WebP where the browser can
 * encode it, JPEG otherwise (Safari). Returns null when even the smallest step is too big.
 */
export async function shrinkPhoto(file: File, { target = PHOTO_TARGET_BYTES, steps = SHRINK_STEPS } = {}): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    for (const { side, quality } of steps) {
      const scale = fitScale(bitmap.width, bitmap.height, side);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let blob = await toBlob(canvas, "image/webp", quality);
      if (blob?.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
      if (blob && blob.size <= target) return blob;
    }
    return null;
  } finally {
    bitmap.close();
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));


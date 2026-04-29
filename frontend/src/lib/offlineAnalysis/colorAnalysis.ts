/**
 * Browser port of backend/src/services/ColorAnalysisService.ts
 *
 * Uses the Canvas API to extract pixel data and performs a proper
 * sRGB → CIE XYZ → CIE L*a*b* conversion so the output is on the
 * same scale the backend uses:
 *   L : 0 – 100
 *   a : -128 – 127
 *   b : -128 – 127
 */

export interface LabValues {
  l: number;
  a: number;
  b: number;
}

/** sRGB [0–255] component → linear light [0–1] */
function toLinear(c: number): number {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

/** CIE XYZ f() */
function xyzF(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : (903.3 * t + 16) / 116;
}

/** Convert one RGBA pixel to CIE L*a*b* */
function rgbaToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  // Linear sRGB → XYZ D65 (IEC 61966-2-1 matrix)
  const X = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl;
  const Y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl;
  const Z = 0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl;

  // XYZ → L*a*b* (D65 white point)
  const fx = xyzF(X / 0.95047);
  const fy = xyzF(Y / 1.00000);
  const fz = xyzF(Z / 1.08883);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Draw an image File onto an off-DOM canvas, return the 2D context. */
function imageToCanvas(imageFile: File, maxDim = 480): Promise<{ ctx: CanvasRenderingContext2D; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ ctx, width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for offline analysis"));
    };
    img.src = url;
  });
}

/**
 * Extract mean CIE L*a*b* values from an image File using the Canvas API.
 * Mirrors ColorAnalysisService.extractLabValues() on the backend.
 *
 * @param imageFile     Source image
 * @param calibMatrix   Optional [rScale, gScale, bScale] from stored calibration.
 *                      When provided, pixel channels are scaled before conversion.
 */
export async function extractLabValues(
  imageFile: File,
  calibMatrix?: [number, number, number],
): Promise<LabValues> {
  const { ctx, width, height } = await imageToCanvas(imageFile);
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  if (calibMatrix) {
    const [rScale, gScale, bScale] = calibMatrix;
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.min(Math.round(data[i]     * rScale), 255);
      data[i + 1] = Math.min(Math.round(data[i + 1] * gScale), 255);
      data[i + 2] = Math.min(Math.round(data[i + 2] * bScale), 255);
    }
  }

  let sumL = 0, sumA = 0, sumB = 0;
  const total = width * height;

  for (let i = 0; i < data.length; i += 4) {
    const [L, a, b] = rgbaToLab(data[i], data[i + 1], data[i + 2]);
    sumL += L;
    sumA += a;
    sumB += b;
  }

  return { l: sumL / total, a: sumA / total, b: sumB / total };
}

export { imageToCanvas };

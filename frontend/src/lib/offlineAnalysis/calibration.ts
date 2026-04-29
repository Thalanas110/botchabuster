/**
 * Browser port of CalibrationService + detectCalibrationCard from
 * backend/src/services/CalibrationService.ts and ImageProcessingService.ts
 *
 * Card detection: Canvas pixel iteration → HSV threshold for white/near-white
 * blobs → pick largest rectangle that is 1–40% of image area.
 *
 * No OpenCV dependency — pure Canvas API.
 */

import { imageToCanvas } from "./colorAnalysis";
import { saveCalibration, loadCalibration, type StoredCalibration } from "./calibrationStore";

export type { StoredCalibration };
export { loadCalibration, saveCalibration };

export interface CalibrationResult {
  success: boolean;
  correctionMatrix: [number, number, number]; // [rScale, gScale, bScale]
  whitePoint: { r: number; g: number; b: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** sRGB [0–255] → HSV [h: 0–360, s: 0–100, v: 0–100] */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const v = max * 100;
  const s = max === 0 ? 0 : (delta / max) * 100;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
    if (h < 0) h += 360;
  }
  return [h, s, v];
}

/**
 * Very fast bounding-box scan: marks white-ish pixels then does a single
 * pass to find the tightest axis-aligned bounding box of a connected-ish
 * white region that satisfies the size/ratio constraints.
 *
 * We use a "column histogram" approach instead of full contour-finding:
 * split the image into a 32×32 grid of cells, mark cells that have ≥50%
 * white pixels, then find the largest contiguous rectangular block of
 * marked cells.  Fast enough for 480px images on a mobile GPU.
 */
function detectCardRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | null {
  const GRID = 32;
  const cellW = width / GRID;
  const cellH = height / GRID;
  const grid = new Uint8Array(GRID * GRID); // 1 = white cell

  for (let cy = 0; cy < GRID; cy++) {
    for (let cx = 0; cx < GRID; cx++) {
      const x0 = Math.floor(cx * cellW);
      const x1 = Math.floor((cx + 1) * cellW);
      const y0 = Math.floor(cy * cellH);
      const y1 = Math.floor((cy + 1) * cellH);
      let white = 0, total = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          const [, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
          if (s <= 50 && v >= 70) white++; // near-white / bright gray
          total++;
        }
      }
      grid[cy * GRID + cx] = white / total >= 0.5 ? 1 : 0;
    }
  }

  // Largest rectangle of 1s using histogram method
  const heights = new Int32Array(GRID);
  let best: { x: number; y: number; w: number; h: number; area: number } | null = null;

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      heights[col] = grid[row * GRID + col] === 1 ? heights[col] + 1 : 0;
    }
    // Largest rectangle in histogram
    const stack: number[] = [];
    for (let i = 0; i <= GRID; i++) {
      const h = i < GRID ? heights[i] : 0;
      while (stack.length && heights[stack[stack.length - 1]] > h) {
        const height = heights[stack.pop()!];
        const width2 = stack.length ? i - stack[stack.length - 1] - 1 : i;
        const area = height * width2;
        if (!best || area > best.area) {
          const left = stack.length ? stack[stack.length - 1] + 1 : 0;
          best = { x: left, y: row - height + 1, w: width2, h: height, area };
        }
      }
      stack.push(i);
    }
  }

  if (!best) return null;

  // Convert grid coords back to pixel coords
  const px = Math.floor(best.x * cellW);
  const py = Math.floor(best.y * cellH);
  const pw = Math.floor(best.w * cellW);
  const ph = Math.floor(best.h * cellH);

  // Size / aspect ratio guards (same as backend)
  const area = pw * ph;
  const imageArea = width * height;
  const ratio = pw / Math.max(ph, 1);
  if (area < imageArea * 0.01 || area > imageArea * 0.4) return null;
  if (ratio < 0.4 || ratio > 2.5) return null;

  return { x: px, y: py, w: pw, h: ph };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Detect a white calibration card in the captured image, compute per-channel
 * scale factors, save them to IndexedDB, and return the result.
 *
 * Call this from the "Calibrate" UI flow (dedicated action, not per-scan).
 *
 * @throws if no white card region is found in the image
 */
export async function calibrateFromImage(imageFile: File): Promise<CalibrationResult> {
  const { ctx, width, height } = await imageToCanvas(imageFile, 480);
  const { data } = ctx.getImageData(0, 0, width, height);

  const region = detectCardRegion(data, width, height);
  if (!region) {
    throw new Error(
      "No white calibration card detected. Make sure a white/light-gray card is " +
      "clearly visible in the frame and is not too small."
    );
  }

  // Sample mean R/G/B within the detected card region
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let y = region.y; y < region.y + region.h; y++) {
    for (let x = region.x; x < region.x + region.w; x++) {
      const i = (y * width + x) * 4;
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
      count++;
    }
  }

  const meanR = Math.max(sumR / count, 1);
  const meanG = Math.max(sumG / count, 1);
  const meanB = Math.max(sumB / count, 1);

  // Cap scales at 4× to avoid blowing out very dark cards
  const rScale = Math.min(255 / meanR, 4.0);
  const gScale = Math.min(255 / meanG, 4.0);
  const bScale = Math.min(255 / meanB, 4.0);

  const matrix: [number, number, number] = [rScale, gScale, bScale];
  await saveCalibration(matrix);

  return {
    success: true,
    correctionMatrix: matrix,
    whitePoint: {
      r: Math.round(meanR),
      g: Math.round(meanG),
      b: Math.round(meanB),
    },
  };
}

/**
 * Apply stored calibration correction to a raw pixel data array (RGBA).
 * Modifies the array in-place.
 *
 * @param data   Uint8ClampedArray from ctx.getImageData()
 * @param matrix [rScale, gScale, bScale] from StoredCalibration
 */
export function applyCalibrationToPixels(
  data: Uint8ClampedArray,
  matrix: [number, number, number],
): void {
  const [rScale, gScale, bScale] = matrix;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(Math.round(data[i]     * rScale), 255);
    data[i + 1] = Math.min(Math.round(data[i + 1] * gScale), 255);
    data[i + 2] = Math.min(Math.round(data[i + 2] * bScale), 255);
    // alpha (data[i+3]) unchanged
  }
}

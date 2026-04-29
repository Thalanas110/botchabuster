/**
 * Browser port of backend/src/services/TextureAnalysisService.ts
 *
 * Computes Gray-Level Co-occurrence Matrix (GLCM) Haralick features
 * using the Canvas API for pixel extraction — identical algorithm to
 * the backend, so outputs are directly comparable to backend values.
 */

import { imageToCanvas } from "./colorAnalysis";

export interface GLCMFeatures {
  contrast: number;
  correlation: number;
  energy: number;
  homogeneity: number;
}

/** Extract a single-channel (greyscale) pixel array from an image File. */
async function getGrayscalePixels(
  imageFile: File,
  maxDim = 480
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const { ctx, width, height } = await imageToCanvas(imageFile, maxDim);
  // Desaturate via luminance coefficients before reading
  const imageData = ctx.getImageData(0, 0, width, height);
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    gray[i / 4] = Math.round(
      0.299 * imageData.data[i] +
      0.587 * imageData.data[i + 1] +
      0.114 * imageData.data[i + 2]
    );
  }
  return { data: gray, width, height };
}

function buildGLCM(
  grayImage: number[][],
  dx: number,
  dy: number,
  levels: number
): number[][] {
  const glcm: number[][] = Array.from({ length: levels }, () =>
    Array(levels).fill(0)
  );
  const rows = grayImage.length;
  const cols = grayImage[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nr = r + dy;
      const nc = c + dx;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const i = grayImage[r][c];
        const j = grayImage[nr][nc];
        if (i < levels && j < levels) {
          glcm[i][j]++;
          glcm[j][i]++;
        }
      }
    }
  }

  let sum = 0;
  for (let i = 0; i < levels; i++)
    for (let j = 0; j < levels; j++) sum += glcm[i][j];
  if (sum > 0)
    for (let i = 0; i < levels; i++)
      for (let j = 0; j < levels; j++) glcm[i][j] /= sum;

  return glcm;
}

function extractFeatures(glcm: number[][], levels: number): GLCMFeatures {
  let contrast = 0, energy = 0, homogeneity = 0, correlation = 0;
  let meanI = 0, meanJ = 0, stdI = 0, stdJ = 0;

  for (let i = 0; i < levels; i++) {
    let rowSum = 0;
    for (let j = 0; j < levels; j++) rowSum += glcm[i][j];
    meanI += i * rowSum;
  }
  for (let j = 0; j < levels; j++) {
    let colSum = 0;
    for (let i = 0; i < levels; i++) colSum += glcm[i][j];
    meanJ += j * colSum;
  }

  for (let i = 0; i < levels; i++) {
    let rowSum = 0;
    for (let j = 0; j < levels; j++) rowSum += glcm[i][j];
    stdI += Math.pow(i - meanI, 2) * rowSum;
  }
  for (let j = 0; j < levels; j++) {
    let colSum = 0;
    for (let i = 0; i < levels; i++) colSum += glcm[i][j];
    stdJ += Math.pow(j - meanJ, 2) * colSum;
  }
  stdI = Math.sqrt(stdI);
  stdJ = Math.sqrt(stdJ);

  for (let i = 0; i < levels; i++) {
    for (let j = 0; j < levels; j++) {
      const p = glcm[i][j];
      contrast += Math.pow(i - j, 2) * p;
      energy += Math.pow(p, 2);
      homogeneity += p / (1 + Math.abs(i - j));
      if (stdI > 0 && stdJ > 0)
        correlation += ((i - meanI) * (j - meanJ) * p) / (stdI * stdJ);
    }
  }

  return { contrast, correlation, energy, homogeneity };
}

/**
 * Compute GLCM features from an image File.
 * Mirrors TextureAnalysisService.computeGLCMFeatures() on the backend.
 */
export async function computeGLCMFeatures(
  imageFile: File,
  levels = 8,
  distance = 1
): Promise<GLCMFeatures> {
  const { data, width, height } = await getGrayscalePixels(imageFile);
  const step = Math.floor(256 / levels);

  const grayImage: number[][] = [];
  for (let r = 0; r < height; r++) {
    grayImage.push([]);
    for (let c = 0; c < width; c++) {
      const val = data[r * width + c];
      grayImage[r].push(Math.min(Math.floor(val / step), levels - 1));
    }
  }

  const angles = [
    { dx: distance, dy: 0 },
    { dx: distance, dy: -distance },
    { dx: 0, dy: distance },
    { dx: -distance, dy: distance },
  ];

  const all = angles.map(({ dx, dy }) =>
    extractFeatures(buildGLCM(grayImage, dx, dy, levels), levels)
  );

  return {
    contrast: all.reduce((s, f) => s + f.contrast, 0) / all.length,
    correlation: all.reduce((s, f) => s + f.correlation, 0) / all.length,
    energy: all.reduce((s, f) => s + f.energy, 0) / all.length,
    homogeneity: all.reduce((s, f) => s + f.homogeneity, 0) / all.length,
  };
}

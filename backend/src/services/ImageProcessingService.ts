import sharp from "sharp";
import { getOpenCv } from "../integrations/opencv";

export interface ImageQualityAssessment {
  accepted: boolean;
  reasons: string[];
  metrics: {
    blurScore: number;
    contrastVariance: number;
    adaptiveBlurThreshold: number;
    rejectBlurThreshold: number;
    centerOffsetX: number;
    centerOffsetY: number;
  };
}

export class ImageProcessingService {
  private static instance: ImageProcessingService;

  // Blur gating is adaptive to scene contrast to avoid false positives on smooth cuts.
  private readonly baseBlurThreshold = 95;
  private readonly minAdaptiveBlurThreshold = 55;
  private readonly contrastReferenceVariance = 900;
  private readonly strictBlurRejectionFactor = 0.75;
  private readonly maxCenterOffset = 0.18;

  private constructor() {}

  static getInstance(): ImageProcessingService {
    if (!ImageProcessingService.instance) {
      ImageProcessingService.instance = new ImageProcessingService();
    }
    return ImageProcessingService.instance;
  }

  async validateImageQuality(imagePath: string): Promise<ImageQualityAssessment> {
    const { data, info } = await sharp(imagePath)
      .greyscale()
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const blurScore = this.computeLaplacianVariance(data, info.width, info.height);
    const contrastVariance = this.computeVariance(data);
    const adaptiveBlurThreshold = this.computeAdaptiveBlurThreshold(contrastVariance);
    const rejectBlurThreshold = adaptiveBlurThreshold * this.strictBlurRejectionFactor;
    const { offsetX, offsetY } = this.computeForegroundCenterOffset(data, info.width, info.height);

    const reasons: string[] = [];
    if (blurScore < rejectBlurThreshold) {
      reasons.push(
        `Image appears blurry (sharpness ${blurScore.toFixed(1)} < ${rejectBlurThreshold.toFixed(1)}). Please retake with a steadier camera and better focus.`
      );
    }

    if (Math.abs(offsetX) > this.maxCenterOffset || Math.abs(offsetY) > this.maxCenterOffset) {
      reasons.push(
        `Image is off-center (offset x=${offsetX.toFixed(2)}, y=${offsetY.toFixed(2)}). Please center the sample in frame.`
      );
    }

    return {
      accepted: reasons.length === 0,
      reasons,
      metrics: {
        blurScore,
        contrastVariance,
        adaptiveBlurThreshold,
        rejectBlurThreshold,
        centerOffsetX: offsetX,
        centerOffsetY: offsetY,
      },
    };
  }

  async preprocessImage(imagePath: string): Promise<Buffer> {
    return sharp(imagePath).blur(1).jpeg().toBuffer();
  }

  // Looks for a white/neutral calibration card using HSV thresholding + contour filtering.
  async detectCalibrationCard(imagePath: string): Promise<{
    found: boolean;
    region?: { x: number; y: number; width: number; height: number };
    whitePoint?: { r: number; g: number; b: number };
  }> {
    const cv = await getOpenCv() as any;
    const { data, info } = await sharp(imagePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rgba = new cv.Mat(info.height, info.width, cv.CV_8UC4);
    rgba.data.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    const mat = new cv.Mat();
    cv.cvtColor(rgba, mat, cv.COLOR_RGBA2BGR);
    rgba.delete();

    const hsvMat = new cv.Mat();
    cv.cvtColor(mat, hsvMat, cv.COLOR_BGR2HSV);
    mat.delete();

    // Threshold for white/near-white: low saturation, high value
    const { rows, cols } = hsvMat;
    const hsvData = hsvMat.data as Uint8Array;
    const maskData = new Uint8Array(rows * cols);
    for (let i = 0; i < rows * cols; i++) {
      const s = hsvData[i * 3 + 1];
      const v = hsvData[i * 3 + 2];
      maskData[i] = (s <= 50 && v >= 180) ? 255 : 0;
    }
    hsvMat.delete();

    const mask = new cv.Mat(rows, cols, cv.CV_8UC1);
    mask.data.set(maskData);
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    mask.delete();
    hierarchy.delete();

    const imageArea = info.width * info.height;
    let bestRect: { x: number; y: number; width: number; height: number } | null = null;
    let bestArea = 0;

    for (let i = 0; i < (contours.size() as unknown as number); i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rect = cv.boundingRect(contours.get(i)) as any;
      const area = rect.width * rect.height;
      const ratio = rect.width / rect.height;
      if (area > imageArea * 0.01 && area < imageArea * 0.4 && ratio > 0.5 && ratio < 2.0 && area > bestArea) {
        bestArea = area;
        bestRect = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }
    }
    contours.delete();

    if (!bestRect) return { found: false };

    const roiPixels = await sharp(imagePath)
      .extract({ left: bestRect.x, top: bestRect.y, width: bestRect.width, height: bestRect.height })
      .removeAlpha()
      .raw()
      .toBuffer();

    const pixelCount = bestRect.width * bestRect.height;
    let sumR = 0, sumG = 0, sumB = 0;
    for (let i = 0; i < pixelCount; i++) {
      sumR += roiPixels[i * 3];
      sumG += roiPixels[i * 3 + 1];
      sumB += roiPixels[i * 3 + 2];
    }

    return {
      found: true,
      region: bestRect,
      whitePoint: {
        r: Math.round(sumR / pixelCount),
        g: Math.round(sumG / pixelCount),
        b: Math.round(sumB / pixelCount),
      },
    };
  }

  // Segments the meat area from the background using Lab color range,
  // then cleans up the mask with morphological open/close operations.
  async extractMeatROI(imagePath: string): Promise<Buffer> {
    const cv = await getOpenCv() as any;
    const { data, info } = await sharp(imagePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rgba = new cv.Mat(info.height, info.width, cv.CV_8UC4);
    rgba.data.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    const mat = new cv.Mat();
    cv.cvtColor(rgba, mat, cv.COLOR_RGBA2BGR);
    rgba.delete();

    const labMat = new cv.Mat();
    cv.cvtColor(mat, labMat, cv.COLOR_BGR2Lab);

    // Segment reddish/pinkish tones: moderate L, a* above midpoint (reddish), moderate b*
    const { rows, cols } = labMat;
    const labData = labMat.data as Uint8Array;
    const maskData = new Uint8Array(rows * cols);
    for (let i = 0; i < rows * cols; i++) {
      const L = labData[i * 3];
      const a = labData[i * 3 + 1];
      const b = labData[i * 3 + 2];
      maskData[i] = (L >= 30 && L <= 220 && a >= 130 && a <= 200 && b >= 115 && b <= 200) ? 255 : 0;
    }
    labMat.delete();

    const mask = new cv.Mat(rows, cols, cv.CV_8UC1);
    mask.data.set(maskData);

    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(7, 7));
    const closed = new cv.Mat();
    cv.morphologyEx(mask, closed, cv.MORPH_CLOSE, kernel);
    mask.delete();
    const opened = new cv.Mat();
    cv.morphologyEx(closed, opened, cv.MORPH_OPEN, kernel);
    closed.delete();
    kernel.delete();

    const mask3ch = new cv.Mat();
    cv.cvtColor(opened, mask3ch, cv.COLOR_GRAY2BGR);
    opened.delete();

    const result = new cv.Mat();
    cv.bitwise_and(mat, mask3ch, result);
    mat.delete();
    mask3ch.delete();

    const rgb = new cv.Mat();
    cv.cvtColor(result, rgb, cv.COLOR_BGR2RGB);
    result.delete();
    const rawBuffer = Buffer.from(rgb.data as Uint8Array);
    rgb.delete();

    return sharp(rawBuffer, { raw: { width: info.width, height: info.height, channels: 3 } })
      .jpeg()
      .toBuffer();
  }

  private computeLaplacianVariance(pixels: Buffer, width: number, height: number): number {
    if (width < 3 || height < 3) return 0;

    let sum = 0;
    let sumSquares = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const center = pixels[idx];
        const left = pixels[idx - 1];
        const right = pixels[idx + 1];
        const up = pixels[idx - width];
        const down = pixels[idx + width];

        const laplacian = left + right + up + down - 4 * center;
        sum += laplacian;
        sumSquares += laplacian * laplacian;
        count++;
      }
    }

    if (count === 0) return 0;
    const mean = sum / count;
    return sumSquares / count - mean * mean;
  }

  private computeVariance(values: Buffer): number {
    if (values.length === 0) return 0;

    let sum = 0;
    let sumSquares = 0;
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      sum += value;
      sumSquares += value * value;
    }

    const mean = sum / values.length;
    return sumSquares / values.length - mean * mean;
  }

  private computeAdaptiveBlurThreshold(contrastVariance: number): number {
    const safeContrast = Math.max(1, contrastVariance);
    const scaled = this.baseBlurThreshold * Math.sqrt(safeContrast / this.contrastReferenceVariance);
    return Math.min(this.baseBlurThreshold, Math.max(this.minAdaptiveBlurThreshold, scaled));
  }

  private computeForegroundCenterOffset(
    pixels: Buffer,
    width: number,
    height: number
  ): { offsetX: number; offsetY: number } {
    if (width === 0 || height === 0) {
      return { offsetX: 0, offsetY: 0 };
    }

    const borderSamples: number[] = [];
    for (let x = 0; x < width; x++) {
      borderSamples.push(pixels[x]);
      borderSamples.push(pixels[(height - 1) * width + x]);
    }
    for (let y = 1; y < height - 1; y++) {
      borderSamples.push(pixels[y * width]);
      borderSamples.push(pixels[y * width + (width - 1)]);
    }

    const backgroundLevel = this.median(borderSamples);
    const deltaThreshold = 25;

    let sumX = 0;
    let sumY = 0;
    let foregroundCount = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const intensity = pixels[y * width + x];
        if (Math.abs(intensity - backgroundLevel) > deltaThreshold) {
          sumX += x;
          sumY += y;
          foregroundCount++;
        }
      }
    }

    if (foregroundCount === 0) {
      return { offsetX: 1, offsetY: 1 };
    }

    const centroidX = sumX / foregroundCount;
    const centroidY = sumY / foregroundCount;
    const centerX = (width - 1) / 2;
    const centerY = (height - 1) / 2;

    return {
      offsetX: (centroidX - centerX) / width,
      offsetY: (centroidY - centerY) / height,
    };
  }

  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
}

/**
 * ImageProcessingService
 * 
 * Handles OpenCV image loading, preprocessing, and ROI extraction.
 * Uses opencv4nodejs for native OpenCV bindings.
 */
import sharp from "sharp";

export interface ImageQualityAssessment {
  accepted: boolean;
  reasons: string[];
  metrics: {
    blurScore: number;
    centerOffsetX: number;
    centerOffsetY: number;
  };
}

export class ImageProcessingService {
  private static instance: ImageProcessingService;

  // Tuned for downscaled grayscale images in [0,255].
  private readonly blurThreshold = 90;
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
    const { offsetX, offsetY } = this.computeForegroundCenterOffset(data, info.width, info.height);

    const reasons: string[] = [];
    if (blurScore < this.blurThreshold) {
      reasons.push(
        `Image is blurry (sharpness ${blurScore.toFixed(1)} < ${this.blurThreshold}). Please retake with a steadier camera and better focus.`
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
        centerOffsetX: offsetX,
        centerOffsetY: offsetY,
      },
    };
  }

  /**
   * Load and preprocess image from file path.
   * Applies noise reduction and normalizes based on calibration card.
   */
  async preprocessImage(imagePath: string): Promise<Buffer> {
    // TODO: Implement with opencv4nodejs
    // 1. cv.imread(imagePath)
    // 2. Apply Gaussian blur for noise reduction
    // 3. Detect calibration card ROI
    // 4. Normalize white balance using calibration card
    // 5. Extract meat sample ROI
    // 6. Return processed image buffer
    
    const fs = await import("fs");
    return fs.promises.readFile(imagePath);
  }


  

  /**
   * Detect and extract calibration card region from the image.
   */
  async detectCalibrationCard(imagePath: string): Promise<{
    found: boolean;
    region?: { x: number; y: number; width: number; height: number };
    whitePoint?: { r: number; g: number; b: number };
  }> {
    // TODO: Implement color card detection
    // 1. Convert to HSV
    // 2. Threshold for white/neutral regions
    // 3. Find contours matching expected card aspect ratio
    // 4. Extract white point for calibration
    return { found: false };
  }

  /**
   * Extract the meat sample region of interest.
   */
  async extractMeatROI(imagePath: string): Promise<Buffer> {
    // TODO: Implement ROI extraction
    // 1. Use color segmentation to isolate meat from background
    // 2. Find largest contour
    // 3. Create mask and extract ROI
    const fs = await import("fs");
    return fs.promises.readFile(imagePath);
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

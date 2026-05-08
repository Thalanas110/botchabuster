import sharp from 'sharp';
import { getOpenCv } from "../integrations/opencv";

export interface LabValues {
  l: number; // Lightness (0-100)
  a: number; // Green-Red axis (-128 to 127)
  b: number; // Blue-Yellow axis (-128 to 127)
}

export class ColorAnalysisService {
  private static instance: ColorAnalysisService;

  private constructor() {}

  static getInstance(): ColorAnalysisService {
    if (!ColorAnalysisService.instance) {
      ColorAnalysisService.instance = new ColorAnalysisService();
    }
    return ColorAnalysisService.instance;
  }

  async extractLabValues(imageBuffer: Buffer): Promise<LabValues> {
    const cv = await getOpenCv() as any;
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rgba = new cv.Mat(info.height, info.width, cv.CV_8UC4);
    rgba.data.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    const bgr = new cv.Mat();
    cv.cvtColor(rgba, bgr, cv.COLOR_RGBA2BGR);
    rgba.delete();

    const lab = new cv.Mat();
    cv.cvtColor(bgr, lab, cv.COLOR_BGR2Lab);
    bgr.delete();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mean = cv.mean(lab) as any;
    lab.delete();

    // 8-bit Lab encoding: L channel [0, 255] maps to [0, 100]; a and b channels offset by 128
    return {
      l: (mean[0] / 255) * 100,
      a: mean[1] - 128,
      b: mean[2] - 128,
    };
  }

  /**
   * Calculate color difference (Delta E) between sample and reference.
   * Uses CIE76 formula: sqrt((L1-L2)² + (a1-a2)² + (b1-b2)²)
   */
  calculateDeltaE(sample: LabValues, reference: LabValues): number {
    return Math.sqrt(
      Math.pow(sample.l - reference.l, 2) +
      Math.pow(sample.a - reference.a, 2) +
      Math.pow(sample.b - reference.b, 2)
    );
  }
}

import sharp from 'sharp';

export interface CalibrationData {
  whitePoint: { r: number; g: number; b: number };
  correctionMatrix: number[][];
}

export class CalibrationService {
  private static instance: CalibrationService;

  private constructor() {}

  static getInstance(): CalibrationService {
    if (!CalibrationService.instance) {
      CalibrationService.instance = new CalibrationService();
    }
    return CalibrationService.instance;
  }

  // Builds a per-channel correction matrix from the mean color of the card region.
  // The card is assumed to be a neutral white/gray patch under ambient market lighting.
  async calibrate(imageBuffer: Buffer, cardRegion: {
    x: number; y: number; width: number; height: number;
  }): Promise<CalibrationData> {
    const pixels = await sharp(imageBuffer)
      .extract({ left: cardRegion.x, top: cardRegion.y, width: cardRegion.width, height: cardRegion.height })
      .removeAlpha()
      .raw()
      .toBuffer();

    const count = cardRegion.width * cardRegion.height;
    let sumR = 0, sumG = 0, sumB = 0;
    for (let i = 0; i < count; i++) {
      sumR += pixels[i * 3];
      sumG += pixels[i * 3 + 1];
      sumB += pixels[i * 3 + 2];
    }

    const r = Math.max(sumR / count, 1);
    const g = Math.max(sumG / count, 1);
    const b = Math.max(sumB / count, 1);

    return {
      whitePoint: { r: Math.round(r), g: Math.round(g), b: Math.round(b) },
      correctionMatrix: [
        [255 / r, 0,       0      ],
        [0,       255 / g, 0      ],
        [0,       0,       255 / b],
      ],
    };
  }

  // Scales each RGB channel independently using the correction matrix diagonal.
  async applyCorrection(
    imageBuffer: Buffer,
    calibration: CalibrationData
  ): Promise<Buffer> {
    const { data: pixels, info } = await sharp(imageBuffer)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rScale = Math.min(calibration.correctionMatrix[0][0], 4.0);
    const gScale = Math.min(calibration.correctionMatrix[1][1], 4.0);
    const bScale = Math.min(calibration.correctionMatrix[2][2], 4.0);

    for (let i = 0; i < pixels.length; i += 3) {
      pixels[i]     = Math.min(Math.round(pixels[i]     * rScale), 255);
      pixels[i + 1] = Math.min(Math.round(pixels[i + 1] * gScale), 255);
      pixels[i + 2] = Math.min(Math.round(pixels[i + 2] * bScale), 255);
    }

    return sharp(pixels, { raw: { width: info.width, height: info.height, channels: 3 } })
      .jpeg()
      .toBuffer();
  }
}

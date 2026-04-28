/**
 * TextureAnalysisService
 * 
 * Computes Gray-Level Co-occurrence Matrix (GLCM) texture features
 * from meat sample images. GLCM captures spatial relationships between
 * pixel intensities, useful for detecting surface degradation.
 */
import sharp from 'sharp';

export interface GLCMFeatures {
  contrast: number;      // Intensity contrast between pixel and neighbor
  correlation: number;   // Linear dependency of gray levels
  energy: number;        // Sum of squared elements (uniformity)
  homogeneity: number;   // Closeness of distribution to GLCM diagonal
}

export class TextureAnalysisService {
  private static instance: TextureAnalysisService;

  private constructor() {}

  static getInstance(): TextureAnalysisService {
    if (!TextureAnalysisService.instance) {
      TextureAnalysisService.instance = new TextureAnalysisService();
    }
    return TextureAnalysisService.instance;
  }

  async computeGLCMFeatures(
    imageBuffer: Buffer,
    levels: number = 8,
    distance: number = 1
  ): Promise<GLCMFeatures> {
    const { data, info } = await sharp(imageBuffer)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width: cols, height: rows } = info;
    const step = Math.floor(256 / levels);
    const grayImage: number[][] = [];
    for (let r = 0; r < rows; r++) {
      grayImage.push([]);
      for (let c = 0; c < cols; c++) {
        const val = data[r * cols + c];
        grayImage[r].push(Math.min(Math.floor(val / step), levels - 1));
      }
    }

    const angles = [
      { dx: distance,  dy: 0        },
      { dx: distance,  dy: -distance },
      { dx: 0,         dy: distance  },
      { dx: -distance, dy: distance  },
    ];

    const allFeatures = angles.map(({ dx, dy }) => {
      const glcm = this.buildGLCM(grayImage, dx, dy, levels);
      return this.extractFeatures(glcm, levels);
    });

    return {
      contrast:    allFeatures.reduce((s, f) => s + f.contrast,    0) / allFeatures.length,
      correlation: allFeatures.reduce((s, f) => s + f.correlation, 0) / allFeatures.length,
      energy:      allFeatures.reduce((s, f) => s + f.energy,      0) / allFeatures.length,
      homogeneity: allFeatures.reduce((s, f) => s + f.homogeneity, 0) / allFeatures.length,
    };
  }

  /**
   * Build GLCM matrix for a given angle and distance.
   * This is the core computation - computes co-occurrence
   * of pixel value i at position (r,c) with pixel value j
   * at position (r+dy, c+dx).
   */
  private buildGLCM(
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
            glcm[j][i]++; // Symmetric
          }
        }
      }
    }

    // Normalize
    let sum = 0;
    for (let i = 0; i < levels; i++)
      for (let j = 0; j < levels; j++) sum += glcm[i][j];
    if (sum > 0) {
      for (let i = 0; i < levels; i++)
        for (let j = 0; j < levels; j++) glcm[i][j] /= sum;
    }

    return glcm;
  }

  /**
   * Extract Haralick features from a normalized GLCM.
   */
  private extractFeatures(glcm: number[][], levels: number): GLCMFeatures {
    let contrast = 0;
    let energy = 0;
    let homogeneity = 0;
    let meanI = 0, meanJ = 0, stdI = 0, stdJ = 0, correlation = 0;

    // Marginal means
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

    // Marginal stds
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
        if (stdI > 0 && stdJ > 0) {
          correlation += ((i - meanI) * (j - meanJ) * p) / (stdI * stdJ);
        }
      }
    }

    return { contrast, correlation, energy, homogeneity };
  }
}

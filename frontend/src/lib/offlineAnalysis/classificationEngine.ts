/**
 * Browser port of backend/src/services/ClassificationService.ts
 *
 * Pure rule-based classification against NMIS freshness standards.
 * Zero dependencies — runs entirely offline.
 */

import type { LabValues } from "./colorAnalysis";
import type { GLCMFeatures } from "./textureAnalysis";

export type FreshnessClass = "fresh" | "acceptable" | "warning" | "spoiled";

export interface ClassificationResult {
  classification: FreshnessClass;
  confidence_score: number;
  flagged_deviations: string[];
  explanation: string;
}

interface MeatStandard {
  lab: { l: [number, number]; a: [number, number]; b: [number, number] };
  glcm: { contrast: [number, number]; energy: [number, number]; homogeneity: [number, number] };
}

const STANDARDS: Record<string, Record<FreshnessClass, MeatStandard>> = {
  pork: {
    fresh:      { lab: { l: [40,60],  a: [15,30], b: [8,20]  }, glcm: { contrast: [0,20],   energy: [0.3,1.0], homogeneity: [0.7,1.0]  } },
    acceptable: { lab: { l: [35,65],  a: [10,35], b: [5,25]  }, glcm: { contrast: [10,35],  energy: [0.2,0.6], homogeneity: [0.5,0.85] } },
    warning:    { lab: { l: [30,70],  a: [5,40],  b: [3,30]  }, glcm: { contrast: [25,50],  energy: [0.1,0.35],homogeneity: [0.3,0.65] } },
    spoiled:    { lab: { l: [20,75],  a: [0,45],  b: [0,35]  }, glcm: { contrast: [35,100], energy: [0,0.2],   homogeneity: [0,0.45]   } },
  },
  beef: {
    fresh:      { lab: { l: [35,55],  a: [20,35], b: [10,22] }, glcm: { contrast: [0,18],   energy: [0.3,1.0], homogeneity: [0.7,1.0]  } },
    acceptable: { lab: { l: [30,60],  a: [12,38], b: [6,28]  }, glcm: { contrast: [8,30],   energy: [0.2,0.6], homogeneity: [0.5,0.85] } },
    warning:    { lab: { l: [25,65],  a: [5,42],  b: [3,32]  }, glcm: { contrast: [20,50],  energy: [0.1,0.35],homogeneity: [0.3,0.65] } },
    spoiled:    { lab: { l: [15,70],  a: [0,48],  b: [0,38]  }, glcm: { contrast: [35,100], energy: [0,0.2],   homogeneity: [0,0.45]   } },
  },
  chicken: {
    fresh:      { lab: { l: [55,75],  a: [5,15],  b: [15,30] }, glcm: { contrast: [0,15],   energy: [0.35,1.0],homogeneity: [0.75,1.0] } },
    acceptable: { lab: { l: [45,80],  a: [3,20],  b: [10,35] }, glcm: { contrast: [8,28],   energy: [0.2,0.6], homogeneity: [0.55,0.85]} },
    warning:    { lab: { l: [40,82],  a: [0,25],  b: [5,40]  }, glcm: { contrast: [20,45],  energy: [0.1,0.35],homogeneity: [0.35,0.65]} },
    spoiled:    { lab: { l: [30,85],  a: [0,30],  b: [0,45]  }, glcm: { contrast: [30,100], energy: [0,0.2],   homogeneity: [0,0.5]    } },
  },
  fish: {
    fresh:      { lab: { l: [50,70],  a: [2,12],  b: [5,18]  }, glcm: { contrast: [0,12],   energy: [0.35,1.0],homogeneity: [0.8,1.0]  } },
    acceptable: { lab: { l: [40,75],  a: [0,18],  b: [3,25]  }, glcm: { contrast: [6,25],   energy: [0.2,0.6], homogeneity: [0.6,0.9]  } },
    warning:    { lab: { l: [35,78],  a: [0,22],  b: [0,30]  }, glcm: { contrast: [18,45],  energy: [0.1,0.35],homogeneity: [0.35,0.7] } },
    spoiled:    { lab: { l: [25,80],  a: [0,28],  b: [0,35]  }, glcm: { contrast: [30,100], energy: [0,0.2],   homogeneity: [0,0.5]    } },
  },
};

function inRange(value: number, range: [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}

function generateExplanation(
  cls: FreshnessClass,
  meatType: string,
  deviations: string[],
  source: string
): string {
  const descriptions: Record<FreshnessClass, string> = {
    fresh: `${meatType} sample shows characteristics consistent with fresh meat per NMIS standards. Lab* color values indicate healthy pigmentation with adequate myoglobin oxygenation. GLCM texture analysis shows uniform surface consistent with firm, fresh tissue.`,
    acceptable: `${meatType} sample falls within acceptable range but shows minor deviations from ideal freshness. Color values suggest early-stage changes in myoglobin state. Texture remains largely uniform.`,
    warning: `${meatType} sample shows concerning indicators. Color analysis reveals significant deviation from NMIS freshness standards, potentially indicating onset of metmyoglobin formation. Surface texture shows increasing irregularity.`,
    spoiled: `${meatType} sample exhibits strong indicators of spoilage. Lab* values indicate advanced discoloration consistent with bacterial decomposition. GLCM features show significant surface degradation and moisture abnormalities.`,
  };

  let text = descriptions[cls];
  if (deviations.length > 0)
    text += ` ${deviations.length} deviation(s) flagged from fresh baseline standards.`;
  text += ` (${source})`;
  return text;
}

/**
 * Classify meat freshness from extracted Lab* and GLCM features.
 * Mirrors ClassificationService.classify() on the backend.
 */
export function classify(
  lab: LabValues,
  glcm: GLCMFeatures,
  meatType: string,
  source = "offline analysis"
): ClassificationResult {
  const typeStd = STANDARDS[meatType] ?? STANDARDS["pork"];
  const classes: FreshnessClass[] = ["fresh", "acceptable", "warning", "spoiled"];
  const scores: Record<FreshnessClass, number> = { fresh: 0, acceptable: 0, warning: 0, spoiled: 0 };

  for (const cls of classes) {
    const std = typeStd[cls];
    let match = 0;
    if (inRange(lab.l, std.lab.l)) match++;
    if (inRange(lab.a, std.lab.a)) match++;
    if (inRange(lab.b, std.lab.b)) match++;
    if (inRange(glcm.contrast, std.glcm.contrast)) match++;
    if (inRange(glcm.energy, std.glcm.energy)) match++;
    if (inRange(glcm.homogeneity, std.glcm.homogeneity)) match++;
    scores[cls] = (match / 6) * 100;
  }

  let bestClass: FreshnessClass = "acceptable";
  let bestScore = 0;
  for (const cls of classes) {
    if (scores[cls] > bestScore) {
      bestScore = scores[cls];
      bestClass = cls;
    }
  }

  const freshStd = typeStd["fresh"];
  const deviations: string[] = [];
  if (!inRange(lab.a, freshStd.lab.a))
    deviations.push(`Lab* a-channel (${lab.a.toFixed(2)}) outside fresh range [${freshStd.lab.a[0]}-${freshStd.lab.a[1]}]`);
  if (!inRange(lab.l, freshStd.lab.l))
    deviations.push(`Lightness L* (${lab.l.toFixed(2)}) outside fresh range [${freshStd.lab.l[0]}-${freshStd.lab.l[1]}]`);
  if (!inRange(glcm.homogeneity, freshStd.glcm.homogeneity))
    deviations.push(`Texture homogeneity (${glcm.homogeneity.toFixed(4)}) below expected threshold`);
  if (!inRange(glcm.energy, freshStd.glcm.energy))
    deviations.push(`Texture energy (${glcm.energy.toFixed(4)}) indicates surface irregularity`);

  return {
    classification: bestClass,
    confidence_score: Math.round(bestScore),
    flagged_deviations: deviations,
    explanation: generateExplanation(bestClass, meatType, deviations, source),
  };
}

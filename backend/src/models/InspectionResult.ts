export interface InspectionResultData {
  classification: "fresh" | "acceptable" | "warning" | "spoiled";
  confidence_score: number;
  lab_values: { l: number; a: number; b: number };
  glcm_features: {
    contrast: number;
    correlation: number;
    energy: number;
    homogeneity: number;
  };
  flagged_deviations: string[];
  explanation: string;
}

export class InspectionResult {
  readonly classification: string;
  readonly confidence_score: number;
  readonly lab_values: { l: number; a: number; b: number };
  readonly glcm_features: {
    contrast: number;
    correlation: number;
    energy: number;
    homogeneity: number;
  };
  readonly flagged_deviations: string[];
  readonly explanation: string;

  constructor(data: InspectionResultData) {
    this.classification = data.classification;
    this.confidence_score = data.confidence_score;
    this.lab_values = data.lab_values;
    this.glcm_features = data.glcm_features;
    this.flagged_deviations = data.flagged_deviations;
    this.explanation = data.explanation;
  }

  toJSON(): InspectionResultData {
    return {
      classification: this.classification as InspectionResultData["classification"],
      confidence_score: this.confidence_score,
      lab_values: this.lab_values,
      glcm_features: this.glcm_features,
      flagged_deviations: this.flagged_deviations,
      explanation: this.explanation,
    };
  }
}

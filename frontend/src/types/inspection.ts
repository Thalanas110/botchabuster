export type FreshnessClassification = 'fresh' | 'not fresh' | 'spoiled' | 'acceptable' | 'warning';
export type MeatType = 'pork' | 'beef' | 'chicken' | 'fish' | 'other';

export interface Inspection {
  id: string;
  user_id: string | null;
  meat_type: MeatType;
  classification: FreshnessClassification;
  confidence_score: number;
  lab_l: number | null;
  lab_a: number | null;
  lab_b: number | null;
  glcm_contrast: number | null;
  glcm_correlation: number | null;
  glcm_energy: number | null;
  glcm_homogeneity: number | null;
  flagged_deviations: string[];
  explanation: string | null;
  image_url: string | null;
  location: string | null;
  inspector_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionInsert {
  meat_type: MeatType;
  classification: FreshnessClassification;
  confidence_score: number;
  client_submission_id: string;
  lab_l?: number | null;
  lab_a?: number | null;
  lab_b?: number | null;
  glcm_contrast?: number | null;
  glcm_correlation?: number | null;
  glcm_energy?: number | null;
  glcm_homogeneity?: number | null;
  flagged_deviations?: string[];
  explanation?: string | null;
  image_url?: string | null;
  location?: string | null;
  inspector_notes?: string | null;
  user_id?: string | null;
}

export interface AnalysisResult {
  classification: FreshnessClassification;
  confidence_score: number;
  model_confidence_score?: number | null;
  rule_confidence_score?: number | null;
  freshness_score?: number | null;
  recommendation?: "Good for Consumption" | "Consume Immediately" | "Not Suitable" | null;
  probabilities?: Partial<Record<FreshnessClassification, number>>;
  label_order?: FreshnessClassification[];
  lab_values: { l: number; a: number; b: number };
  glcm_features: {
    contrast: number;
    correlation: number;
    energy: number;
    homogeneity: number;
  };
  flagged_deviations: string[];
  explanation: string;
  analysis_source?: "resnet50+rules" | "rules-only" | "backend";
  model_path?: string | null;
}

export interface ApiConfig {
  backendUrl: string;
}

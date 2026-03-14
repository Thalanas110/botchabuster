export type FreshnessClassification = 'fresh' | 'acceptable' | 'warning' | 'spoiled';
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

export interface ApiConfig {
  backendUrl: string;
}

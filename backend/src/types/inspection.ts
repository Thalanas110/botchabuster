export interface Inspection {
  id: string;
  user_id: string;
  meat_type: string;
  classification: "fresh" | "not fresh" | "spoiled" | "acceptable" | "warning";
  confidence_score: number;
  lab_l: number;
  lab_a: number;
  lab_b: number;
  glcm_contrast: number;
  glcm_correlation: number;
  glcm_energy: number;
  glcm_homogeneity: number;
  flagged_deviations: string[];
  explanation: string | null;
  image_url: string | null;
  location: string | null;
  inspector_notes: string | null;
  client_submission_id: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionInsert {
  user_id: string;
  meat_type: string;
  classification: "fresh" | "not fresh" | "spoiled" | "acceptable" | "warning";
  confidence_score: number;
  lab_l: number;
  lab_a: number;
  lab_b: number;
  glcm_contrast: number;
  glcm_correlation: number;
  glcm_energy: number;
  glcm_homogeneity: number;
  flagged_deviations?: string[];
  explanation?: string | null;
  image_url?: string | null;
  location?: string | null;
  inspector_notes?: string | null;
  captured_at?: string;
  client_submission_id: string;
}

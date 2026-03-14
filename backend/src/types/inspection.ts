export interface Inspection {
  id: string;
  user_id: string;
  meat_type: string;
  classification: "fresh" | "acceptable" | "warning" | "spoiled";
  confidence_score: number;
  lab_l: number;
  lab_a: number;
  lab_b: number;
  glcm_contrast: number;
  glcm_correlation: number;
  glcm_energy: number;
  glcm_homogeneity: number;
  created_at: string;
  updated_at: string;
}

export interface InspectionInsert {
  user_id: string;
  meat_type: string;
  classification: "fresh" | "acceptable" | "warning" | "spoiled";
  confidence_score: number;
  lab_l: number;
  lab_a: number;
  lab_b: number;
  glcm_contrast: number;
  glcm_correlation: number;
  glcm_energy: number;
  glcm_homogeneity: number;
}

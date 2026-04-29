/**
 * Demo / presentation mode.
 * Set VITE_DEMO_MODE=true in your .env to enable.
 * All API calls are short-circuited and return realistic mock data.
 */

import type { AuthUser, AuthSession } from "@/integrations/api/AuthClient";
import type { Profile } from "@/integrations/api/ProfileClient";
import type { Inspection, AnalysisResult } from "@/types/inspection";
import type { LandingPageStats } from "@/integrations/api/StatsClient";

export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

/** Simulates a realistic network delay */
export function demoDelay<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ---------------------------------------------------------------------------
// Demo user / session
// ---------------------------------------------------------------------------

export const DEMO_USER: AuthUser = {
  id: "demo-user-001",
  email: "demo@botchabuster.com",
};

export const DEMO_SESSION: AuthSession = {
  access_token: "demo-token",
  refresh_token: null,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

export const DEMO_PROFILE: Profile = {
  id: "demo-user-001",
  full_name: "Demo Inspector",
  avatar_url: null,
  inspector_code: "DEMO01",
  is_dark_mode: false,
  show_detailed_results: true,
  email: "demo@botchabuster.com",
  location: "Metro Manila, PH",
  created_at: "2026-01-15T08:00:00Z",
  updated_at: "2026-04-28T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Mock inspections
// ---------------------------------------------------------------------------

const BASE = new Date("2026-04-28T10:00:00Z").getTime();
const daysAgo = (d: number) => new Date(BASE - d * 86_400_000).toISOString();

export const DEMO_INSPECTIONS: Inspection[] = [
  {
    id: "demo-insp-001",
    user_id: "demo-user-001",
    meat_type: "chicken",
    classification: "fresh",
    confidence_score: 95,
    lab_l: 74.1, lab_a: -0.8, lab_b: 9.2,
    glcm_contrast: 0.031, glcm_correlation: 0.989, glcm_energy: 0.22, glcm_homogeneity: 0.96,
    flagged_deviations: [],
    explanation: "Excellent freshness. Color and texture profile within optimal range.",
    image_url: null,
    location: "Section A – Stall 3",
    inspector_notes: null,
    created_at: daysAgo(0),
    updated_at: daysAgo(0),
  },
  {
    id: "demo-insp-002",
    user_id: "demo-user-001",
    meat_type: "pork",
    classification: "acceptable",
    confidence_score: 81,
    lab_l: 65.4, lab_a: 8.1, lab_b: 12.3,
    glcm_contrast: 0.048, glcm_correlation: 0.972, glcm_energy: 0.19, glcm_homogeneity: 0.91,
    flagged_deviations: ["Slight color deviation"],
    explanation: "Sample is within acceptable freshness bounds. Minor color variation detected.",
    image_url: null,
    location: "Section B – Stall 1",
    inspector_notes: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: "demo-insp-003",
    user_id: "demo-user-001",
    meat_type: "beef",
    classification: "fresh",
    confidence_score: 93,
    lab_l: 41.2, lab_a: 19.5, lab_b: 11.8,
    glcm_contrast: 0.029, glcm_correlation: 0.991, glcm_energy: 0.24, glcm_homogeneity: 0.97,
    flagged_deviations: [],
    explanation: "Prime freshness. Vibrant red color with consistent texture.",
    image_url: null,
    location: "Section A – Stall 1",
    inspector_notes: "High quality cut",
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: "demo-insp-004",
    user_id: "demo-user-001",
    meat_type: "fish",
    classification: "warning",
    confidence_score: 72,
    lab_l: 78.3, lab_a: 2.1, lab_b: 4.6,
    glcm_contrast: 0.092, glcm_correlation: 0.941, glcm_energy: 0.14, glcm_homogeneity: 0.84,
    flagged_deviations: ["Elevated contrast variance", "Color outside typical range"],
    explanation: "Freshness is borderline. Recommend immediate sale or discard.",
    image_url: null,
    location: "Section C – Stall 2",
    inspector_notes: "Arrived late delivery",
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  {
    id: "demo-insp-005",
    user_id: "demo-user-001",
    meat_type: "chicken",
    classification: "spoiled",
    confidence_score: 97,
    lab_l: 56.8, lab_a: 4.3, lab_b: 15.1,
    glcm_contrast: 0.187, glcm_correlation: 0.862, glcm_energy: 0.08, glcm_homogeneity: 0.73,
    flagged_deviations: ["High contrast variance", "Color severely outside range", "Texture degradation"],
    explanation: "Sample shows clear signs of spoilage. Do not sell.",
    image_url: null,
    location: "Section A – Stall 5",
    inspector_notes: "Pulled from shelf",
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
  },
  {
    id: "demo-insp-006",
    user_id: "demo-user-001",
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 91,
    lab_l: 67.9, lab_a: 9.4, lab_b: 11.6,
    glcm_contrast: 0.033, glcm_correlation: 0.988, glcm_energy: 0.21, glcm_homogeneity: 0.95,
    flagged_deviations: [],
    explanation: "Fresh pork sample with excellent color and texture indicators.",
    image_url: null,
    location: "Section B – Stall 3",
    inspector_notes: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
  },
  {
    id: "demo-insp-007",
    user_id: "demo-user-001",
    meat_type: "beef",
    classification: "acceptable",
    confidence_score: 78,
    lab_l: 40.1, lab_a: 17.2, lab_b: 10.5,
    glcm_contrast: 0.055, glcm_correlation: 0.967, glcm_energy: 0.17, glcm_homogeneity: 0.89,
    flagged_deviations: ["Minor texture irregularity"],
    explanation: "Acceptable quality. Sell within 24 hours.",
    image_url: null,
    location: "Section A – Stall 2",
    inspector_notes: null,
    created_at: daysAgo(6),
    updated_at: daysAgo(6),
  },
  {
    id: "demo-insp-008",
    user_id: "demo-user-001",
    meat_type: "fish",
    classification: "fresh",
    confidence_score: 89,
    lab_l: 80.2, lab_a: -2.1, lab_b: 5.3,
    glcm_contrast: 0.027, glcm_correlation: 0.993, glcm_energy: 0.26, glcm_homogeneity: 0.98,
    flagged_deviations: [],
    explanation: "Very fresh. Recommended for immediate display.",
    image_url: null,
    location: "Section C – Stall 1",
    inspector_notes: "Morning delivery",
    created_at: daysAgo(7),
    updated_at: daysAgo(7),
  },
  {
    id: "demo-insp-009",
    user_id: "demo-user-001",
    meat_type: "chicken",
    classification: "warning",
    confidence_score: 69,
    lab_l: 60.1, lab_a: 5.6, lab_b: 13.8,
    glcm_contrast: 0.081, glcm_correlation: 0.951, glcm_energy: 0.15, glcm_homogeneity: 0.86,
    flagged_deviations: ["Color approaching threshold"],
    explanation: "Borderline freshness. Monitor closely and sell within hours.",
    image_url: null,
    location: "Section A – Stall 4",
    inspector_notes: null,
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
  },
  {
    id: "demo-insp-010",
    user_id: "demo-user-001",
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 0.94,
    lab_l: 69.3, lab_a: 10.1, lab_b: 12.9,
    glcm_contrast: 0.029, glcm_correlation: 0.990, glcm_energy: 0.23, glcm_homogeneity: 0.96,
    flagged_deviations: [],
    explanation: "Fresh and high quality. Good color and texture metrics.",
    image_url: null,
    location: "Section B – Stall 2",
    inspector_notes: null,
    created_at: daysAgo(14),
    updated_at: daysAgo(14),
  },
];

export const DEMO_STATS = {
  total: DEMO_INSPECTIONS.length,
  byClassification: {
    fresh: DEMO_INSPECTIONS.filter((i) => i.classification === "fresh").length,
    acceptable: DEMO_INSPECTIONS.filter((i) => i.classification === "acceptable").length,
    warning: DEMO_INSPECTIONS.filter((i) => i.classification === "warning").length,
    spoiled: DEMO_INSPECTIONS.filter((i) => i.classification === "spoiled").length,
  },
};

// ---------------------------------------------------------------------------
// Mock analysis result (returned when "Analyze" is pressed in demo mode)
// ---------------------------------------------------------------------------

export const DEMO_ANALYSIS_RESULT: AnalysisResult = {
  classification: "fresh",
  confidence_score: 0.93,
  lab_values: { l: 72.3, a: -1.2, b: 8.5 },
  glcm_features: { contrast: 0.034, correlation: 0.987, energy: 0.21, homogeneity: 0.94 },
  flagged_deviations: [],
  explanation:
    "Sample shows strong freshness indicators with optimal color profile and uniform texture.",
};

// ---------------------------------------------------------------------------
// Landing page stats
// ---------------------------------------------------------------------------

export const DEMO_LANDING_STATS: LandingPageStats = {
  inspectionCount: 1247,
  userCount: 38,
  freshRate: 72,
};

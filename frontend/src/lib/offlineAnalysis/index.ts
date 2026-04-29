/**
 * Offline analysis orchestrator.
 *
 * Runs the full freshness analysis pipeline inside the browser:
 *   1. Extract CIE L*a*b* color features   (Canvas API, pure JS)
 *   2. Compute GLCM texture features        (Canvas API, pure JS)
 *   3. Rule-based NMIS classification       (ported from backend)
 *   4. MobileNetV3-Small neural classifier  (TF.js, optional / lazy)
 *
 * Steps 1–3 are always available offline.
 * Step 4 augments the result when the model is loaded (cached in IndexedDB
 * after first network load).
 *
 * Returns an AnalysisResult with the same shape as the backend endpoint so
 * callers (Index.tsx, OfflineSyncManager) need no changes.
 */

import type { AnalysisResult } from "@/types/inspection";
import { extractLabValues } from "./colorAnalysis";
import { computeGLCMFeatures } from "./textureAnalysis";
import { classify } from "./classificationEngine";
import { classifyWithMobileNetV3, loadMobileNetV3, isModelReady } from "./mobileNetV3";
import { loadCalibration } from "./calibrationStore";

export { prewarmModel } from "./mobileNetV3";
export { calibrateFromImage } from "./calibration";
export { loadCalibration, saveCalibration, calibrationTTLMs } from "./calibrationStore";

/**
 * Run full offline analysis on the captured image file.
 *
 * The model is tried but never awaited in a blocking way — if it isn't
 * loaded yet the rule-based result is returned immediately.
 */
export async function analyzeOffline(
  imageFile: File,
  meatType: string
): Promise<AnalysisResult> {
  // Load calibration from IndexedDB (null if none / expired)
  const calibration = await loadCalibration();
  const calibMatrix = calibration?.correctionMatrix;

  // Run color + texture extraction in parallel (both hit the Canvas, no conflict)
  const [labValues, glcmFeatures] = await Promise.all([
    extractLabValues(imageFile, calibMatrix),
    computeGLCMFeatures(imageFile),
  ]);

  // Try to use the MobileNetV3 model if it has already been loaded
  let modelResult: { classification: AnalysisResult["classification"]; confidence: number } | null = null;
  if (isModelReady()) {
    modelResult = await classifyWithMobileNetV3(imageFile);
  } else {
    // Non-blocking background attempt — won't affect this call's result
    // but primes the cache for the next offline session
    void loadMobileNetV3();
  }

  // Rule-based classification (always available)
  const ruleResult = classify(
    labValues,
    glcmFeatures,
    meatType,
    modelResult ? "offline analysis — neural + rules" : "offline analysis — rules only"
  );

  // ── Ensemble: combine neural + rule-based when both are available ──────────
  let finalClassification = ruleResult.classification;
  let finalConfidence = ruleResult.confidence_score;

  if (modelResult) {
    if (modelResult.classification === ruleResult.classification) {
      // Agreement → boost confidence slightly
      finalConfidence = Math.min(99, Math.round(0.55 * modelResult.confidence + 0.45 * finalConfidence));
    } else {
      // Disagreement → use the higher-confidence source but dampen the score
      if (modelResult.confidence > finalConfidence) {
        finalClassification = modelResult.classification;
        finalConfidence = Math.round(modelResult.confidence * 0.75);
      } else {
        finalConfidence = Math.round(finalConfidence * 0.75);
      }
    }
  }

  return {
    classification: finalClassification,
    confidence_score: finalConfidence,
    lab_values: labValues,
    glcm_features: glcmFeatures,
    flagged_deviations: ruleResult.flagged_deviations,
    explanation: ruleResult.explanation,
  };
}

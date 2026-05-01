/**
 * Offline analysis orchestrator.
 *
 * Runs the full freshness analysis pipeline inside the browser:
 *   1. Extract CIE L*a*b* color features   (Canvas API, pure JS)
 *   2. Compute GLCM texture features        (Canvas API, pure JS)
 *   3. Rule-based NMIS classification       (ported from backend)
 *   4. ResNet50 neural classifier           (ONNX Runtime Web, optional / lazy)
 *
 * Steps 1-3 are always available offline.
 * Step 4 augments the result when the model is loaded.
 *
 * Returns an AnalysisResult with the same shape as the backend endpoint so
 * callers (Index.tsx, OfflineSyncManager) need no changes.
 */

import type { AnalysisResult } from "@/types/inspection";
import { extractLabValues } from "./colorAnalysis";
import { computeGLCMFeatures } from "./textureAnalysis";
import { classify } from "./classificationEngine";
import { classifyWithResNet50, loadResNet50Model, isModelReady, getLoadedModelPath } from "./resNet50Onnx";
import { loadCalibration } from "./calibrationStore";

export { prewarmModel } from "./resNet50Onnx";
export { calibrateFromImage } from "./calibration";
export { loadCalibration, saveCalibration, calibrationTTLMs } from "./calibrationStore";

const MODEL_LOAD_WAIT_ONLINE_MS = 45000;
const MODEL_LOAD_WAIT_OFFLINE_MS = 2500;
const MODEL_LOAD_ATTEMPT_INTERVAL_MS = 1200;

async function waitForModelLoad(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const loaded = await loadResNet50Model({ forceRetry: true });
    if (loaded || isModelReady()) {
      return true;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await new Promise<void>((resolve) =>
      window.setTimeout(resolve, Math.min(MODEL_LOAD_ATTEMPT_INTERVAL_MS, remainingMs))
    );
  }

  return isModelReady();
}

/**
 * Run full offline analysis on the captured image file.
 *
 * The model is given a short load window; if it is still unavailable,
 * the rule-based result is returned.
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

  // Try to use the ResNet50 model if it has already been loaded.
  let modelResult: { classification: AnalysisResult["classification"]; confidence: number } | null = null;
  if (isModelReady()) {
    modelResult = await classifyWithResNet50(imageFile);
  } else {
    // Give the model a short chance to load so first-use scans can benefit.
    const loadWaitMs = navigator.onLine ? MODEL_LOAD_WAIT_ONLINE_MS : MODEL_LOAD_WAIT_OFFLINE_MS;
    const loadedInTime = await waitForModelLoad(loadWaitMs);
    if (loadedInTime && isModelReady()) {
      modelResult = await classifyWithResNet50(imageFile);
    }
  }

  if (navigator.onLine && !modelResult) {
    throw new Error("ResNet50 model inference is required for online analysis.");
  }

  // Rule-based classification (always available).
  const ruleResult = classify(
    labValues,
    glcmFeatures,
    meatType,
    modelResult ? "offline analysis - neural + rules" : "offline analysis - rules only"
  );

  // Ensemble: combine neural + rule-based when both are available.
  let finalClassification = ruleResult.classification;
  let finalConfidence = ruleResult.confidence_score;

  if (modelResult) {
    if (modelResult.classification === ruleResult.classification) {
      // Agreement: confidence should be predominantly model-driven.
      finalConfidence = Math.min(99, Math.round(0.85 * modelResult.confidence + 0.15 * finalConfidence));
    } else {
      // Disagreement: keep class selection conservative, but keep confidence
      // mostly model-derived to avoid coarse rule-only buckets like 67%.
      if (modelResult.confidence > finalConfidence) {
        finalClassification = modelResult.classification;
      }
      finalConfidence = Math.round(0.8 * modelResult.confidence + 0.2 * finalConfidence);
    }
  }

  return {
    classification: finalClassification,
    confidence_score: finalConfidence,
    model_confidence_score: modelResult?.confidence ?? null,
    rule_confidence_score: ruleResult.confidence_score,
    lab_values: labValues,
    glcm_features: glcmFeatures,
    flagged_deviations: ruleResult.flagged_deviations,
    explanation: ruleResult.explanation,
    analysis_source: modelResult ? "resnet50+rules" : "rules-only",
    model_path: getLoadedModelPath(),
  };
}

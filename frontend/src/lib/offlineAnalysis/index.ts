/**
 * Offline analysis orchestrator.
 *
 * Runs the full freshness analysis pipeline inside the browser:
 *   1. Extract CIE L*a*b* color features   (Canvas API, pure JS)
 *   2. Compute GLCM texture features        (Canvas API, pure JS)
 *   3. Rule-based NMIS classification       (ported from backend)
 *   4. ONNX classifier                      (metadata-driven preprocessing)
 *
 * Steps 1-3 are always available offline.
 * Step 4 augments the result when the model is loaded.
 *
 * Returns an AnalysisResult with the same shape as the backend endpoint so
 * callers (Index.tsx, OfflineSyncManager) need no breaking changes.
 */

import type { AnalysisResult } from "@/types/inspection";
import { extractLabValues } from "./colorAnalysis";
import { computeGLCMFeatures } from "./textureAnalysis";
import { classify } from "./classificationEngine";
import { classifyWithMobileNetV3, loadMobileNetV3, isModelReady, getLoadedModelPath } from "./mobileNetV3";
import {
  classifyRecommendation,
  computeFreshnessScore,
  createCroppedResizedImageFile,
  DEFAULT_MEATLENS_INPUT_SIZE,
  type SquareGuideBox,
} from "./meatLensPipeline";
import { loadCalibration } from "./calibrationStore";

export { prewarmModel } from "./mobileNetV3";
export { calibrateFromImage } from "./calibration";
export { loadCalibration, saveCalibration, calibrationTTLMs } from "./calibrationStore";

const MODEL_LOAD_WAIT_ONLINE_MS = 45_000;
const MODEL_LOAD_WAIT_OFFLINE_MS = 2_500;
const MODEL_LOAD_ATTEMPT_INTERVAL_MS = 1_200;
const ANALYSIS_INPUT_SIZE = DEFAULT_MEATLENS_INPUT_SIZE;

interface AnalyzeOfflineOptions {
  guideBox?: SquareGuideBox | null;
}

async function waitForModelLoad(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const loaded = await loadMobileNetV3({ forceRetry: true });
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
  meatType: string,
  options: AnalyzeOfflineOptions = {}
): Promise<AnalysisResult> {
  // Deterministic preprocessing shared by camera and upload flows.
  const processedImageFile = await createCroppedResizedImageFile(imageFile, {
    guideBox: options.guideBox,
    size: ANALYSIS_INPUT_SIZE,
    mimeType: "image/jpeg",
    quality: 0.92,
  });

  // Load calibration from IndexedDB (null if none / expired)
  const calibration = await loadCalibration();
  const calibMatrix = calibration?.correctionMatrix;

  // Run color + texture extraction in parallel (both hit the Canvas, no conflict)
  const [labValues, glcmFeatures] = await Promise.all([
    extractLabValues(processedImageFile, calibMatrix),
    computeGLCMFeatures(processedImageFile),
  ]);

  // Try to use the ONNX model if it has already been loaded.
  let modelResult = null;
  if (isModelReady()) {
    modelResult = await classifyWithMobileNetV3(processedImageFile, { guideBox: null });
  } else {
    // Give the model a short chance to load so first-use scans can benefit.
    const loadWaitMs = navigator.onLine ? MODEL_LOAD_WAIT_ONLINE_MS : MODEL_LOAD_WAIT_OFFLINE_MS;
    const loadedInTime = await waitForModelLoad(loadWaitMs);
    if (loadedInTime && isModelReady()) {
      modelResult = await classifyWithMobileNetV3(processedImageFile, { guideBox: null });
    }
  }

  if (navigator.onLine && !modelResult) {
    throw new Error("Model inference is required for online analysis.");
  }

  // Rule-based classification (always available) for detailed explanation metadata.
  const ruleResult = classify(
    labValues,
    glcmFeatures,
    meatType,
    modelResult ? "offline analysis - model + rules" : "offline analysis - rules only"
  );

  if (modelResult) {
    const explanation = `${ruleResult.explanation} Freshness score is rule-based from model confidence and is not a direct biochemical measurement.`;

    return {
      classification: modelResult.classification,
      confidence_score: modelResult.confidence,
      model_confidence_score: modelResult.confidence,
      rule_confidence_score: ruleResult.confidence_score,
      freshness_score: Math.round(modelResult.freshnessScore),
      recommendation: modelResult.recommendation,
      probabilities: modelResult.probabilities,
      label_order: modelResult.labelOrder,
      lab_values: labValues,
      glcm_features: glcmFeatures,
      flagged_deviations: ruleResult.flagged_deviations,
      explanation,
      analysis_source: "mobilenetv3+rules",
      model_path: getLoadedModelPath(),
    };
  }

  // Rule-only fallback uses confidence as a pseudo probability to preserve output shape.
  const ruleConfidenceAsProbability = Math.max(0, Math.min(1, ruleResult.confidence_score / 100));
  const fallbackScore = computeFreshnessScore(ruleResult.classification, ruleConfidenceAsProbability);

  return {
    classification: ruleResult.classification,
    confidence_score: ruleResult.confidence_score,
    model_confidence_score: null,
    rule_confidence_score: ruleResult.confidence_score,
    freshness_score: Math.round(fallbackScore),
    recommendation: classifyRecommendation(fallbackScore),
    lab_values: labValues,
    glcm_features: glcmFeatures,
    flagged_deviations: ruleResult.flagged_deviations,
    explanation: `${ruleResult.explanation} Freshness score is rule-based from confidence and is not a direct biochemical measurement.`,
    analysis_source: "rules-only",
    model_path: getLoadedModelPath(),
  };
}

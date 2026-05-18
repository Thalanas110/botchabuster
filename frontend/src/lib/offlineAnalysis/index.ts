/**
 * Offline analysis orchestrator.
 *
 * Runs freshness analysis inside the browser using the ONNX classifier.
 * The model is the primary and only classification source.
 *
 * Returns an AnalysisResult aligned with backend fields used by the app.
 */

import type { AnalysisResult, FreshnessClassification } from "@/types/inspection";
import { classifyWithMobileNetV3, loadMobileNetV3, isModelReady, getLoadedModelPath } from "./mobileNetV3";
import {
  classifyRecommendation,
  computeFreshnessScore,
  createCroppedResizedImageFile,
  DEFAULT_MEATLENS_INPUT_SIZE,
  type SquareGuideBox,
} from "./meatLensPipeline";

export { prewarmModel } from "./mobileNetV3";
export { calibrateFromImage } from "./calibration";
export { loadCalibration, saveCalibration, calibrationTTLMs } from "./calibrationStore";

const MODEL_LOAD_WAIT_ONLINE_MS = 45_000;
const MODEL_LOAD_WAIT_OFFLINE_MS = 2_500;
const MODEL_LOAD_ATTEMPT_INTERVAL_MS = 1_200;
const ANALYSIS_INPUT_SIZE = DEFAULT_MEATLENS_INPUT_SIZE;
const LOW_CONFIDENCE_WARNING_THRESHOLD = 90;
const RETAKE_RECOMMEND_THRESHOLD = 80;

interface AnalyzeOfflineOptions {
  guideBox?: SquareGuideBox | null;
}

function formatClassificationLabel(classification: FreshnessClassification): string {
  if (classification === "not fresh") {
    return "Not Fresh";
  }

  return classification.charAt(0).toUpperCase() + classification.slice(1);
}

function describeConfidenceBand(confidenceScore: number): string {
  if (confidenceScore >= LOW_CONFIDENCE_WARNING_THRESHOLD) {
    return "high confidence";
  }

  if (confidenceScore >= RETAKE_RECOMMEND_THRESHOLD) {
    return "moderate confidence";
  }

  if (confidenceScore >= 70) {
    return "cautious confidence";
  }

  return "low confidence";
}

function describeClassification(classification: FreshnessClassification): string {
  if (classification === "fresh") {
    return "Visual signals are aligned with the fresh reference profile for this model.";
  }

  if (classification === "acceptable") {
    return "The sample remains in an acceptable range, but early decline patterns are present.";
  }

  if (classification === "warning") {
    return "The model detected uncertain or declining freshness indicators, so closer inspector review is advised.";
  }

  if (classification === "not fresh") {
    return "The pattern suggests notable freshness loss and should be handled with caution.";
  }

  return "The output is consistent with advanced spoilage indicators and should be treated as high risk.";
}

function buildProbabilitySummary(
  probabilities: Partial<Record<FreshnessClassification, number>> | undefined,
  labelOrder: FreshnessClassification[] | undefined
): string | null {
  if (!probabilities) {
    return null;
  }

  const labels = labelOrder && labelOrder.length > 0
    ? labelOrder
    : (Object.keys(probabilities) as FreshnessClassification[]);

  const entries = labels
    .map((label) => ({ label, value: probabilities[label] }))
    .filter(
      (entry): entry is { label: FreshnessClassification; value: number } =>
        typeof entry.value === "number" && Number.isFinite(entry.value) && entry.value >= 0
    )
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);

  if (entries.length === 0) {
    return null;
  }

  return entries
    .map((entry) => `${formatClassificationLabel(entry.label)} ${Math.round(entry.value * 100)}%`)
    .join(", ");
}

function buildAnalysisExplanation({
  meatType,
  classification,
  confidenceScore,
  freshnessScore,
  recommendation,
  probabilities,
  labelOrder,
}: {
  meatType: string;
  classification: FreshnessClassification;
  confidenceScore: number;
  freshnessScore: number;
  recommendation: "Good for Consumption" | "Consume Immediately" | "Not Suitable";
  probabilities?: Partial<Record<FreshnessClassification, number>>;
  labelOrder?: FreshnessClassification[];
}): string {
  const probabilitySummary = buildProbabilitySummary(probabilities, labelOrder);
  const confidenceBand = describeConfidenceBand(confidenceScore);
  const formattedClass = formatClassificationLabel(classification);

  const sentences = [
    `The ${meatType} sample is classified as ${formattedClass} by MobileNetV3 ONNX with ${confidenceScore}% confidence (${confidenceBand}).`,
    probabilitySummary ? `Top class probabilities: ${probabilitySummary}.` : null,
    describeClassification(classification),
    `Computed freshness score is ${Math.round(freshnessScore)}/100, mapped to recommendation: ${recommendation}.`,
    confidenceScore < RETAKE_RECOMMEND_THRESHOLD
      ? "Confidence is below 80%, so retaking the photo with steadier framing and clearer lighting is strongly recommended before final action."
      : confidenceScore < LOW_CONFIDENCE_WARNING_THRESHOLD
      ? "Confidence is below 90%, so this output should be treated as warning-level and validated by inspector judgment."
      : "Confidence is at or above 90%, indicating a stable model decision under current capture conditions.",
    "This score is model-derived from image patterns and should be interpreted as decision support, not a direct biochemical measurement.",
  ];

  return sentences.filter(Boolean).join(" ");
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
 * analysis returns an error so callers can retry after warmup.
 */
export async function analyzeOffline(
  imageFile: File,
  meatType: string,
  options: AnalyzeOfflineOptions = {}
): Promise<AnalysisResult> {
  // Use the same deterministic path for camera and upload:
  // - camera: guide-box square crop
  // - upload: centered square fallback crop
  // Both are then resized to 224x224 before feature extraction / inference.
  const processedImageFile = await createCroppedResizedImageFile(imageFile, {
    guideBox: options.guideBox ?? null,
    size: ANALYSIS_INPUT_SIZE,
    mimeType: "image/png",
  });

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
  if (!modelResult) {
    throw new Error("Model inference is unavailable. Please retry after model warmup completes.");
  }

  const finalClassification: FreshnessClassification = modelResult.classification;
  const finalConfidenceScore = modelResult.confidence;
  const finalConfidenceProbability = Math.max(0, Math.min(1, finalConfidenceScore / 100));
  const finalFreshnessScore = computeFreshnessScore(finalClassification, finalConfidenceProbability);
  const finalRecommendation = classifyRecommendation(finalFreshnessScore);
  const explanation = buildAnalysisExplanation({
    meatType,
    classification: finalClassification,
    confidenceScore: finalConfidenceScore,
    freshnessScore: finalFreshnessScore,
    recommendation: finalRecommendation,
    probabilities: modelResult.probabilities,
    labelOrder: modelResult.labelOrder,
  });

  return {
    classification: finalClassification,
    confidence_score: finalConfidenceScore,
    model_confidence_score: modelResult.confidence,
    rule_confidence_score: null,
    freshness_score: Math.round(finalFreshnessScore),
    recommendation: finalRecommendation,
    probabilities: modelResult.probabilities,
    label_order: modelResult.labelOrder,
    flagged_deviations: [],
    explanation,
    analysis_source: "mobilenetv3",
    model_path: getLoadedModelPath(),
  };
}

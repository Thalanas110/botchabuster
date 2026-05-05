import type { FreshnessClassification } from "@/types/inspection";
import {
  buildImageTensorData,
  classifyRecommendation,
  computeFreshnessScore,
  normalizeClassificationLabel,
  normalizeModelProbabilities,
  parsePrediction,
  resolveInputSize,
  resolveOutputLabels,
  resolvePreprocessMode,
  resolveSquareCropRegion,
  type FreshnessRecommendation,
  type MeatLensModelMetadata,
  type SquareGuideBox,
} from "./meatLensPipeline";

const ENV_MODEL_PATH = (
  import.meta.env.VITE_ONNX_MODEL_PATH ?? ""
).trim();
const ENV_CLASS_LABELS = (
  import.meta.env.VITE_ONNX_CLASS_LABELS ?? ""
).trim();
const ENV_METADATA_PATH = (import.meta.env.VITE_MODEL_METADATA_PATH ?? "").trim();

function isMobileNetAssetPath(path: string): boolean {
  const normalized = path.toLowerCase();
  return (
    normalized.includes("mobilenet") ||
    normalized.includes("mobilenetv3") ||
    normalized.includes("meatlens_best_model")
  );
}

const ENV_MOBILE_MODEL_PATH =
  ENV_MODEL_PATH.length > 0 && isMobileNetAssetPath(ENV_MODEL_PATH)
    ? ENV_MODEL_PATH
    : "";
const ENV_MOBILE_METADATA_PATH =
  ENV_METADATA_PATH.length > 0 && isMobileNetAssetPath(ENV_METADATA_PATH)
    ? ENV_METADATA_PATH
    : "";

if (ENV_MODEL_PATH.length > 0 && !ENV_MOBILE_MODEL_PATH) {
  console.warn("[Model][ONNX] Ignoring VITE_ONNX_MODEL_PATH because it does not appear to be a MobileNetV3 asset.");
}

if (ENV_METADATA_PATH.length > 0 && !ENV_MOBILE_METADATA_PATH) {
  console.warn("[Model][ONNX] Ignoring VITE_MODEL_METADATA_PATH because it does not appear to be MobileNetV3 metadata.");
}

const MOBILE_MODEL_CANDIDATES = [
  "/model/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx",
  "/model/meatlens_mobilenetv3small_cnn_only.onnx",
  "/models/mobilenetv3_meat/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx",
  "/models/mobilenetv3_meat/meatlens_mobilenetv3small_cnn_only.onnx",
  "/models/mobilenetv3_meat/model.onnx",
];
const MODEL_CANDIDATE_PATHS = Array.from(
  new Set(
    [
      ...MOBILE_MODEL_CANDIDATES,
      ENV_MOBILE_MODEL_PATH,
    ].filter((path) => path.length > 0)
  )
);

const MODEL_METADATA_CANDIDATE_PATHS = [
  "/model/NEW-meatlens_best_model_metadata.json",
  "/model/NEW-meatlens_mobilenetv3small_cnn_only_metadata.json",
  "/model/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json",
  "/model/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json",
  "/models/mobilenetv3_meat/NEW-meatlens_best_model_metadata.json",
  "/models/mobilenetv3_meat/NEW-meatlens_mobilenetv3small_cnn_only_metadata.json",
  "/models/mobilenetv3_meat/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json",
  "/models/mobilenetv3_meat/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json",
  "/models/mobilenetv3_meat/meatlens_best_model_metadata.json",
  "/models/mobilenetv3_meat/meatlens_mobilenetv3small_cnn_only_metadata.json",
  "/models/mobilenetv3_meat/meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json",
  "/models/mobilenetv3_meat/meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json",
  "/model/meatlens_mobilenetv3small_metadata.json",
  ENV_MOBILE_METADATA_PATH,
  "/model/meatlens_best_model_metadata.json",
  "/models/meatlens_best_model_metadata.json",
].filter((path) => path.length > 0);

const FALLBACK_IMAGE_SIZE = 224;
const RETRY_INTERVAL_MS = 15_000;
const LEGACY_ALLOWED_LABELS = new Set<FreshnessClassification>([
  "fresh",
  "not fresh",
  "spoiled",
  "acceptable",
  "warning",
]);

const DEFAULT_MODEL_METADATA: MeatLensModelMetadata = {
  backbone: "MobileNetV3Small",
  preprocess_function_name: "mobilenet_v3.preprocess_input",
  input_size: FALLBACK_IMAGE_SIZE,
  image_crop_mode: "center_crop",
  label_order: ["fresh", "not fresh", "spoiled"],
};

// Keeps the import type-safe while still lazy-loading the runtime.
type OrtModule = typeof import("onnxruntime-web");
type OnnxSession = import("onnxruntime-web").InferenceSession;

interface InputLayout {
  inputName: string;
  channelsFirst: boolean;
  width: number;
  height: number;
}

interface NodeMetadataLike {
  shape?: ReadonlyArray<number | string>;
  dimensions?: unknown[];
  dims?: unknown[];
}

interface SessionMetadataShape {
  inputMetadata?: Record<string, NodeMetadataLike> | NodeMetadataLike[];
  outputMetadata?: Record<string, NodeMetadataLike> | NodeMetadataLike[];
}

export interface ModelPredictionResult {
  classification: FreshnessClassification;
  confidence: number;
  confidenceProbability: number;
  probabilities: Partial<Record<FreshnessClassification, number>>;
  freshnessScore: number;
  recommendation: FreshnessRecommendation;
  labelOrder: FreshnessClassification[];
  metadata: MeatLensModelMetadata;
}

interface LoadModelOptions {
  forceRetry?: boolean;
}

interface ClassifyWithModelOptions {
  guideBox?: SquareGuideBox | null;
}

let ortModule: OrtModule | null = null;
let session: OnnxSession | null = null;
let loadedModelPath: string | null = null;
let loadPromise: Promise<boolean> | null = null;
let metadataPromise: Promise<MeatLensModelMetadata> | null = null;
let nextRetryAt = 0;

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeDimension(value: unknown, fallback: number): number {
  if (isPositiveNumber(value)) {
    return Math.round(value);
  }
  if (typeof value === "bigint" && value > 0n) {
    return Number(value);
  }
  return fallback;
}

function resolveMetadataEntry(
  metadata: Record<string, NodeMetadataLike> | NodeMetadataLike[] | undefined,
  preferredName?: string
): NodeMetadataLike | undefined {
  if (!metadata) {
    return undefined;
  }

  if (Array.isArray(metadata)) {
    return metadata[0];
  }

  if (preferredName && metadata[preferredName]) {
    return metadata[preferredName];
  }

  const firstKey = Object.keys(metadata)[0];
  return firstKey ? metadata[firstKey] : undefined;
}

function resolveMetadataDims(metadata: NodeMetadataLike | undefined): ReadonlyArray<number | string> {
  if (!metadata) {
    return [];
  }

  if (Array.isArray(metadata.shape)) {
    return metadata.shape;
  }

  if (Array.isArray(metadata.dimensions)) {
    return metadata.dimensions as ReadonlyArray<number | string>;
  }

  if (Array.isArray(metadata.dims)) {
    return metadata.dims as ReadonlyArray<number | string>;
  }

  return [];
}

function deriveInputLayout(activeSession: OnnxSession, fallbackSize: number): InputLayout {
  const inputName = activeSession.inputNames?.[0];
  if (!inputName) {
    throw new Error("ONNX model has no input tensor.");
  }

  const sessionMetadata = activeSession as unknown as SessionMetadataShape;
  const inputMetadata = resolveMetadataEntry(sessionMetadata.inputMetadata, inputName);
  const dims = resolveMetadataDims(inputMetadata);

  if (!Array.isArray(dims) || dims.length < 4) {
    return {
      inputName,
      channelsFirst: true,
      width: fallbackSize,
      height: fallbackSize,
    };
  }

  const d1 = normalizeDimension(dims[1], fallbackSize);
  const d2 = normalizeDimension(dims[2], fallbackSize);
  const d3 = normalizeDimension(dims[3], fallbackSize);

  if (d1 === 3) {
    return { inputName, channelsFirst: true, height: d2, width: d3 };
  }

  if (d3 === 3) {
    return { inputName, channelsFirst: false, height: d1, width: d2 };
  }

  return {
    inputName,
    channelsFirst: true,
    width: d3,
    height: d2,
  };
}

function deriveOutputClassCount(activeSession: OnnxSession): number | null {
  const sessionMetadata = activeSession as unknown as SessionMetadataShape;
  const firstOutputName = activeSession.outputNames?.[0];
  const outputMetadata = resolveMetadataEntry(sessionMetadata.outputMetadata, firstOutputName);
  const dims = resolveMetadataDims(outputMetadata);
  if (!Array.isArray(dims) || dims.length === 0) {
    return null;
  }

  const lastDim = dims[dims.length - 1];
  const classCount = normalizeDimension(lastDim, -1);
  return classCount > 0 ? classCount : null;
}

function parseExplicitClassLabels(): FreshnessClassification[] | null {
  if (!ENV_CLASS_LABELS) {
    return null;
  }

  const parsed = ENV_CLASS_LABELS
    .split(",")
    .map((value) => normalizeClassificationLabel(value))
    .filter(Boolean);

  if (parsed.length === 0) {
    return null;
  }

  if (!parsed.every((label) => LEGACY_ALLOWED_LABELS.has(label))) {
    console.warn(
      `[Model][ONNX] Ignoring class labels from env because they contain invalid labels.`
    );
    return null;
  }

  return parsed;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not decode image file."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildCroppedImageData(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  guideBox?: SquareGuideBox | null
): ImageData {
  const crop = resolveSquareCropRegion(image.width, image.height, guideBox);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create 2D canvas context.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    image,
    crop.left,
    crop.top,
    crop.side,
    crop.side,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return context.getImageData(0, 0, targetWidth, targetHeight);
}

function sanitizeMetadata(payload: unknown): MeatLensModelMetadata {
  if (!payload || typeof payload !== "object") {
    return { ...DEFAULT_MODEL_METADATA };
  }

  const candidate = payload as Record<string, unknown>;
  const labelOrder = Array.isArray(candidate.label_order)
    ? candidate.label_order.map((value) => String(value)).map((value) => normalizeClassificationLabel(value))
    : undefined;

  return {
    backbone: typeof candidate.backbone === "string" ? candidate.backbone : DEFAULT_MODEL_METADATA.backbone,
    preprocess_function_name:
      typeof candidate.preprocess_function_name === "string"
        ? candidate.preprocess_function_name
        : DEFAULT_MODEL_METADATA.preprocess_function_name,
    input_size:
      typeof candidate.input_size === "number" || Array.isArray(candidate.input_size)
        ? (candidate.input_size as MeatLensModelMetadata["input_size"])
        : DEFAULT_MODEL_METADATA.input_size,
    image_crop_mode:
      typeof candidate.image_crop_mode === "string"
        ? candidate.image_crop_mode
        : DEFAULT_MODEL_METADATA.image_crop_mode,
    label_order: labelOrder && labelOrder.length > 0 ? labelOrder : DEFAULT_MODEL_METADATA.label_order,
  };
}

async function loadModelMetadata(): Promise<MeatLensModelMetadata> {
  if (metadataPromise) {
    return metadataPromise;
  }

  metadataPromise = (async () => {
    for (const path of MODEL_METADATA_CANDIDATE_PATHS) {
      try {
        const response = await fetch(path, { cache: "no-cache" });
        if (!response.ok) {
          continue;
        }

        const metadataJson = await response.json();
        const parsedMetadata = sanitizeMetadata(metadataJson);
        console.info(`[Model][ONNX] Loaded metadata from ${path}`);
        return parsedMetadata;
      } catch {
        // Try the next metadata location.
      }
    }

    console.info("[Model][ONNX] Metadata file not found; using fallback defaults.");
    return { ...DEFAULT_MODEL_METADATA };
  })();

  return metadataPromise;
}

async function getOrtModule(): Promise<OrtModule> {
  if (ortModule) {
    return ortModule;
  }

  ortModule = await import("onnxruntime-web");
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  const wasmBasePath = `${baseUrl.replace(/\/?$/, "/")}ort/`;
  // Override only the .wasm binary URL so ORT can keep using its embedded
  // .mjs loader module. This avoids Vite /public "?import" failures.
  ortModule.env.wasm.wasmPaths = {
    wasm: `${wasmBasePath}ort-wasm-simd-threaded.jsep.wasm`,
  };
  ortModule.env.wasm.numThreads = 1;
  ortModule.env.wasm.proxy = false;
  return ortModule;
}

async function tryLoadModelFromCandidates(ort: OrtModule): Promise<boolean> {
  let lastError: unknown;

  for (const modelPath of MODEL_CANDIDATE_PATHS) {
    try {
      session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ["wasm"],
        // "all" can noticeably increase first-load session build time on low-end
        // devices. "basic" trades a little inference speed for faster startup.
        graphOptimizationLevel: "basic",
      });
      loadedModelPath = modelPath;
      console.info(`[Model][ONNX] Loaded model from ${modelPath}`);
      return true;
    } catch (error) {
      lastError = error;
    }
  }

  console.info("[Model][ONNX] Model not available yet, using fallback path.", lastError);
  return false;
}

export async function loadMobileNetV3Model(options: LoadModelOptions = {}): Promise<boolean> {
  if (session) {
    return true;
  }

  if (loadPromise) {
    return loadPromise;
  }

  if (!options.forceRetry && Date.now() < nextRetryAt) {
    return false;
  }

  loadPromise = (async () => {
    try {
      const ort = await getOrtModule();
      await loadModelMetadata();
      return await tryLoadModelFromCandidates(ort);
    } catch (error) {
      console.warn("[Model][ONNX] Runtime initialization failed:", error);
      return false;
    } finally {
      loadPromise = null;
      if (!session) {
        nextRetryAt = Date.now() + RETRY_INTERVAL_MS;
      }
    }
  })();

  return loadPromise;
}

export function isModelReady(): boolean {
  return session !== null;
}

export async function classifyWithMobileNetV3(
  imageFile: File,
  options: ClassifyWithModelOptions = {}
): Promise<ModelPredictionResult | null> {
  if (!session) {
    return null;
  }

  try {
    const ort = await getOrtModule();
    const metadata = await loadModelMetadata();
    const preferredInputSize = resolveInputSize(metadata);
    const layout = deriveInputLayout(session, preferredInputSize);

    const targetWidth = layout.width || preferredInputSize || FALLBACK_IMAGE_SIZE;
    const targetHeight = layout.height || preferredInputSize || FALLBACK_IMAGE_SIZE;

    const preprocessMode = resolvePreprocessMode(metadata, "mobilenet_v3");
    const image = await loadImage(imageFile);
    const imageData = buildCroppedImageData(image, targetWidth, targetHeight, options.guideBox);
    const tensorData = buildImageTensorData(imageData, layout.channelsFirst, preprocessMode);

    const inputTensor = new ort.Tensor(
      "float32",
      tensorData,
      layout.channelsFirst
        ? [1, 3, targetHeight, targetWidth]
        : [1, targetHeight, targetWidth, 3]
    );

    const feeds: Record<string, unknown> = { [layout.inputName]: inputTensor };
    const outputMap = await session.run(feeds as never);

    const firstOutputName = session.outputNames?.[0];
    const firstOutput = (firstOutputName ? (outputMap as Record<string, unknown>)[firstOutputName] : null) as
      | { data?: Float32Array | number[] }
      | null;

    if (!firstOutput?.data) {
      throw new Error("Model produced no output tensor.");
    }

    const logits = Array.from(firstOutput.data as ArrayLike<number>);
    const modelClassCount = deriveOutputClassCount(session) ?? logits.length;
    const usableClassCount = Math.min(modelClassCount, logits.length);

    if (usableClassCount < 2) {
      console.warn(
        `[Model][ONNX] Unexpected output length ${logits.length}; expected at least 2 classes.`
      );
      return null;
    }

    const explicitLabels = parseExplicitClassLabels();
    const classLabels =
      explicitLabels?.length === usableClassCount
        ? explicitLabels
        : resolveOutputLabels(usableClassCount, metadata.label_order);

    if (classLabels.length !== usableClassCount) {
      console.warn(
        `[Model][ONNX] Could not map ${usableClassCount} output classes to labels.`
      );
      return null;
    }

    const probabilities = normalizeModelProbabilities(logits.slice(0, usableClassCount));
    const prediction = parsePrediction(probabilities, classLabels);
    const freshnessScore = computeFreshnessScore(prediction.predictedClass, prediction.confidence);

    return {
      classification: prediction.predictedClass,
      confidence: prediction.confidencePercent,
      confidenceProbability: prediction.confidence,
      probabilities: prediction.probabilitiesByLabel as Partial<Record<FreshnessClassification, number>>,
      freshnessScore,
      recommendation: classifyRecommendation(freshnessScore),
      labelOrder: classLabels,
      metadata,
    };
  } catch (error) {
    console.warn("[Model][ONNX] Inference failed:", error);
    return null;
  }
}

export function prewarmModel(): void {
  if (navigator.onLine && !session) {
    void loadMobileNetV3Model();
  }
}

export function getLoadedModelPath(): string | null {
  return loadedModelPath;
}

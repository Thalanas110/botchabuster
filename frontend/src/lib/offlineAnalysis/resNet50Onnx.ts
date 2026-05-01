import type { FreshnessClass } from "./classificationEngine";

const ENV_MODEL_PATH = (import.meta.env.VITE_RESNET50_ONNX_PATH ?? "").trim();
const ENV_CLASS_LABELS = (import.meta.env.VITE_RESNET50_CLASS_LABELS ?? "").trim();
const MODEL_CANDIDATE_PATHS = Array.from(
  new Set(
    [
      ENV_MODEL_PATH,
      "/model/meatlens_resnet50_exp2.onnx",
      "/model/resnet50.onnx",
      "/model/model.onnx",
      "/models/resnet50_meat/meatlens_resnet50_exp2.onnx",
      "/models/resnet50_meat/resnet50.onnx",
      "/models/resnet50_meat/model.onnx",
    ].filter((path) => path.length > 0)
  )
);

const FALLBACK_IMAGE_SIZE = 224;
const RETRY_INTERVAL_MS = 15_000;
const DEFAULT_CLASSES_4: FreshnessClass[] = ["fresh", "acceptable", "warning", "spoiled"];
const DEFAULT_CLASSES_3: FreshnessClass[] = ["fresh", "warning", "spoiled"];
const DEFAULT_CLASSES_2: FreshnessClass[] = ["fresh", "spoiled"];

// Keeps the import type-safe while still lazy-loading the runtime.
type OrtModule = typeof import("onnxruntime-web");
type OnnxSession = import("onnxruntime-web").InferenceSession;

interface InputLayout {
  inputName: string;
  channelsFirst: boolean;
  width: number;
  height: number;
}

let ortModule: OrtModule | null = null;
let session: OnnxSession | null = null;
let loadedModelPath: string | null = null;
let loadPromise: Promise<boolean> | null = null;
let nextRetryAt = 0;

interface LoadResNet50Options {
  forceRetry?: boolean;
}

function parseExplicitClassLabels(): FreshnessClass[] | null {
  if (!ENV_CLASS_LABELS) {
    return null;
  }

  const parsed = ENV_CLASS_LABELS
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (parsed.length === 0) {
    return null;
  }

  const allowed = new Set<FreshnessClass>(["fresh", "acceptable", "warning", "spoiled"]);
  if (!parsed.every((value) => allowed.has(value as FreshnessClass))) {
    console.warn(
      `[ResNet50][ONNX] Ignoring VITE_RESNET50_CLASS_LABELS="${ENV_CLASS_LABELS}" because it contains invalid labels.`
    );
    return null;
  }

  return parsed as FreshnessClass[];
}

function resolveClassLabels(classCount: number): FreshnessClass[] {
  const explicitLabels = parseExplicitClassLabels();
  if (explicitLabels?.length === classCount) {
    return explicitLabels;
  }

  if (classCount === 4) {
    return DEFAULT_CLASSES_4;
  }

  if (classCount === 3) {
    return DEFAULT_CLASSES_3;
  }

  if (classCount === 2) {
    return DEFAULT_CLASSES_2;
  }

  return DEFAULT_CLASSES_4.slice(0, Math.min(classCount, DEFAULT_CLASSES_4.length));
}

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

function deriveInputLayout(activeSession: OnnxSession): InputLayout {
  const inputName = activeSession.inputNames?.[0];
  if (!inputName) {
    throw new Error("ONNX model has no input tensor.");
  }

  const metadataList = (activeSession as unknown as {
    inputMetadata?: Array<{
      shape?: ReadonlyArray<number | string>;
      dimensions?: unknown[];
      dims?: unknown[];
    }>;
  }).inputMetadata;

  const dims = metadataList?.[0]?.shape ?? metadataList?.[0]?.dimensions ?? metadataList?.[0]?.dims ?? [];

  if (!Array.isArray(dims) || dims.length < 4) {
    return {
      inputName,
      channelsFirst: true,
      width: FALLBACK_IMAGE_SIZE,
      height: FALLBACK_IMAGE_SIZE,
    };
  }

  const d1 = normalizeDimension(dims[1], FALLBACK_IMAGE_SIZE);
  const d2 = normalizeDimension(dims[2], FALLBACK_IMAGE_SIZE);
  const d3 = normalizeDimension(dims[3], FALLBACK_IMAGE_SIZE);

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
  const metadataList = (activeSession as unknown as {
    outputMetadata?: Array<{
      shape?: ReadonlyArray<number | string>;
      dimensions?: unknown[];
      dims?: unknown[];
    }>;
  }).outputMetadata;

  const dims = metadataList?.[0]?.shape ?? metadataList?.[0]?.dimensions ?? metadataList?.[0]?.dims ?? [];
  if (!Array.isArray(dims) || dims.length === 0) {
    return null;
  }

  const lastDim = dims[dims.length - 1];
  const classCount = normalizeDimension(lastDim, -1);
  return classCount > 0 ? classCount : null;
}

function softmax(values: number[]): number[] {
  const maxLogit = Math.max(...values);
  const expValues = values.map((value) => Math.exp(value - maxLogit));
  const sum = expValues.reduce((total, value) => total + value, 0);
  return expValues.map((value) => value / sum);
}

function normalizeProbabilities(rawValues: number[]): number[] {
  if (rawValues.length === 0) {
    return rawValues;
  }

  const inUnitRange = rawValues.every((value) => value >= 0 && value <= 1);
  const sum = rawValues.reduce((total, value) => total + value, 0);

  if (inUnitRange && sum > 0.99 && sum < 1.01) {
    return rawValues;
  }

  return softmax(rawValues);
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

function buildTensorData(imageData: ImageData, channelsFirst: boolean): Float32Array {
  const pixels = imageData.data;
  const height = imageData.height;
  const width = imageData.width;

  // ResNet50 default preprocessing (keras.applications.resnet): RGB -> BGR,
  // then channel-wise mean subtraction.
  const meanB = 103.939;
  const meanG = 116.779;
  const meanR = 123.68;

  if (channelsFirst) {
    const channelSize = width * height;
    const data = new Float32Array(3 * channelSize);

    for (let index = 0; index < channelSize; index++) {
      const pixelOffset = index * 4;
      const r = pixels[pixelOffset];
      const g = pixels[pixelOffset + 1];
      const b = pixels[pixelOffset + 2];

      data[index] = b - meanB;
      data[channelSize + index] = g - meanG;
      data[2 * channelSize + index] = r - meanR;
    }

    return data;
  }

  const data = new Float32Array(width * height * 3);
  for (let index = 0; index < width * height; index++) {
    const pixelOffset = index * 4;
    const outputOffset = index * 3;

    const r = pixels[pixelOffset];
    const g = pixels[pixelOffset + 1];
    const b = pixels[pixelOffset + 2];

    data[outputOffset] = b - meanB;
    data[outputOffset + 1] = g - meanG;
    data[outputOffset + 2] = r - meanR;
  }

  return data;
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
      console.info(`[ResNet50][ONNX] Loaded model from ${modelPath}`);
      return true;
    } catch (error) {
      lastError = error;
    }
  }

  console.info("[ResNet50][ONNX] Model not available yet, using rule-based fallback.", lastError);
  return false;
}

export async function loadResNet50Model(options: LoadResNet50Options = {}): Promise<boolean> {
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
      return await tryLoadModelFromCandidates(ort);
    } catch (error) {
      console.warn("[ResNet50][ONNX] Runtime initialization failed:", error);
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

export async function classifyWithResNet50(
  imageFile: File
): Promise<{ classification: FreshnessClass; confidence: number } | null> {
  if (!session) {
    return null;
  }

  try {
    const ort = await getOrtModule();
    const layout = deriveInputLayout(session);
    const image = await loadImage(imageFile);

    const canvas = document.createElement("canvas");
    canvas.width = layout.width;
    canvas.height = layout.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to create 2D canvas context.");
    }

    context.drawImage(image, 0, 0, layout.width, layout.height);
    const imageData = context.getImageData(0, 0, layout.width, layout.height);
    const tensorData = buildTensorData(imageData, layout.channelsFirst);

    const inputTensor = new ort.Tensor(
      "float32",
      tensorData,
      layout.channelsFirst
        ? [1, 3, layout.height, layout.width]
        : [1, layout.height, layout.width, 3]
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
        `[ResNet50][ONNX] Unexpected output length ${logits.length}; expected at least 2 classes.`
      );
      return null;
    }

    const classLabels = resolveClassLabels(usableClassCount);
    if (classLabels.length !== usableClassCount) {
      console.warn(
        `[ResNet50][ONNX] Could not map ${usableClassCount} output classes to MeatLens labels.`
      );
      return null;
    }

    const probabilities = normalizeProbabilities(logits.slice(0, usableClassCount));
    const maxProbability = Math.max(...probabilities);
    const maxIndex = probabilities.indexOf(maxProbability);

    return {
      classification: classLabels[maxIndex],
      confidence: Math.round(maxProbability * 100),
    };
  } catch (error) {
    console.warn("[ResNet50][ONNX] Inference failed:", error);
    return null;
  }
}

export function prewarmModel(): void {
  if (navigator.onLine && !session) {
    void loadResNet50Model();
  }
}

export function getLoadedModelPath(): string | null {
  return loadedModelPath;
}

/**
 * MobileNetV3-Small TF.js integration.
 *
 * This module lazy-loads @tensorflow/tfjs and a fine-tuned MobileNetV3-Small
 * model from /models/mobilenetv3_meat/model.json (TF.js GraphModel format,
 * 4-class softmax: fresh | acceptable | warning | spoiled).
 *
 * On first successful load the model weights are cached in IndexedDB so
 * subsequent loads — including offline — work without any network request.
 *
 * If the model file is not yet present (during development / before training),
 * loadModel() returns false and all callers gracefully fall back to the
 * rule-based classifier.
 *
 * ─── Adding the model ────────────────────────────────────────────────────────
 * 1. Train a MobileNetV3-Small head on your meat freshness dataset.
 * 2. Export to TF.js GraphModel format:
 *      tensorflowjs_converter --input_format=tf_saved_model \
 *        saved_model/ frontend/public/models/mobilenetv3_meat/
 * 3. The service worker (Workbox) will precache the model files automatically
 *    on the next build (see vite.config.ts globPatterns).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FreshnessClass } from "./classificationEngine";

const MODEL_NETWORK_PATH = "/models/mobilenetv3_meat/model.json";
const MODEL_IDB_KEY = "indexeddb://mobilenetv3-meat";
const INPUT_SIZE = 224; // MobileNetV3-Small default
const CLASSES: FreshnessClass[] = ["fresh", "acceptable", "warning", "spoiled"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TfGraphModel = any;

let model: TfGraphModel | null = null;
let loadAttempted = false;

/** Attempt to load the model. Returns true on success. */
export async function loadMobileNetV3(): Promise<boolean> {
  if (model) return true;
  if (loadAttempted) return false;
  loadAttempted = true;

  try {
    // Dynamic import keeps TF.js out of the initial bundle
    const tf = await import("@tensorflow/tfjs");

    // 1. Try IndexedDB cache first (works offline after first load)
    try {
      model = await tf.loadGraphModel(MODEL_IDB_KEY);
      console.info("[MobileNetV3] Loaded from IndexedDB cache.");
      return true;
    } catch {
      // Not cached yet — fall through to network
    }

    // 2. Load from the PWA's static assets
    model = await tf.loadGraphModel(MODEL_NETWORK_PATH);
    console.info("[MobileNetV3] Loaded from network path.");

    // 3. Cache for future offline use
    try {
      await model.save(MODEL_IDB_KEY);
    } catch (e) {
      console.warn("[MobileNetV3] Could not cache model in IndexedDB:", e);
    }

    return true;
  } catch (err) {
    // Model file not present yet — graceful degradation to rule-based
    console.info("[MobileNetV3] Model not available, using rule-based fallback.", err);
    return false;
  }
}

/** Returns true if the model is ready to use without a network round-trip. */
export function isModelReady(): boolean {
  return model !== null;
}

/**
 * Run inference on an image File.
 *
 * Returns null when the model is not loaded (caller should fall back to
 * rule-based classification).
 */
export async function classifyWithMobileNetV3(
  imageFile: File
): Promise<{ classification: FreshnessClass; confidence: number } | null> {
  if (!model) return null;

  try {
    const tf = await import("@tensorflow/tfjs");

    // Load image into an HTMLImageElement
    const url = URL.createObjectURL(imageFile);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);

    // Preprocess: resize to 224×224, normalize to [-1, 1] (MobileNetV3 convention)
    const tensor = tf.tidy(() => {
      const raw = tf.browser.fromPixels(img);
      const resized = tf.image.resizeBilinear(raw, [INPUT_SIZE, INPUT_SIZE]);
      const normalized = resized.toFloat().div(127.5).sub(1.0);
      return normalized.expandDims(0); // [1, 224, 224, 3]
    });

    const output = model.predict(tensor) as TfGraphModel;
    const probabilities = Array.from(await output.data() as Float32Array);
    tensor.dispose();
    output.dispose();

    const maxIdx = probabilities.indexOf(Math.max(...probabilities));

    return {
      classification: CLASSES[maxIdx],
      confidence: Math.round(probabilities[maxIdx] * 100),
    };
  } catch (err) {
    console.warn("[MobileNetV3] Inference failed:", err);
    return null;
  }
}

/** Pre-warm: start loading the model in the background as soon as the app
 *  is online so it's ready for the first offline session. */
export function prewarmModel(): void {
  if (navigator.onLine && !loadAttempted) {
    void loadMobileNetV3();
  }
}

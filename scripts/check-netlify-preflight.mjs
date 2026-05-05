import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isNetlifyBuild = process.env.NETLIFY === "true" || process.env.NETLIFY === "1";
if (!isNetlifyBuild) {
  process.exit(0);
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function hasAny(paths) {
  return paths.some((candidate) => existsSync(path.join(rootDir, candidate)));
}

const apiBaseUrl = (process.env.VITE_API_BASE_URL ?? "").trim();
if (!apiBaseUrl) {
  console.error("[netlify-preflight] Missing VITE_API_BASE_URL. Set it in Netlify env vars (Build scope).");
  process.exit(1);
}

if (!/^https?:\/\//i.test(apiBaseUrl)) {
  console.error("[netlify-preflight] VITE_API_BASE_URL must be an absolute URL, e.g. https://your-backend.onrender.com/api");
  process.exit(1);
}

if (!apiBaseUrl.toLowerCase().includes("/api")) {
  console.warn("[netlify-preflight] VITE_API_BASE_URL does not include '/api'. Verify this is intentional.");
}

const modelCandidates = [
  "model/resnet50.onnx",
  "model/meatlens_resnet50_exp2.onnx",
  "frontend/public/model/meatlens_resnet50_exp2.onnx",
  "frontend/public/models/resnet50_meat/meatlens_resnet50_exp2.onnx",
  "frontend/public/models/resnet50_meat/model.onnx",
];

const metadataCandidates = [
  "model/meatlens_resnet50_exp2_metadata.json",
  "frontend/public/model/meatlens_resnet50_exp2_metadata.json",
  "frontend/public/models/resnet50_meat/meatlens_resnet50_exp2_metadata.json",
];

if (!hasAny(modelCandidates)) {
  console.error("[netlify-preflight] ResNet50 ONNX file not found. Expected one of:");
  for (const candidate of modelCandidates) {
    console.error(`  - ${candidate}`);
  }
  process.exit(1);
}

if (!hasAny(metadataCandidates)) {
  console.warn("[netlify-preflight] ResNet metadata JSON not found. Falling back to built-in defaults.");
}

console.info("[netlify-preflight] Deployment checks passed.");

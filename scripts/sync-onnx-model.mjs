import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(thisFile);
const repoRoot = path.resolve(scriptsDir, "..");

const sourceCandidates = [
  path.join(repoRoot, "model", "NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx"),
  path.join(repoRoot, "model", "meatlens_mobilenetv3small_cnn_only.onnx"),
  path.join(repoRoot, "model", "meatlens_mobilenetv3small_cnn_only (1).onnx"),
  path.join(repoRoot, "model", "mobilenetv3.onnx"),
  path.join(repoRoot, "model", "model.onnx"),
];
const metadataSourceCandidates = [
  path.join(repoRoot, "model", "NEW-meatlens_best_model_metadata.json"),
  path.join(repoRoot, "model", "NEW-meatlens_mobilenetv3small_cnn_only_metadata.json"),
  path.join(repoRoot, "model", "NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json"),
  path.join(repoRoot, "model", "NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json"),
  path.join(repoRoot, "model", "meatlens_mobilenetv3small_cnn_only_metadata.json"),
  path.join(repoRoot, "model", "meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json"),
  path.join(repoRoot, "model", "meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json"),
  path.join(repoRoot, "model", "meatlens_best_model_metadata.json"),
  path.join(repoRoot, "model", "best_model_metadata.json"),
  path.join(
    repoRoot,
    "frontend",
    "public",
    "models",
    "mobilenetv3_meat",
    "meatlens_mobilenetv3small_cnn_only_metadata.json"
  ),
  path.join(
    repoRoot,
    "frontend",
    "public",
    "models",
    "mobilenetv3_meat",
    "meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json"
  ),
  path.join(
    repoRoot,
    "frontend",
    "public",
    "models",
    "mobilenetv3_meat",
    "meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json"
  ),
];

const targetPaths = [
  path.join(repoRoot, "frontend", "public", "model", "NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx"),
  path.join(repoRoot, "frontend", "public", "model", "meatlens_mobilenetv3small_cnn_only.onnx"),
  path.join(repoRoot, "frontend", "public", "models", "mobilenetv3_meat", "NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx"),
  path.join(repoRoot, "frontend", "public", "models", "mobilenetv3_meat", "meatlens_mobilenetv3small_cnn_only.onnx"),
];
const metadataTargetPaths = [
  path.join(repoRoot, "frontend", "public", "model", "NEW-meatlens_best_model_metadata.json"),
  path.join(repoRoot, "frontend", "public", "model", "meatlens_best_model_metadata.json"),
  path.join(repoRoot, "frontend", "public", "models", "mobilenetv3_meat", "NEW-meatlens_best_model_metadata.json"),
  path.join(repoRoot, "frontend", "public", "models", "mobilenetv3_meat", "meatlens_best_model_metadata.json"),
];

const ortDistDir = path.join(repoRoot, "node_modules", "onnxruntime-web", "dist");
const ortPublicDir = path.join(repoRoot, "frontend", "public", "ort");
const ortRuntimeFiles = [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jspi.wasm",
  "ort-wasm-simd-threaded.jspi.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
  "ort-wasm-simd-threaded.asyncify.mjs",
];

const sourcePath = sourceCandidates.find((candidate) => existsSync(candidate));
const metadataSourcePath = metadataSourceCandidates.find((candidate) => existsSync(candidate));

if (!sourcePath) {
  console.info("[sync-onnx-model] No ONNX source found in model/. Skipping.");
  process.exit(0);
}

const sourceStat = statSync(sourcePath);

for (const targetPath of targetPaths) {
  mkdirSync(path.dirname(targetPath), { recursive: true });

  let shouldCopy = true;
  if (existsSync(targetPath)) {
    const targetStat = statSync(targetPath);
    shouldCopy =
      targetStat.size !== sourceStat.size ||
      targetStat.mtimeMs < sourceStat.mtimeMs;
  }

  if (!shouldCopy) {
    console.info(`[sync-onnx-model] Up to date: ${path.relative(repoRoot, targetPath)}`);
    continue;
  }

  copyFileSync(sourcePath, targetPath);
  console.info(
    `[sync-onnx-model] Copied ${path.relative(repoRoot, sourcePath)} -> ${path.relative(repoRoot, targetPath)}`
  );
}

if (!metadataSourcePath) {
  console.info("[sync-onnx-model] No metadata source found in model/. Skipping metadata sync.");
} else {
  const metadataSourceStat = statSync(metadataSourcePath);

  for (const targetPath of metadataTargetPaths) {
    mkdirSync(path.dirname(targetPath), { recursive: true });

    let shouldCopy = true;
    if (existsSync(targetPath)) {
      const targetStat = statSync(targetPath);
      shouldCopy =
        targetStat.size !== metadataSourceStat.size ||
        targetStat.mtimeMs < metadataSourceStat.mtimeMs;
    }

    if (!shouldCopy) {
      console.info(`[sync-onnx-model] Up to date: ${path.relative(repoRoot, targetPath)}`);
      continue;
    }

    copyFileSync(metadataSourcePath, targetPath);
    console.info(
      `[sync-onnx-model] Copied ${path.relative(repoRoot, metadataSourcePath)} -> ${path.relative(repoRoot, targetPath)}`
    );
  }
}

mkdirSync(ortPublicDir, { recursive: true });
for (const runtimeFile of ortRuntimeFiles) {
  const runtimeSource = path.join(ortDistDir, runtimeFile);
  const runtimeTarget = path.join(ortPublicDir, runtimeFile);

  if (!existsSync(runtimeSource)) {
    console.warn(`[sync-onnx-model] Missing runtime file: ${path.relative(repoRoot, runtimeSource)}`);
    continue;
  }

  const sourceRuntimeStat = statSync(runtimeSource);
  let shouldCopyRuntime = true;

  if (existsSync(runtimeTarget)) {
    const targetRuntimeStat = statSync(runtimeTarget);
    shouldCopyRuntime =
      targetRuntimeStat.size !== sourceRuntimeStat.size ||
      targetRuntimeStat.mtimeMs < sourceRuntimeStat.mtimeMs;
  }

  if (!shouldCopyRuntime) {
    console.info(`[sync-onnx-model] Up to date: ${path.relative(repoRoot, runtimeTarget)}`);
    continue;
  }

  copyFileSync(runtimeSource, runtimeTarget);
  console.info(
    `[sync-onnx-model] Copied ${path.relative(repoRoot, runtimeSource)} -> ${path.relative(repoRoot, runtimeTarget)}`
  );
}

// Legacy compatibility wrapper. Active ONNX runtime is MobileNetV3.
export {
  isModelReady,
  prewarmModel,
  getLoadedModelPath,
  loadMobileNetV3Model,
  classifyWithMobileNetV3,
  type ModelPredictionResult,
} from "./mobileNetV3Onnx";

import {
  loadMobileNetV3Model,
  classifyWithMobileNetV3,
  type ModelPredictionResult,
} from "./mobileNetV3Onnx";

export async function loadResNet50Model(options: { forceRetry?: boolean } = {}): Promise<boolean> {
  return loadMobileNetV3Model(options);
}

export async function classifyWithResNet50(
  imageFile: File,
  options: { guideBox?: { x: number; y: number; size: number; normalized?: boolean } | null } = {}
): Promise<ModelPredictionResult | null> {
  return classifyWithMobileNetV3(imageFile, options);
}

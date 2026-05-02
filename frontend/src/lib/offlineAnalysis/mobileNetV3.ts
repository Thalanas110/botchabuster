import {
  loadMobileNetV3Model,
  classifyWithMobileNetV3,
  isModelReady,
  prewarmModel,
  getLoadedModelPath,
} from "./mobileNetV3Onnx";

export { isModelReady, prewarmModel, getLoadedModelPath };
export const loadMobileNetV3 = loadMobileNetV3Model;
export { classifyWithMobileNetV3 };

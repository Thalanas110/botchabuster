import {
  loadMobileNetV3Model,
  classifyWithMobileNetV3,
  isModelReady,
  prewarmModel,
  getLoadedModelPath,
  setActiveMobileNetModelVariant,
  getActiveMobileNetModelVariant,
  getActiveModelPreprocessContract,
  type MobileNetModelVariant,
} from "./mobileNetV3Onnx";

export { isModelReady, prewarmModel, getLoadedModelPath };
export const loadMobileNetV3 = loadMobileNetV3Model;
export { classifyWithMobileNetV3 };
export { setActiveMobileNetModelVariant, getActiveMobileNetModelVariant, getActiveModelPreprocessContract };
export type { MobileNetModelVariant };

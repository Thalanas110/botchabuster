import { loadResNet50Model, classifyWithResNet50, isModelReady, prewarmModel } from "./resNet50Onnx";

// Compatibility shim: existing call sites keep working while the underlying
// model runtime is now ONNX ResNet50.
export const loadMobileNetV3 = loadResNet50Model;
export const classifyWithMobileNetV3 = classifyWithResNet50;
export { isModelReady, prewarmModel };

import { beforeEach, describe, expect, it, vi } from "vitest";

const offlineAnalysisMocks = vi.hoisted(() => ({
  extractLabValues: vi.fn(async () => ({ l: 60.87, a: 24.05, b: 16.51 })),
  computeGLCMFeatures: vi.fn(async () => ({
    contrast: 0.1731,
    correlation: 0.9761,
    energy: 0.1988,
    homogeneity: 0.9461,
  })),
  classify: vi.fn(() => ({
    classification: "fresh" as const,
    confidence_score: 67,
    flagged_deviations: [],
    explanation: "rules",
  })),
  loadCalibration: vi.fn(async () => null),
  loadResNet50Model: vi.fn(async () => false),
  isModelReady: vi.fn(() => false),
  classifyWithResNet50: vi.fn(async () => null),
  getLoadedModelPath: vi.fn(() => "/model/meatlens_resnet50_exp2.onnx"),
}));

vi.mock("./colorAnalysis", () => ({
  extractLabValues: offlineAnalysisMocks.extractLabValues,
}));

vi.mock("./textureAnalysis", () => ({
  computeGLCMFeatures: offlineAnalysisMocks.computeGLCMFeatures,
}));

vi.mock("./classificationEngine", () => ({
  classify: offlineAnalysisMocks.classify,
}));

vi.mock("./calibrationStore", () => ({
  loadCalibration: offlineAnalysisMocks.loadCalibration,
  saveCalibration: vi.fn(),
  calibrationTTLMs: 0,
}));

vi.mock("./calibration", () => ({
  calibrateFromImage: vi.fn(),
}));

vi.mock("./resNet50Onnx", () => ({
  classifyWithResNet50: offlineAnalysisMocks.classifyWithResNet50,
  loadResNet50Model: offlineAnalysisMocks.loadResNet50Model,
  isModelReady: offlineAnalysisMocks.isModelReady,
  getLoadedModelPath: offlineAnalysisMocks.getLoadedModelPath,
  prewarmModel: vi.fn(),
}));

import { analyzeOffline } from "./index";

function setOnlineState(online: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: online,
  });
}

describe("analyzeOffline model usage guarantees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setOnlineState(true);
  });

  it("fails online analysis when ResNet inference is unavailable", async () => {
    offlineAnalysisMocks.isModelReady.mockReturnValue(true);
    offlineAnalysisMocks.classifyWithResNet50.mockResolvedValue(null);

    const imageFile = new File(["sample"], "sample.jpg", { type: "image/jpeg" });

    await expect(analyzeOffline(imageFile, "pork")).rejects.toThrow("ResNet50 model inference is required");
  });

  it("returns ResNet-sourced metadata when model inference succeeds", async () => {
    offlineAnalysisMocks.isModelReady.mockReturnValue(true);
    offlineAnalysisMocks.classifyWithResNet50.mockResolvedValue({
      classification: "fresh",
      confidence: 100,
    });

    const imageFile = new File(["sample"], "sample.jpg", { type: "image/jpeg" });
    const result = await analyzeOffline(imageFile, "pork");

    expect(result.analysis_source).toBe("resnet50+rules");
    expect(result.model_path).toBe("/model/meatlens_resnet50_exp2.onnx");
    expect(result.model_confidence_score).toBe(100);
    expect(result.rule_confidence_score).toBe(67);
    expect(result.confidence_score).toBe(95);
  });

  it("allows rules-only fallback when offline", async () => {
    setOnlineState(false);
    offlineAnalysisMocks.isModelReady.mockReturnValue(false);
    offlineAnalysisMocks.loadResNet50Model.mockResolvedValue(false);

    const imageFile = new File(["sample"], "sample.jpg", { type: "image/jpeg" });
    const result = await analyzeOffline(imageFile, "pork");

    expect(result.analysis_source).toBe("rules-only");
    expect(result.model_confidence_score).toBeNull();
    expect(result.confidence_score).toBe(67);
  });
});

import { expect, test } from "@playwright/test";
import {
  classifyRecommendation,
  computeFreshnessScore,
  normalizeModelProbabilities,
  parsePrediction,
  preprocessRgbPixel,
  resolveOutputLabels,
  resolvePreprocessMode,
  resolveSquareCropRegion,
} from "../src/lib/offlineAnalysis/meatLensPipeline";

test.describe("MeatLens inference pipeline helpers", () => {
  test("uses centered square crop when no guide-box is provided", () => {
    const crop = resolveSquareCropRegion(1000, 600);

    expect(crop).toEqual({ left: 200, top: 0, side: 600 });
  });

  test("uses guide-box crop and clamps it to image bounds", () => {
    const crop = resolveSquareCropRegion(1000, 800, {
      x: 900,
      y: 700,
      size: 300,
    });

    expect(crop).toEqual({ left: 700, top: 500, side: 300 });
  });

  test("resolves preprocess mode from metadata hints", () => {
    expect(resolvePreprocessMode({ preprocess_function_name: "mobilenet_v3.preprocess_input" })).toBe("mobilenet_v3");
    expect(resolvePreprocessMode({ backbone: "EfficientNetB0" })).toBe("efficientnet");
    expect(resolvePreprocessMode({ backbone: "ResNet50" })).toBe("resnet50");
  });

  test("applies MobileNetV3 preprocessing in [-1, 1] range", () => {
    const [r, g, b] = preprocessRgbPixel({ r: 0, g: 127.5, b: 255 }, "mobilenet_v3");

    expect(r).toBeCloseTo(-1, 5);
    expect(g).toBeCloseTo(0, 5);
    expect(b).toBeCloseTo(1, 5);
  });

  test("keeps EfficientNet pixels in 0-255 before model graph internal scaling", () => {
    const [r, g, b] = preprocessRgbPixel({ r: 17, g: 111, b: 243 }, "efficientnet");

    expect(r).toBe(17);
    expect(g).toBe(111);
    expect(b).toBe(243);
  });

  test("prefers metadata label order, otherwise falls back by class count", () => {
    expect(resolveOutputLabels(3, ["fresh", "not fresh", "spoiled"]))
      .toEqual(["fresh", "not fresh", "spoiled"]);

    expect(resolveOutputLabels(3)).toEqual(["fresh", "not fresh", "spoiled"]);
    expect(resolveOutputLabels(4)).toEqual(["fresh", "acceptable", "warning", "spoiled"]);
  });

  test("normalizes logits and maps argmax prediction", () => {
    const probabilities = normalizeModelProbabilities([1, 3, 2]);
    const prediction = parsePrediction(probabilities, ["fresh", "not fresh", "spoiled"]);

    expect(prediction.predictedClass).toBe("not fresh");
    expect(prediction.confidence).toBeGreaterThan(0.6);
    expect(prediction.confidencePercent).toBeGreaterThanOrEqual(60);
    expect(prediction.probabilitiesByLabel["not fresh"]).toBeCloseTo(prediction.confidence, 10);
  });

  test("computes freshness score and recommendation from class confidence", () => {
    expect(computeFreshnessScore("fresh", 0.8)).toBeCloseTo(94, 5);
    expect(computeFreshnessScore("not fresh", 0.5)).toBeCloseTo(50, 5);
    expect(computeFreshnessScore("spoiled", 1)).toBeCloseTo(5, 5);

    expect(classifyRecommendation(75)).toBe("Good for Consumption");
    expect(classifyRecommendation(69)).toBe("Consume Immediately");
    expect(classifyRecommendation(39)).toBe("Not Suitable");
  });
});

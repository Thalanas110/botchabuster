import { describe, expect, it } from "vitest";
import { evaluateBlur, getAdaptiveBlurThreshold } from "./captureQuality";

describe("captureQuality blur gating", () => {
  it("uses a lower threshold for low-contrast scenes", () => {
    const lowContrastThreshold = getAdaptiveBlurThreshold(120);
    const highContrastThreshold = getAdaptiveBlurThreshold(1400);

    expect(lowContrastThreshold).toBeLessThan(highContrastThreshold);
  });

  it("does not reject clear-but-smooth images", () => {
    const decision = evaluateBlur(58, 120);
    expect(decision.rejected).toBe(false);
  });

  it("rejects severely blurred images", () => {
    const decision = evaluateBlur(20, 120);
    expect(decision.rejected).toBe(true);
  });

  it("still rejects blurry high-detail images", () => {
    const decision = evaluateBlur(45, 1400);
    expect(decision.rejected).toBe(true);
  });
});

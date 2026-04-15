import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AnalysisResultCard } from "./AnalysisResultCard";
import type { AnalysisResult } from "@/types/inspection";

const sampleResult: AnalysisResult = {
  classification: "fresh",
  confidence_score: 96,
  lab_values: { l: 48.23, a: 11.12, b: 7.44 },
  glcm_features: {
    contrast: 0.1234,
    correlation: 0.5678,
    energy: 0.9012,
    homogeneity: 0.3456,
  },
  flagged_deviations: ["Slight marbling inconsistency"],
  explanation: "Color and texture measurements align with a fresh sample.",
};

describe("AnalysisResultCard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("hides technical metric sections when detailed results are disabled", async () => {
    await act(async () => {
      root.render(<AnalysisResultCard result={sampleResult} showDetailedResults={false} />);
    });

    expect(findText(container, /classification/i)).toBeTruthy();
    expect(findText(container, /confidence/i)).toBeTruthy();
    expect(findText(container, /analysis/i)).toBeTruthy();
    expect(findText(container, /color and texture measurements align with a fresh sample/i)).toBeTruthy();

    expect(findText(container, /lab\\* color space/i)).toBeFalsy();
    expect(findText(container, /glcm texture/i)).toBeFalsy();
    expect(findText(container, /flagged deviations/i)).toBeFalsy();
  });
});

function findText(container: HTMLElement, text: RegExp): HTMLElement | undefined {
  return Array.from(container.querySelectorAll("*")).find((candidate) => {
    const content = candidate.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return text.test(content);
  }) as HTMLElement | undefined;
}

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InspectionListItem } from "./InspectionListItem";
import type { Inspection } from "@/types/inspection";

const sampleInspection: Inspection = {
  id: "inspection-123456",
  user_id: "user-1",
  meat_type: "pork",
  classification: "acceptable",
  confidence_score: 97,
  lab_l: null,
  lab_a: null,
  lab_b: null,
  glcm_contrast: null,
  glcm_correlation: null,
  glcm_energy: null,
  glcm_homogeneity: null,
  flagged_deviations: [],
  explanation: null,
  image_url: null,
  location: "Quezon City",
  inspector_notes: null,
  created_at: "2026-04-19T02:55:00.000Z",
  updated_at: "2026-04-19T02:55:00.000Z",
};

describe("InspectionListItem", () => {
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

  it("moves the confidence summary into a full-width mobile row", async () => {
    await act(async () => {
      root.render(<InspectionListItem inspection={sampleInspection} />);
    });

    const layout = container.querySelector('[data-testid="inspection-card-layout"]');
    if (!(layout instanceof HTMLDivElement)) {
      throw new Error("Inspection card layout not found");
    }

    const metrics = container.querySelector('[data-testid="inspection-metrics"]');
    if (!(metrics instanceof HTMLDivElement)) {
      throw new Error("Inspection metrics block not found");
    }

    expect(layout.className).toContain("grid-cols-[auto_minmax(0,1fr)]");
    expect(layout.className).toContain("sm:grid-cols-[auto_minmax(0,1fr)_auto]");
    expect(metrics.className).toContain("col-span-2");
    expect(metrics.className).toContain("sm:col-span-1");
  });
});

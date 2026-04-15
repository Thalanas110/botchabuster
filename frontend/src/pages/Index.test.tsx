import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InspectPage from "./Index";

const mockAnalyzeMutateAsync = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockUploadInspectionImage = vi.fn();

vi.mock("@/components/CameraCapture", () => ({
  CameraCapture: ({ onCapture }: { onCapture: (file: File) => void }) => (
    <button onClick={() => onCapture(new File(["image"], "sample.jpg", { type: "image/jpeg" }))}>
      Mock Capture
    </button>
  ),
}));

vi.mock("@/components/AnalysisResultCard", () => ({
  AnalysisResultCard: ({ result }: { result: { classification: string } }) => (
    <div>Analysis Result: {result.classification}</div>
  ),
}));

vi.mock("@/hooks/useAnalysis", () => ({
  useAnalyzeImage: () => ({
    mutateAsync: mockAnalyzeMutateAsync,
  }),
}));

vi.mock("@/hooks/useInspections", () => ({
  useCreateInspection: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

vi.mock("@/integrations/api", () => ({
  uploadClient: {
    uploadInspectionImage: mockUploadInspectionImage,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
  },
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("InspectPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockAnalyzeMutateAsync.mockResolvedValue({
      classification: "fresh",
      confidence_score: 98,
      lab_values: { l: 52, a: 12, b: 7 },
      glcm_features: {
        contrast: 1.2,
        correlation: 0.9,
        energy: 0.8,
        homogeneity: 0.7,
      },
      flagged_deviations: [],
      explanation: "Looks fresh.",
    });
    mockCreateMutateAsync.mockResolvedValue({ id: "inspection-1" });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("prevents saving the same analyzed record more than once", async () => {
    const uploadRequest = createDeferred<string>();
    mockUploadInspectionImage.mockImplementation(() => uploadRequest.promise);

    await act(async () => {
      root.render(<InspectPage />);
    });

    await act(async () => {
      getButtonByText(container, /mock capture/i).click();
    });

    await act(async () => {
      getButtonByText(container, /analyze sample/i).click();
    });

    const saveButton = await waitForButton(container, /save record/i);

    await act(async () => {
      saveButton.click();
      saveButton.click();
    });

    expect(mockUploadInspectionImage).toHaveBeenCalledTimes(1);

    await act(async () => {
      uploadRequest.resolve("https://example.com/sample.jpg");
    });

    expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    expect(saveButton).toBeDisabled();

    await act(async () => {
      saveButton.click();
    });

    expect(mockUploadInspectionImage).toHaveBeenCalledTimes(1);
    expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
  });
});

function getButtonByText(container: HTMLElement, text: RegExp): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) => {
    const label = candidate.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return text.test(label);
  });

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found for pattern: ${text}`);
  }

  return button;
}

async function waitForButton(container: HTMLElement, text: RegExp): Promise<HTMLButtonElement> {
  const timeoutAt = Date.now() + 1000;

  while (Date.now() < timeoutAt) {
    try {
      return getButtonByText(container, text);
    } catch {
      await act(async () => {
        await Promise.resolve();
      });
    }
  }

  throw new Error(`Timed out waiting for button: ${text}`);
}

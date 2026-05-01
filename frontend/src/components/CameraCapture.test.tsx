import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const qualityMocks = vi.hoisted(() => ({
  assessCanvasQuality: vi.fn(() => ({ accepted: false, reasons: ["should not be called for upload"] })),
  assessFileQuality: vi.fn(async () => ({ accepted: true, reasons: [] })),
}));

vi.mock("@/lib/captureQuality", () => qualityMocks);

import { CameraCapture } from "./CameraCapture";

describe("CameraCapture upload flow", () => {
  let container: HTMLDivElement;
  let root: Root;
  const OriginalFileReader = globalThis.FileReader;

  beforeEach(() => {
    qualityMocks.assessCanvasQuality.mockClear();
    qualityMocks.assessFileQuality.mockClear();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    class ImmediateFileReader {
      result: string | ArrayBuffer | null = "data:image/jpeg;base64,mock";
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;

      readAsDataURL(): void {
        if (this.onload) {
          this.onload.call(this as unknown as FileReader, {
            target: this as unknown as FileReader,
          } as ProgressEvent<FileReader>);
        }
      }
    }

    globalThis.FileReader = ImmediateFileReader as unknown as typeof FileReader;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    globalThis.FileReader = OriginalFileReader;
  });

  it("uses the validated uploaded file on confirm without re-checking blank canvas", async () => {
    const onCapture = vi.fn();

    await act(async () => {
      root.render(<CameraCapture onCapture={onCapture} />);
    });

    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("File input not found");
    }

    const file = new File(["sample"], "sample.jpg", { type: "image/jpeg" });
    await act(async () => {
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const usePhotoButton = await waitForButton(container, "Use Photo");
    await act(async () => {
      usePhotoButton.click();
    });

    expect(qualityMocks.assessFileQuality).toHaveBeenCalledTimes(1);
    expect(qualityMocks.assessCanvasQuality).not.toHaveBeenCalled();
    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture.mock.calls[0][0]).toBe(file);
  });
});

async function waitForButton(container: HTMLElement, text: string): Promise<HTMLButtonElement> {
  const timeoutMs = 1000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes(text)
    );

    if (button instanceof HTMLButtonElement) {
      return button;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error(`Button containing "${text}" not found within timeout`);
}

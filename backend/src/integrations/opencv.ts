type OpenCvModule = Record<string, unknown>;

let cachedOpenCv: OpenCvModule | null = null;
let cachedLoadError: Error | null = null;

function hasOpenCvSurface(module: OpenCvModule): boolean {
  return typeof module["Mat"] === "function" && typeof module["cvtColor"] === "function";
}

export async function getOpenCv(): Promise<OpenCvModule> {
  if (cachedOpenCv) {
    return cachedOpenCv;
  }

  if (cachedLoadError) {
    throw cachedLoadError;
  }

  try {
    const imported = await import("@techstark/opencv-js");
    const candidate = ((imported as unknown as { default?: OpenCvModule }).default ??
      (imported as unknown as OpenCvModule)) as OpenCvModule;

    if (!hasOpenCvSurface(candidate)) {
      throw new Error("module loaded but OpenCV symbols are unavailable");
    }

    cachedOpenCv = candidate;
    return cachedOpenCv;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    cachedLoadError = new Error(`OpenCV runtime unavailable: ${detail}`);
    throw cachedLoadError;
  }
}

export function isOpenCvRuntimeError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("OpenCV runtime unavailable:");
}

import type { AnalysisResult } from "@/types/inspection";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

export class AnalysisApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AnalysisApiError";
    this.status = status;
  }
}

export class AnalysisClient {
  private static instance: AnalysisClient;

  private constructor() {}

  static getInstance(): AnalysisClient {
    if (!AnalysisClient.instance) {
      AnalysisClient.instance = new AnalysisClient();
    }
    return AnalysisClient.instance;
  }

  async analyzeImage(imageFile: File, meatType: string): Promise<AnalysisResult> {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("meat_type", meatType);

    const response = await fetch(`${API_BASE_URL}/analysis/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Analysis failed" }));
      const reasonText = Array.isArray(data?.reasons) ? ` ${data.reasons.join(" ")}` : "";
      throw new AnalysisApiError(`${data?.error || "Analysis failed"}${reasonText}`.trim(), response.status);
    }

    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const analysisClient = AnalysisClient.getInstance();

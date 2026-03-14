import type { AnalysisResult } from "@/types/inspection";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export class AnalysisService {
  private static instance: AnalysisService;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = BACKEND_URL;
  }

  static getInstance(): AnalysisService {
    if (!AnalysisService.instance) {
      AnalysisService.instance = new AnalysisService();
    }
    return AnalysisService.instance;
  }

  async analyzeImage(imageFile: File, meatType: string): Promise<AnalysisResult> {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("meat_type", meatType);

    const response = await fetch(`${this.baseUrl}/api/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const analysisService = AnalysisService.getInstance();

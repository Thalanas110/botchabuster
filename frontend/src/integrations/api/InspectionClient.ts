import type { Inspection, InspectionInsert } from "@/types/inspection";
import { IS_DEMO_MODE, demoDelay, DEMO_INSPECTIONS, DEMO_STATS } from "@/lib/demoMode";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
const SESSION_STORAGE_KEY = "meatlens-auth-session";

export type InspectionScope = "mine" | "all";

export class InspectionClient {
  private static instance: InspectionClient;

  private constructor() {}

  static getInstance(): InspectionClient {
    if (!InspectionClient.instance) {
      InspectionClient.instance = new InspectionClient();
    }
    return InspectionClient.instance;
  }

  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    try {
      const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!rawSession) return null;

      const parsedSession = JSON.parse(rawSession) as { access_token?: string | null };
      return parsedSession.access_token ?? null;
    } catch {
      return null;
    }
  }

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    const headers = new Headers(initialHeaders);
    const accessToken = this.getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
  }

  async getAll(limit = 50, offset = 0, scope: InspectionScope = "mine"): Promise<Inspection[]> {
    if (IS_DEMO_MODE) return demoDelay(DEMO_INSPECTIONS.slice(offset, offset + limit));
    const res = await fetch(`${API_BASE_URL}/inspections?limit=${limit}&offset=${offset}&scope=${scope}`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch inspections: ${res.statusText}`);
    return res.json();
  }

  async getById(id: string, scope: InspectionScope = "mine"): Promise<Inspection | null> {
    if (IS_DEMO_MODE) return demoDelay(DEMO_INSPECTIONS.find((i) => i.id === id) ?? null);
    const res = await fetch(`${API_BASE_URL}/inspections/${id}?scope=${scope}`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch inspection: ${res.statusText}`);
    }
    return res.json();
  }

  async create(inspection: InspectionInsert): Promise<Inspection> {
    if (IS_DEMO_MODE) {
      const newItem: Inspection = {
        id: `demo-insp-${Date.now()}`,
        user_id: "demo-user-001",
        lab_l: inspection.lab_l ?? null,
        lab_a: inspection.lab_a ?? null,
        lab_b: inspection.lab_b ?? null,
        glcm_contrast: inspection.glcm_contrast ?? null,
        glcm_correlation: inspection.glcm_correlation ?? null,
        glcm_energy: inspection.glcm_energy ?? null,
        glcm_homogeneity: inspection.glcm_homogeneity ?? null,
        flagged_deviations: inspection.flagged_deviations ?? [],
        explanation: inspection.explanation ?? null,
        image_url: inspection.image_url ?? null,
        location: inspection.location ?? null,
        inspector_notes: inspection.inspector_notes ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        meat_type: inspection.meat_type,
        classification: inspection.classification,
        confidence_score: inspection.confidence_score,
      };
      DEMO_INSPECTIONS.unshift(newItem);
      return demoDelay(newItem);
    }
    const res = await fetch(`${API_BASE_URL}/inspections`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(inspection),
    });
    if (!res.ok) throw new Error(`Failed to create inspection: ${res.statusText}`);
    return res.json();
  }

  async delete(id: string): Promise<void> {
    if (IS_DEMO_MODE) {
      const idx = DEMO_INSPECTIONS.findIndex((i) => i.id === id);
      if (idx !== -1) DEMO_INSPECTIONS.splice(idx, 1);
      return demoDelay(undefined);
    }
    const res = await fetch(`${API_BASE_URL}/inspections/${id}`, {
      method: "DELETE",
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to delete inspection: ${res.statusText}`);
  }

  async getStatistics(scope: InspectionScope = "mine"): Promise<{
    total: number;
    byClassification: Record<string, number>;
  }> {
    if (IS_DEMO_MODE) return demoDelay({ ...DEMO_STATS, byClassification: { ...DEMO_STATS.byClassification } });
    const res = await fetch(`${API_BASE_URL}/inspections/stats?scope=${scope}`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch inspection statistics: ${res.statusText}`);
    return res.json();
  }
}

export const inspectionClient = InspectionClient.getInstance();

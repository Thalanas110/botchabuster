import type { Inspection, InspectionInsert } from "@/types/inspection";

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
    const res = await fetch(`${API_BASE_URL}/inspections?limit=${limit}&offset=${offset}&scope=${scope}`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch inspections: ${res.statusText}`);
    return res.json();
  }

  async getById(id: string, scope: InspectionScope = "mine"): Promise<Inspection | null> {
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
    const res = await fetch(`${API_BASE_URL}/inspections`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(inspection),
    });
    if (!res.ok) throw new Error(`Failed to create inspection: ${res.statusText}`);
    return res.json();
  }

  async delete(id: string): Promise<void> {
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
    const res = await fetch(`${API_BASE_URL}/inspections/stats?scope=${scope}`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch inspection statistics: ${res.statusText}`);
    return res.json();
  }
}

export const inspectionClient = InspectionClient.getInstance();

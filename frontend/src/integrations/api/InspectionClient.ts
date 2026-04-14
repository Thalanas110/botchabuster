import type { Inspection, InspectionInsert } from "@/types/inspection";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

export class InspectionClient {
  private static instance: InspectionClient;

  private constructor() {}

  static getInstance(): InspectionClient {
    if (!InspectionClient.instance) {
      InspectionClient.instance = new InspectionClient();
    }
    return InspectionClient.instance;
  }

  async getAll(limit = 50, offset = 0): Promise<Inspection[]> {
    const res = await fetch(`${API_BASE_URL}/inspections?limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error(`Failed to fetch inspections: ${res.statusText}`);
    return res.json();
  }

  async getById(id: string): Promise<Inspection | null> {
    const res = await fetch(`${API_BASE_URL}/inspections/${id}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch inspection: ${res.statusText}`);
    }
    return res.json();
  }

  async create(inspection: InspectionInsert): Promise<Inspection> {
    const res = await fetch(`${API_BASE_URL}/inspections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inspection),
    });
    if (!res.ok) throw new Error(`Failed to create inspection: ${res.statusText}`);
    return res.json();
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/inspections/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete inspection: ${res.statusText}`);
  }

  async getStatistics(): Promise<{
    total: number;
    byClassification: Record<string, number>;
  }> {
    const res = await fetch(`${API_BASE_URL}/inspections/stats`);
    if (!res.ok) throw new Error(`Failed to fetch inspection statistics: ${res.statusText}`);
    return res.json();
  }
}

export const inspectionClient = InspectionClient.getInstance();

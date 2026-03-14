const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export interface AccessCode {
  id: string;
  code: string;
  description: string | null;
  is_active: boolean;
  times_used: number;
  created_at: string;
}

export class AccessCodeClient {
  private static instance: AccessCodeClient;

  private constructor() {}

  static getInstance(): AccessCodeClient {
    if (!AccessCodeClient.instance) {
      AccessCodeClient.instance = new AccessCodeClient();
    }
    return AccessCodeClient.instance;
  }

  async getAll(): Promise<AccessCode[]> {
    const res = await fetch(`${API_BASE_URL}/access-codes`);
    if (!res.ok) throw new Error(`Failed to fetch access codes: ${res.statusText}`);
    return res.json();
  }

  async create(code: string, description?: string): Promise<AccessCode> {
    const res = await fetch(`${API_BASE_URL}/access-codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, description }),
    });
    if (!res.ok) throw new Error(`Failed to create access code: ${res.statusText}`);
    return res.json();
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/access-codes/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete access code: ${res.statusText}`);
  }

  async toggleActive(id: string, isActive: boolean): Promise<AccessCode> {
    const res = await fetch(`${API_BASE_URL}/access-codes/${id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) throw new Error(`Failed to toggle access code: ${res.statusText}`);
    return res.json();
  }
}

export const accessCodeClient = AccessCodeClient.getInstance();

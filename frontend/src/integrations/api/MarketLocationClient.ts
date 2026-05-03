const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
const SESSION_STORAGE_KEY = "meatlens-auth-session";

export interface MarketLocation {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export class MarketLocationClient {
  private static instance: MarketLocationClient;

  private constructor() {}

  static getInstance(): MarketLocationClient {
    if (!MarketLocationClient.instance) {
      MarketLocationClient.instance = new MarketLocationClient();
    }
    return MarketLocationClient.instance;
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

  async getAll(): Promise<MarketLocation[]> {
    const res = await fetch(`${API_BASE_URL}/market-locations`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch market locations: ${res.statusText}`);
    return res.json();
  }

  async create(name: string): Promise<MarketLocation> {
    const res = await fetch(`${API_BASE_URL}/market-locations`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`Failed to create market location: ${res.statusText}`);
    return res.json();
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/market-locations/${id}`, {
      method: "DELETE",
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to delete market location: ${res.statusText}`);
  }
}

export const marketLocationClient = MarketLocationClient.getInstance();

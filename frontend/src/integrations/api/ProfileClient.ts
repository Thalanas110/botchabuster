const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  inspector_code: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export class ProfileClient {
  private static instance: ProfileClient;

  private constructor() {}

  static getInstance(): ProfileClient {
    if (!ProfileClient.instance) {
      ProfileClient.instance = new ProfileClient();
    }
    return ProfileClient.instance;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const res = await fetch(`${API_BASE_URL}/profiles/${userId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch profile: ${res.statusText}`);
    }
    return res.json();
  }

  async updateProfile(userId: string, updates: Partial<Pick<Profile, "full_name" | "avatar_url" | "location">>): Promise<Profile> {
    const res = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Failed to update profile: ${res.statusText}`);
    return res.json();
  }

  async getAllProfiles(): Promise<Profile[]> {
    const res = await fetch(`${API_BASE_URL}/profiles`);
    if (!res.ok) throw new Error(`Failed to fetch profiles: ${res.statusText}`);
    return res.json();
  }

  async getUserStats(): Promise<{
    total_users: number;
    total_inspections: number;
    roles: { role: string; count: number }[] | null;
  }> {
    const res = await fetch(`${API_BASE_URL}/profiles/stats`);
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
    return res.json();
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/profiles/${userId}/has-role/${role}`);
    if (!res.ok) throw new Error(`Failed to check user role: ${res.statusText}`);
    const { hasRole } = await res.json();
    return hasRole;
  }
}

export const profileClient = ProfileClient.getInstance();

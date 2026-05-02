const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { error?: unknown; message?: unknown };
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch {
    // Ignore JSON parse errors and fall through.
  }

  if (response.statusText && response.statusText.trim().length > 0) {
    return `${fallback}: ${response.statusText}`;
  }

  return fallback;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  inspector_code: string | null;
  is_dark_mode: boolean | null;
  show_detailed_results: boolean | null;
  email?: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  full_name?: string | null;
  inspector_code?: string | null;
  location?: string | null;
  avatar_url?: string | null;
}

export interface AdminUpdateUserPayload {
  email?: string;
  password?: string;
  full_name?: string | null;
  inspector_code?: string | null;
  location?: string | null;
  avatar_url?: string | null;
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
      throw new Error(await readApiError(res, "Failed to fetch profile"));
    }
    return res.json();
  }

  async updateProfile(userId: string, updates: Partial<Pick<Profile, "full_name" | "avatar_url" | "location" | "is_dark_mode" | "show_detailed_results">>): Promise<Profile> {
    const res = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to update profile"));
    return res.json();
  }

  async getAllProfiles(): Promise<Profile[]> {
    const res = await fetch(`${API_BASE_URL}/profiles`);
    if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch profiles"));
    return res.json();
  }

  async createUserByAdmin(payload: AdminCreateUserPayload): Promise<Profile> {
    const res = await fetch(`${API_BASE_URL}/profiles/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to create user"));
    return res.json();
  }

  async updateUserByAdmin(userId: string, payload: AdminUpdateUserPayload): Promise<Profile> {
    const res = await fetch(`${API_BASE_URL}/profiles/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to update user"));
    return res.json();
  }

  async deleteUserByAdmin(userId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/profiles/admin/users/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to delete user"));
  }

  async getUserStats(): Promise<{
    total_users: number;
    total_inspections: number;
    roles: { role: string; count: number }[] | null;
  }> {
    const res = await fetch(`${API_BASE_URL}/profiles/stats`);
    if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch stats"));
    return res.json();
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/profiles/${userId}/has-role/${role}`);
    if (!res.ok) throw new Error(await readApiError(res, "Failed to check user role"));
    const { hasRole } = await res.json();
    return hasRole;
  }
}

export const profileClient = ProfileClient.getInstance();

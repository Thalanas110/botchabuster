import { supabase } from "../integrations/supabase";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  inspector_code: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "moderator" | "user";
}

export class ProfileService {
  private static instance: ProfileService;

  private constructor() {}

  static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
    return data as unknown as Profile | null;
  }

  async updateProfile(userId: string, updates: Partial<Pick<Profile, "full_name" | "avatar_url" | "location">>): Promise<Profile> {
    const { data, error } = await (supabase
      .from("profiles") as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();
    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return data as unknown as Profile;
  }

  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch profiles: ${error.message}`);
    return (data as unknown as Profile[]) ?? [];
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId);
    if (error) throw new Error(`Failed to fetch roles: ${error.message}`);
    return (data as unknown as UserRole[]) ?? [];
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some((r) => r.role === role);
  }

  async getUserStats(): Promise<{
    total_users: number;
    total_inspections: number;
    roles: { role: string; count: number }[] | null;
  }> {
    const { data, error } = await supabase.rpc("get_user_stats");
    if (error) throw new Error(`Failed to fetch stats: ${error.message}`);
    return data as any;
  }
}

export const profileService = ProfileService.getInstance();

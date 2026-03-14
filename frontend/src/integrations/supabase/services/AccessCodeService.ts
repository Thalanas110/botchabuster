import { supabase } from "@/integrations/supabase/client";

export interface AccessCode {
  id: string;
  code: string;
  description: string | null;
  is_active: boolean;
  max_uses: number | null;
  times_used: number;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export class AccessCodeService {
  private static instance: AccessCodeService;
  private constructor() {}

  static getInstance(): AccessCodeService {
    if (!AccessCodeService.instance) {
      AccessCodeService.instance = new AccessCodeService();
    }
    return AccessCodeService.instance;
  }

  async validate(code: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("validate_access_code", { _code: code });
    if (error) throw new Error(`Validation failed: ${error.message}`);
    return data as boolean;
  }

  async getAll(): Promise<AccessCode[]> {
    const { data, error } = await (supabase.from("access_codes") as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch access codes: ${error.message}`);
    return (data ?? []) as AccessCode[];
  }

  async create(code: string, description?: string, maxUses?: number, expiresAt?: string): Promise<AccessCode> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase.from("access_codes") as any)
      .insert({
        code,
        description: description || null,
        max_uses: maxUses || null,
        created_by: user?.id || null,
        expires_at: expiresAt || null,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create access code: ${error.message}`);
    return data as AccessCode;
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await (supabase.from("access_codes") as any)
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw new Error(`Failed to update access code: ${error.message}`);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (supabase.from("access_codes") as any)
      .delete()
      .eq("id", id);
    if (error) throw new Error(`Failed to delete access code: ${error.message}`);
  }
}

export const accessCodeService = AccessCodeService.getInstance();

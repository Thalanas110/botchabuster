import { supabase } from "../integrations/supabase";
import type { Inspection, InspectionInsert } from "../types/inspection";

export class InspectionService {
  private static instance: InspectionService;
  private readonly tableName = "inspections";

  private constructor() {}

  static getInstance(): InspectionService {
    if (!InspectionService.instance) {
      InspectionService.instance = new InspectionService();
    }
    return InspectionService.instance;
  }

  async getAll(limit = 50, offset = 0): Promise<Inspection[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch inspections: ${error.message}`);
    return (data as unknown as Inspection[]) ?? [];
  }

  async getById(id: string): Promise<Inspection | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch inspection: ${error.message}`);
    return data as unknown as Inspection | null;
  }

  async create(inspection: InspectionInsert): Promise<Inspection> {
    const { data, error } = await (supabase
      .from(this.tableName) as any)
      .insert(inspection)
      .select()
      .single();

    if (error) throw new Error(`Failed to create inspection: ${error.message}`);
    return data as unknown as Inspection;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Failed to delete inspection: ${error.message}`);
  }

  async getStatistics(): Promise<{
    total: number;
    byClassification: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("classification");

    if (error) throw new Error(`Failed to fetch statistics: ${error.message}`);

    const records = (data ?? []) as unknown as { classification: string }[];
    const byClassification: Record<string, number> = {};
    for (const record of records) {
      byClassification[record.classification] = (byClassification[record.classification] || 0) + 1;
    }

    return { total: records.length, byClassification };
  }
}

export const inspectionService = InspectionService.getInstance();

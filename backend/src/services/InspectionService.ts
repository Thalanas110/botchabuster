import { supabase } from "../integrations/supabase";
import type { Inspection, InspectionInsert } from "../types/inspection";

type CreateInspectionResult = {
  inspection: Inspection;
  created: boolean;
};

type SupabaseWriteError = {
  code?: string | null;
  message: string;
};

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

  async create(inspection: InspectionInsert): Promise<CreateInspectionResult> {
    const clientSubmissionId = inspection.client_submission_id?.trim();
    if (!clientSubmissionId) {
      throw new Error("client_submission_id is required");
    }

    const existingInspection = await this.getByClientSubmissionId(clientSubmissionId);
    if (existingInspection) {
      return { inspection: existingInspection, created: false };
    }

    const { data, error } = await (supabase
      .from(this.tableName) as any)
      .insert(inspection)
      .select()
      .single();

    if (error) {
      if (this.isDuplicateClientSubmissionError(error)) {
        const duplicateInspection = await this.getByClientSubmissionId(clientSubmissionId);
        if (duplicateInspection) {
          return { inspection: duplicateInspection, created: false };
        }
      }

      throw new Error(`Failed to create inspection: ${error.message}`);
    }

    return { inspection: data as unknown as Inspection, created: true };
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

  private async getByClientSubmissionId(clientSubmissionId: string): Promise<Inspection | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("client_submission_id", clientSubmissionId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch inspection by client submission ID: ${error.message}`);
    return data as unknown as Inspection | null;
  }

  private isDuplicateClientSubmissionError(error: SupabaseWriteError): boolean {
    return error.code === "23505" && error.message.includes("client_submission_id");
  }
}

export const inspectionService = InspectionService.getInstance();

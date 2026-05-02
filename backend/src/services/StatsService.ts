import { supabase } from "../integrations/supabase";

export interface LandingPageStats {
  inspectionCount: number;
  userCount: number;
  freshRate: number;
}

export class StatsService {
  private static instance: StatsService;

  private constructor() {}

  static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  async getLandingPageStats(): Promise<LandingPageStats> {
    try {
      // Total inspections
      const { count: totalInspections } = await supabase
        .from("inspections")
        .select("*", { count: "exact", head: true });

      // Total users (profiles)
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fresh + not-fresh-but-usable rate
      const { data: classData, error } = await supabase
        .from("inspections")
        .select("classification");

      if (error) throw new Error(`Failed to fetch classifications: ${error.message}`);

      let freshRate = 0;
      if (classData && classData.length > 0) {
        const good = (classData as unknown as { classification: string }[]).filter(
          (r) =>
            r.classification === "fresh" ||
            r.classification === "acceptable" ||
            r.classification === "not fresh"
        ).length;
        freshRate = Math.round((good / classData.length) * 100);
      }

      return {
        inspectionCount: totalInspections ?? 0,
        userCount: totalUsers ?? 0,
        freshRate,
      };
    } catch (err) {
      throw new Error(`Failed to fetch landing page stats: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
}

export const statsService = StatsService.getInstance();

import { useMutation } from "@tanstack/react-query";
import { analysisService } from "@/integrations/supabase/services";

export function useAnalyzeImage() {
  return useMutation({
    mutationFn: ({ file, meatType }: { file: File; meatType: string }) =>
      analysisService.analyzeImage(file, meatType),
  });
}

export function useBackendHealth() {
  return useMutation({
    mutationFn: () => analysisService.healthCheck(),
  });
}

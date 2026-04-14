import { useMutation } from "@tanstack/react-query";
import { analysisClient } from "@/integrations/api";

export function useAnalyzeImage() {
  return useMutation({
    mutationFn: ({ file, meatType }: { file: File; meatType: string }) =>
      analysisClient.analyzeImage(file, meatType),
  });
}

export function useBackendHealth() {
  return useMutation({
    mutationFn: () => analysisClient.healthCheck(),
  });
}

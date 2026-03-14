import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inspectionService } from "@/integrations/supabase/services";
import type { InspectionInsert } from "@/types/inspection";

export function useInspections(limit = 50) {
  return useQuery({
    queryKey: ["inspections", limit],
    queryFn: () => inspectionService.getAll(limit),
  });
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: ["inspection", id],
    queryFn: () => inspectionService.getById(id),
    enabled: !!id,
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InspectionInsert) => inspectionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-stats"] });
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inspectionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-stats"] });
    },
  });
}

export function useInspectionStats() {
  return useQuery({
    queryKey: ["inspection-stats"],
    queryFn: () => inspectionService.getStatistics(),
  });
}

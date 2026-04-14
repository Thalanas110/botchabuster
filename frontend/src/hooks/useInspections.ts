import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inspectionClient } from "@/integrations/api";
import type { InspectionInsert } from "@/types/inspection";

export function useInspections(limit = 50) {
  return useQuery({
    queryKey: ["inspections", limit],
    queryFn: () => inspectionClient.getAll(limit),
  });
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: ["inspection", id],
    queryFn: () => inspectionClient.getById(id),
    enabled: !!id,
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InspectionInsert) => inspectionClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-stats"] });
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inspectionClient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-stats"] });
    },
  });
}

export function useInspectionStats() {
  return useQuery({
    queryKey: ["inspection-stats"],
    queryFn: () => inspectionClient.getStatistics(),
  });
}

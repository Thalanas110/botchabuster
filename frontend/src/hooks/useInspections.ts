import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { inspectionClient } from "@/integrations/api";
import type { InspectionInsert } from "@/types/inspection";

export function useInspections(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["inspections", user?.id ?? "anonymous", limit],
    queryFn: () => inspectionClient.getAll(limit),
    enabled: !!user?.id,
  });
}

export function useInspection(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["inspection", user?.id ?? "anonymous", id],
    queryFn: () => inspectionClient.getById(id),
    enabled: !!user?.id && !!id,
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ["inspection-stats", user?.id ?? "anonymous"],
    queryFn: () => inspectionClient.getStatistics(),
    enabled: !!user?.id,
  });
}

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { uploadClient } from "@/integrations/api/UploadClient";
import { inspectionClient } from "@/integrations/api/InspectionClient";
import { auditLogClient } from "@/integrations/api/AuditLogClient";
import { getPendingScans, removeScan, type PendingScan } from "@/lib/offlineQueue";
import { getPendingAuditLogs, removeAuditLog, type PendingAuditLog } from "@/lib/offlineAuditQueue";
import { prewarmModel } from "@/lib/offlineAnalysis";

/**
 * All queued scans now carry a pre-computed analysisResult (either from the
 * backend when online, or from the in-browser analyzeOffline() engine when
 * offline). The sync step only needs to upload the image and persist to DB.
 */
async function processScan(
  scan: PendingScan,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  if (!scan.analysisResult) {
    // Should not happen post-refactor, but guard defensively.
    console.warn("[OfflineSyncManager] Scan missing analysisResult, skipping:", scan.id);
    await removeScan(scan.id);
    return;
  }

  const result = scan.analysisResult;
  const imageFile = new File([scan.imageData], scan.imageName, { type: scan.imageType });

  // Upload image to Supabase Storage (non-fatal).
  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadClient.uploadInspectionImage(imageFile, scan.userId);
  } catch {
    // Save without image rather than blocking.
  }

  await inspectionClient.create({
    user_id: scan.userId,
    client_submission_id: scan.id,
    meat_type: scan.meatType,
    location: scan.location ?? null,
    captured_at: scan.capturedAt ?? scan.queuedAt,
    classification: result.classification,
    confidence_score: result.confidence_score,
    lab_l: result.lab_values.l,
    lab_a: result.lab_values.a,
    lab_b: result.lab_values.b,
    glcm_contrast: result.glcm_features.contrast,
    glcm_correlation: result.glcm_features.correlation,
    glcm_energy: result.glcm_features.energy,
    glcm_homogeneity: result.glcm_features.homogeneity,
    flagged_deviations: result.flagged_deviations,
    explanation: result.explanation,
    image_url: imageUrl,
  });

  await removeScan(scan.id);

  queryClient.invalidateQueries({ queryKey: ["inspections"] });
  queryClient.invalidateQueries({ queryKey: ["inspection-stats"] });

  const label = scan.meatType.charAt(0).toUpperCase() + scan.meatType.slice(1);
  const locationSuffix = scan.location ? ` @ ${scan.location}` : "";
  toast.success(`Synced offline scan: ${label}${locationSuffix} - ${result.classification}`);
}

async function processAuditLogs(logs: PendingAuditLog[]): Promise<void> {
  if (logs.length === 0) return;

  await auditLogClient.createBatch(
    logs.map((log) => ({
      client_event_id: log.id,
      event_type: log.eventType,
      event_time: log.eventTime,
      data: log.data,
      source: { ...(log.source ?? {}), is_offline: true },
    })),
  );

  for (const log of logs) {
    await removeAuditLog(log.id);
  }
}

/**
 * Mount this component once inside <AuthProvider>.
 * - Drains the offline scan queue when the device comes back online.
 * - Pre-warms the MobileNetV3 ONNX model in the background for the next
 *   offline session.
 */
export function OfflineSyncManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isRunning = useRef(false);

  const drainQueue = async () => {
    if (!navigator.onLine) return;
    if (!user) return;
    if (isRunning.current) return;

    isRunning.current = true;
    try {
      const pendingAuditLogs = await getPendingAuditLogs();
      const mineAuditLogs = pendingAuditLogs.filter((log) => log.userId === user.id);
      if (mineAuditLogs.length > 0) {
        await processAuditLogs(mineAuditLogs);
      }

      const pending = await getPendingScans();
      const mine = pending.filter((s) => s.userId === user.id);
      if (mine.length === 0) return;

      toast.info(`Syncing ${mine.length} queued scan${mine.length > 1 ? "s" : ""}...`);

      for (const scan of mine) {
        try {
          await processScan(scan, queryClient);
        } catch (err) {
          console.error("[OfflineSyncManager] Failed to sync scan:", err);
          toast.error("A queued scan failed to sync - will retry when reconnected.");
          break;
        }
      }
    } finally {
      isRunning.current = false;
    }
  };

  useEffect(() => {
    void drainQueue();
    // Start loading MobileNetV3 weights while online.
    prewarmModel();

    const handleOnline = () => {
      void drainQueue();
      prewarmModel();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return null;
}

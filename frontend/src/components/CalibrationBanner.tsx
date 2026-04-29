/**
 * CalibrationBanner
 *
 * Shown in the scan/inspect page when:
 *   - No calibration exists yet, OR
 *   - Existing calibration has expired (> 24 h old)
 *
 * Provides a "Calibrate now" button that opens a simple guided flow:
 *   1. User captures/selects an image with a white card visible
 *   2. calibrateFromImage() detects the card and stores the correction matrix
 *   3. Banner dismisses; subsequent analyzeOffline() calls apply the correction
 *
 * If the user dismisses without calibrating ("Skip"), the banner won't show
 * again for 1 hour (stored in sessionStorage so it resets on app close).
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { calibrateFromImage } from "@/lib/offlineAnalysis/calibration";
import { calibrationTTLMs } from "@/lib/offlineAnalysis/calibrationStore";

const SKIP_KEY = "calibration-skip-until";
const SKIP_DURATION_MS = 60 * 60 * 1000; // 1 hour

export function CalibrationBanner() {
  const [show, setShow] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function check() {
      // Respect "skip" snooze
      const skipUntil = sessionStorage.getItem(SKIP_KEY);
      if (skipUntil && Date.now() < Number(skipUntil)) return;

      const ttl = await calibrationTTLMs();
      setShow(ttl === 0); // 0 means no calibration or expired
    }
    void check();
  }, []);

  const handleSkip = () => {
    sessionStorage.setItem(SKIP_KEY, String(Date.now() + SKIP_DURATION_MS));
    setShow(false);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-selected

    setIsCalibrating(true);
    try {
      const result = await calibrateFromImage(file);
      toast.success(
        `Calibrated — white point R${result.whitePoint.r} G${result.whitePoint.g} B${result.whitePoint.b}. Valid for 24 h.`
      );
      setDialogOpen(false);
      setShow(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Calibration failed. Try again with a clearer white card.");
    } finally {
      setIsCalibrating(false);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Banner */}
      <div className="flex items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          No active calibration — colour accuracy may be reduced under market lighting.
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-amber-400 px-2 text-xs text-amber-800 hover:bg-amber-100 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/40"
          onClick={() => setDialogOpen(true)}
        >
          <ScanLine className="mr-1 h-3 w-3" />
          Calibrate
        </Button>
        <button
          onClick={handleSkip}
          className="ml-1 rounded-sm opacity-60 hover:opacity-100 focus:outline-none"
          aria-label="Dismiss calibration notice for 1 hour"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Calibrate colour balance</DialogTitle>
            <DialogDescription>
              Place a plain white or light-grey card next to the meat sample and
              capture or upload a photo. The app will measure the ambient light
              colour and correct it for the next 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Tips for best results:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Card should fill at least 5% of the frame</li>
              <li>Avoid shadows or direct glare on the card</li>
              <li>Use the same lighting you'll use for scanning</li>
            </ul>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                disabled={isCalibrating}
                onClick={() => fileInputRef.current?.click()}
              >
                {isCalibrating ? "Detecting card…" : "Choose photo to calibrate"}
              </Button>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
    </>
  );
}

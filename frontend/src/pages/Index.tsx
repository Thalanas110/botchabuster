import { useState, useCallback } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { AnalysisResultCard } from "@/components/AnalysisResultCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyzeImage } from "@/hooks/useAnalysis";
import { useCreateInspection } from "@/hooks/useInspections";
import type { AnalysisResult, MeatType } from "@/types/inspection";
import { AnalysisApiError } from "@/integrations/api/AnalysisClient";
import { Loader2, Save, RotateCcw, Microscope, TestTube2, Camera, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { uploadClient } from "@/integrations/api";

const meatTypes: { value: MeatType; label: string }[] = [
  { value: "pork", label: "Pork" },
  { value: "beef", label: "Beef" },
  { value: "chicken", label: "Chicken" },
  { value: "fish", label: "Fish" },
  { value: "other", label: "Other" },
];

const InspectPage = () => {
  const { user } = useAuth();
  const [selectedMeat, setSelectedMeat] = useState<MeatType>("pork");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzeImage = useAnalyzeImage();
  const createInspection = useCreateInspection();

  const handleCapture = useCallback((file: File) => {
    setCapturedFile(file);
    setResult(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!capturedFile) return;
    setIsAnalyzing(true);
    try {
      const analysisResult = await analyzeImage.mutateAsync({
        file: capturedFile,
        meatType: selectedMeat,
      });
      setResult(analysisResult);
      toast.success("Analysis complete");
    } catch (error) {
      setResult(null);
      if (error instanceof AnalysisApiError) {
        toast.error(error.message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Analysis failed");
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [capturedFile, selectedMeat, analyzeImage]);

  const handleSave = useCallback(async () => {
    if (!result || !capturedFile) return;
    if (!user) {
      toast.error("Please sign in to save inspections");
      return;
    }
    try {
      let imageUrl: string | null = null;
      try {
        imageUrl = await uploadClient.uploadInspectionImage(capturedFile, user.id);
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        toast.warning("Image upload failed, saving without image");
      }

      await createInspection.mutateAsync({
        user_id: user.id,
        meat_type: selectedMeat,
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
      toast.success("Inspection saved");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save inspection");
    }
  }, [result, selectedMeat, createInspection, user, capturedFile]);

  const handleReset = useCallback(() => {
    setCapturedFile(null);
    setResult(null);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
        <section className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
                <Microscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold tracking-tight">Inspect</h1>
                <p className="text-xs text-muted-foreground">Capture, analyze, and classify meat freshness</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Sample Type</p>
              <p className="mt-1 font-display text-2xl font-semibold">{selectedMeat}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Capture Status</p>
              <p className="mt-1 font-display text-2xl font-semibold">{capturedFile ? "Ready" : "Waiting"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Analysis Status</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {isAnalyzing ? "Running" : result ? result.classification : "Pending"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Confidence</p>
              <p className="mt-1 font-display text-2xl font-semibold">{result ? `${result.confidence_score}%` : "--"}</p>
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-border/70 bg-card/92 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-display uppercase tracking-wider text-muted-foreground">
              <TestTube2 className="h-4 w-4" />
              Capture Station
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {meatTypes.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSelectedMeat(value)}
                  className={`rounded-xl border px-2 py-2 text-[11px] uppercase tracking-widest transition-colors ${
                    selectedMeat === value
                      ? "border-primary/40 bg-[hsl(var(--primary)/0.16)] text-foreground"
                      : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <CameraCapture onCapture={handleCapture} />

            {capturedFile && !result && (
              <div className="mt-4">
                <Button onClick={handleAnalyze} disabled={isAnalyzing} size="lg" className="w-full gap-2 rounded-xl font-display uppercase tracking-wider">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <ScanLine className="h-5 w-5" /> Analyze Sample
                    </>
                  )}
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border/70 bg-card/92 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold">Analysis Output</h2>
              <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                {result ? "Ready" : "Awaiting"}
              </span>
            </div>

            {result ? (
              <AnalysisResultCard result={result} />
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border/70 bg-background/50 text-center text-muted-foreground">
                <Camera className="mb-3 h-10 w-10" />
                <p className="font-display text-sm uppercase tracking-wider">No analysis yet</p>
                <p className="mt-1 max-w-xs text-xs">Capture a sample and run analysis to view freshness classification and metrics.</p>
              </div>
            )}
          </section>
        </div>

        {result && (
          <section className="mt-4 rounded-3xl border border-border/70 bg-card/92 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={handleReset} className="flex-1 gap-2 rounded-xl">
                <RotateCcw className="h-4 w-4" /> New Scan
              </Button>
              <Button onClick={handleSave} disabled={createInspection.isPending} className="flex-1 gap-2 rounded-xl">
                {createInspection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Record
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default InspectPage;

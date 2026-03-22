import { useState, useCallback } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { AnalysisResultCard } from "@/components/AnalysisResultCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyzeImage } from "@/hooks/useAnalysis";
import { useCreateInspection } from "@/hooks/useInspections";
import type { AnalysisResult, MeatType } from "@/types/inspection";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
    } catch {
      // Mock result for demo when backend isn't running
      const mockResult: AnalysisResult = {
        classification: (["fresh", "acceptable", "warning", "spoiled"] as const)[
          Math.floor(Math.random() * 4)
        ],
        confidence_score: Math.round(70 + Math.random() * 25),
        lab_values: {
          l: 45 + Math.random() * 20,
          a: 10 + Math.random() * 15,
          b: 8 + Math.random() * 12,
        },
        glcm_features: {
          contrast: Math.random() * 50,
          correlation: 0.8 + Math.random() * 0.19,
          energy: 0.1 + Math.random() * 0.4,
          homogeneity: 0.5 + Math.random() * 0.45,
        },
        flagged_deviations: [
          "Surface discoloration detected in ROI-3",
          "Moisture index above DOH threshold",
        ],
        explanation:
          "Color analysis indicates slight deviation from DOH freshness standards. Lab* a-channel shows elevated values suggesting early oxidation. GLCM texture features show moderate surface irregularity consistent with initial moisture loss.",
      };
      setResult(mockResult);
      toast.info("Using simulated analysis (backend offline)");
    } finally {
      setIsAnalyzing(false);
    }
  }, [capturedFile, selectedMeat, analyzeImage]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    if (!user) {
      toast.error("Please sign in to save inspections");
      return;
    }
    try {
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
      });
      toast.success("Inspection saved");
    } catch {
      toast.error("Failed to save — sign in required");
    }
  }, [result, selectedMeat, createInspection, user]);

  const handleReset = useCallback(() => {
    setCapturedFile(null);
    setResult(null);
  }, []);

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Meat Inspector" subtitle="Capture · Analyze · Classify" />

      <div className="px-4 space-y-4">
        {/* Meat Type Selector */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-display uppercase tracking-widest text-muted-foreground">
              Sample Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {meatTypes.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={selectedMeat === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMeat(value)}
                  className="font-display text-xs uppercase tracking-wider"
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Camera */}
        <CameraCapture onCapture={handleCapture} />

        {/* Analyze Button */}
        {capturedFile && !result && (
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            size="lg"
            className="w-full gap-2 font-display uppercase tracking-wider"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Processing...
              </>
            ) : (
              "Analyze Sample"
            )}
          </Button>
        )}

        {/* Results */}
        {result && (
          <>
            <AnalysisResultCard result={result} />
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1 gap-2">
                <RotateCcw className="h-4 w-4" /> New Scan
              </Button>
              <Button
                onClick={handleSave}
                disabled={createInspection.isPending}
                className="flex-1 gap-2"
              >
                <Save className="h-4 w-4" /> Save Record
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InspectPage;

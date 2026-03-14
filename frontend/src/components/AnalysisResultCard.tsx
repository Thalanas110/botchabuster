import type { AnalysisResult } from "@/types/inspection";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AnalysisResultCardProps {
  result: AnalysisResult;
  className?: string;
}

export function AnalysisResultCard({ result, className }: AnalysisResultCardProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Classification Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display uppercase tracking-wider">
              Classification
            </CardTitle>
            <FreshnessBadge classification={result.classification} size="lg" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
                Confidence
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${result.confidence_score}%` }}
                  />
                </div>
                <span className="font-display text-sm font-bold">{result.confidence_score}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lab* Color Values */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display uppercase tracking-wider">
            Lab* Color Space
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <MetricCard label="L*" value={result.lab_values.l.toFixed(2)} />
            <MetricCard label="a*" value={result.lab_values.a.toFixed(2)} />
            <MetricCard label="b*" value={result.lab_values.b.toFixed(2)} />
          </div>
        </CardContent>
      </Card>

      {/* GLCM Texture Features */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display uppercase tracking-wider">
            GLCM Texture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Contrast" value={result.glcm_features.contrast.toFixed(4)} />
            <MetricCard label="Correlation" value={result.glcm_features.correlation.toFixed(4)} />
            <MetricCard label="Energy" value={result.glcm_features.energy.toFixed(4)} />
            <MetricCard label="Homogeneity" value={result.glcm_features.homogeneity.toFixed(4)} />
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display uppercase tracking-wider">
            Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-secondary-foreground leading-relaxed">{result.explanation}</p>
          {result.flagged_deviations.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-display uppercase tracking-widest text-warning mb-2">
                Flagged Deviations
              </p>
              <ul className="space-y-1">
                {result.flagged_deviations.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-warning mt-0.5">▲</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import { InspectionListItem } from "@/components/InspectionListItem";
import { useInspections } from "@/hooks/useInspections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, Search, CalendarDays, BarChart3, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import type { FreshnessClassification } from "@/types/inspection";
import { format } from "date-fns";

type FilterOption = "all" | FreshnessClassification;

const filterOptions: { key: FilterOption; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fresh", label: "Fresh" },
  { key: "acceptable", label: "Acceptable" },
  { key: "warning", label: "Warning" },
  { key: "spoiled", label: "Spoiled" },
];

const HistoryPage = () => {
  const { data: inspections, isLoading } = useInspections();
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;

  const totalInspections = inspections?.length ?? 0;

  const avgConfidence = useMemo(() => {
    if (!inspections?.length) return 0;
    return Math.round(inspections.reduce((sum, item) => sum + item.confidence_score, 0) / inspections.length);
  }, [inspections]);

  const classificationCounts = useMemo(() => {
    const counts: Record<FreshnessClassification, number> = {
      fresh: 0,
      acceptable: 0,
      warning: 0,
      spoiled: 0,
    };
    (inspections ?? []).forEach((item) => {
      counts[item.classification] += 1;
    });
    return counts;
  }, [inspections]);

  const freshRate = useMemo(() => {
    if (!totalInspections) return 0;
    return Math.round((classificationCounts.fresh / totalInspections) * 100);
  }, [classificationCounts.fresh, totalInspections]);

  const spoiledRate = useMemo(() => {
    if (!totalInspections) return 0;
    return Math.round((classificationCounts.spoiled / totalInspections) * 100);
  }, [classificationCounts.spoiled, totalInspections]);

  const filteredInspections = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return (inspections ?? []).filter((item) => {
      const matchesFilter = activeFilter === "all" || item.classification === activeFilter;
      if (!matchesFilter) return false;
      if (!query) return true;

      const haystack = [
        item.meat_type,
        item.location ?? "",
        item.classification,
        item.id,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [inspections, activeFilter, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredInspections.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedInspections = filteredInspections.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const monthlyCounts = useMemo(() => {
    const monthMap = new Map<string, number>();
    (inspections ?? []).forEach((item) => {
      const monthKey = format(new Date(item.created_at), "MMMM yyyy");
      monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1);
    });
    return Array.from(monthMap.entries()).map(([label, count]) => ({ label, count })).slice(0, 6);
  }, [inspections]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
        <section className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold tracking-tight">History</h1>
                <p className="text-xs text-muted-foreground">Inspection records and timeline insights</p>
              </div>
            </div>

            <div className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
              <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
              {format(new Date(), "MMMM yyyy")}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total Records</p>
              <p className="mt-1 font-display text-3xl font-semibold">{totalInspections}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Avg Confidence</p>
              <p className="mt-1 font-display text-3xl font-semibold">{avgConfidence}%</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Fresh Rate</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-display text-3xl font-semibold">{freshRate}%</p>
                <CheckCircle2 className="h-4 w-4 text-fresh" />
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Spoiled Rate</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-display text-3xl font-semibold">{spoiledRate}%</p>
                {spoiledRate > 20 ? <AlertTriangle className="h-4 w-4 text-spoiled" /> : <CheckCircle2 className="h-4 w-4 text-fresh" />}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-3xl border border-border/70 bg-card/92 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold">Inspection Timeline</h2>
              <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                {filteredInspections.length} shown
              </span>
            </div>

            <div className="mt-3 rounded-2xl border border-border/70 bg-background/50 p-2">
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-2 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by meat type, location, ID..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => { setActiveFilter(option.key); setCurrentPage(1); }}
                    className={`rounded-xl border px-2 py-2 text-[11px] uppercase tracking-widest transition-colors ${
                      activeFilter === option.key
                        ? "border-primary/40 bg-[hsl(var(--primary)/0.16)] text-foreground"
                        : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !filteredInspections.length ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-background/55 py-16 text-muted-foreground">
                  <ClipboardList className="mb-3 h-12 w-12" />
                  <p className="font-display text-sm uppercase tracking-wider">No matching inspections</p>
                  <p className="mt-1 text-xs">Try a different filter or search term</p>
                </div>
              ) : (
                <>
                  {pagedInspections.map((inspection) => <InspectionListItem key={inspection.id} inspection={inspection} />)}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 rounded-xl"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" /> Prev
                      </Button>
                      <span className="font-display text-xs text-muted-foreground uppercase tracking-wider">
                        {safePage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 rounded-xl"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <Card className="rounded-3xl border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
                  <BarChart3 className="h-4 w-4" />
                  Classification Mix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["fresh", "acceptable", "warning", "spoiled"] as FreshnessClassification[]).map((c) => {
                  const count = classificationCounts[c] || 0;
                  const pct = totalInspections > 0 ? (count / totalInspections) * 100 : 0;
                  return (
                    <div key={c}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-display text-xs uppercase tracking-wider">{c}</span>
                        <span className="font-display text-xs text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all ${
                            c === "fresh"
                              ? "bg-fresh"
                              : c === "acceptable"
                                ? "bg-acceptable"
                                : c === "warning"
                                  ? "bg-warning"
                                  : "bg-spoiled"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle className="text-sm font-display uppercase tracking-wider">Recent Activity by Month</CardTitle>
              </CardHeader>
              <CardContent>
                {!monthlyCounts.length ? (
                  <p className="py-4 text-sm text-muted-foreground">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {monthlyCounts.map((month) => (
                      <div key={month.label} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/55 px-3 py-2.5">
                        <span className="text-xs text-muted-foreground">{month.label}</span>
                        <span className="font-display text-sm font-semibold">{month.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;

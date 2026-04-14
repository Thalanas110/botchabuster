import { useState, useEffect, useMemo } from "react";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { profileClient, type Profile } from "@/integrations/api/ProfileClient";
import { inspectionClient } from "@/integrations/api/InspectionClient";
import { accessCodeClient, type AccessCode } from "@/integrations/api/AccessCodeClient";
import type { Inspection, FreshnessClassification } from "@/types/inspection";
import {
  Loader2,
  Trash2,
  ClipboardList,
  Download,
  KeyRound,
  Plus,
  Copy,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  LayoutGrid,
  Users,
  RefreshCcw,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfDay, isAfter } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

type RoleStat = {
  role: string;
  count: number;
};

const classColors: Record<FreshnessClassification, string> = {
  fresh: "bg-fresh",
  acceptable: "bg-acceptable",
  warning: "bg-warning",
  spoiled: "bg-spoiled",
};

const PIE_COLORS: Record<FreshnessClassification, string> = {
  fresh: "hsl(142, 71%, 45%)",
  acceptable: "hsl(48, 96%, 53%)",
  warning: "hsl(25, 95%, 53%)",
  spoiled: "hsl(0, 84%, 60%)",
};

const tabs = [
  { key: "overview" as const, label: "Overview", icon: LayoutGrid },
  { key: "users" as const, label: "Users", icon: Users },
  { key: "inspections" as const, label: "Inspections", icon: ClipboardList },
  { key: "codes" as const, label: "Access Codes", icon: KeyRound },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [stats, setStats] = useState<{ total_users: number; total_inspections: number; roles: RoleStat[] | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "inspections" | "codes">("overview");
  const [newCode, setNewCode] = useState("");
  const [newCodeDesc, setNewCodeDesc] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileData, inspectionData, statsData, codesData] = await Promise.all([
        profileClient.getAllProfiles(),
        inspectionClient.getAll(200),
        profileClient.getUserStats(),
        accessCodeClient.getAll(),
      ]);
      setProfiles(profileData);
      setInspections(inspectionData);
      setStats(statsData);
      setAccessCodes(codesData);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const classificationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    inspections.forEach((i) => {
      counts[i.classification] = (counts[i.classification] || 0) + 1;
    });
    return counts;
  }, [inspections]);

  const pieData = useMemo(() => {
    return (["fresh", "acceptable", "warning", "spoiled"] as FreshnessClassification[]).map((c) => ({
      name: c.charAt(0).toUpperCase() + c.slice(1),
      value: classificationCounts[c] || 0,
      fill: PIE_COLORS[c],
    }));
  }, [classificationCounts]);

  const dailyInspections = useMemo(() => {
    const days = 14;
    const result: { date: string; count: number; fresh: number; spoiled: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayEnd = startOfDay(subDays(new Date(), i - 1));
      const dayInspections = inspections.filter((ins) => {
        const d = new Date(ins.created_at);
        return d >= day && d < dayEnd;
      });
      result.push({
        date: format(day, "MMM d"),
        count: dayInspections.length,
        fresh: dayInspections.filter((x) => x.classification === "fresh").length,
        spoiled: dayInspections.filter((x) => x.classification === "spoiled").length,
      });
    }
    return result;
  }, [inspections]);

  const avgConfidence = useMemo(() => {
    if (inspections.length === 0) return 0;
    return Math.round(inspections.reduce((s, i) => s + i.confidence_score, 0) / inspections.length);
  }, [inspections]);

  const spoiledRate = useMemo(() => {
    if (inspections.length === 0) return 0;
    return Math.round(((classificationCounts["spoiled"] || 0) / inspections.length) * 100);
  }, [classificationCounts, inspections.length]);

  const recentTrend = useMemo(() => {
    const last7 = inspections.filter((i) => isAfter(new Date(i.created_at), subDays(new Date(), 7))).length;
    const prev7 = inspections.filter((i) => {
      const d = new Date(i.created_at);
      return isAfter(d, subDays(new Date(), 14)) && !isAfter(d, subDays(new Date(), 7));
    }).length;
    if (prev7 === 0) return last7 > 0 ? 100 : 0;
    return Math.round(((last7 - prev7) / prev7) * 100);
  }, [inspections]);

  const chartConfig = {
    count: { label: "Inspections", color: "hsl(var(--primary))" },
    fresh: { label: "Fresh", color: PIE_COLORS.fresh },
    spoiled: { label: "Spoiled", color: PIE_COLORS.spoiled },
    value: { label: "Count", color: "hsl(var(--primary))" },
  };

  const handleDeleteInspection = async (id: string) => {
    try {
      await inspectionClient.delete(id);
      setInspections((prev) => prev.filter((i) => i.id !== id));
      toast.success("Inspection deleted");
    } catch {
      toast.error("Failed to delete inspection");
    }
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Meat Type", "Classification", "Confidence", "L*", "a*", "b*", "Contrast", "Correlation", "Energy", "Homogeneity", "Date"];
    const rows = inspections.map((i) => [
      i.id,
      i.meat_type,
      i.classification,
      i.confidence_score,
      i.lab_l,
      i.lab_a,
      i.lab_b,
      i.glcm_contrast,
      i.glcm_correlation,
      i.glcm_energy,
      i.glcm_homogeneity,
      i.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MeatLens-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleCreateCode = async () => {
    if (!newCode.trim()) {
      toast.error("Code cannot be empty");
      return;
    }
    try {
      const created = await accessCodeClient.create(newCode.trim(), newCodeDesc.trim() || undefined);
      setAccessCodes((prev) => [created, ...prev]);
      setNewCode("");
      setNewCodeDesc("");
      toast.success("Access code created");
    } catch {
      toast.error("Failed to create code");
    }
  };

  const handleDeleteCode = async (id: string) => {
    try {
      await accessCodeClient.delete(id);
      setAccessCodes((prev) => prev.filter((c) => c.id !== id));
      toast.success("Code deleted");
    } catch {
      toast.error("Failed to delete code");
    }
  };

  const handleToggleCode = async (id: string, active: boolean) => {
    try {
      await accessCodeClient.toggleActive(id, active);
      setAccessCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: active } : c)));
    } catch {
      toast.error("Failed to update code");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const ActiveTabIcon = activeTabConfig.icon;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 pt-4">
        <section className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.15)]">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold tracking-tight">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">System management and analytics hub</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void loadData()} className="gap-2 rounded-xl">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleExportCSV} className="gap-2 rounded-xl">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total Users</p>
              <p className="mt-1 font-display text-3xl font-semibold">{stats?.total_users || 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total Inspections</p>
              <p className="mt-1 font-display text-3xl font-semibold">{stats?.total_inspections || 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Avg Confidence</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-display text-3xl font-semibold">{avgConfidence}%</p>
                <CheckCircle className="h-4 w-4 text-fresh" />
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Spoiled Rate</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-display text-3xl font-semibold">{spoiledRate}%</p>
                {spoiledRate > 20 ? <AlertTriangle className="h-4 w-4 text-spoiled" /> : <CheckCircle className="h-4 w-4 text-fresh" />}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-border/70 bg-background/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">7-Day Movement vs Previous Week</p>
                <p className="font-display text-lg font-semibold">{recentTrend >= 0 ? "+" : ""}{recentTrend}% inspections</p>
              </div>
              {recentTrend >= 0 ? <TrendingUp className="h-8 w-8 text-fresh" /> : <TrendingDown className="h-8 w-8 text-warning" />}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-border/70 bg-card/85 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group flex w-full items-center justify-between rounded-2xl border border-primary/40 bg-[hsl(var(--primary)/0.16)] px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--primary)/0.20)]"
              >
                <span className="flex items-center gap-2">
                  <ActiveTabIcon className="h-4 w-4 text-foreground" />
                  <span className="font-display text-sm uppercase tracking-wider text-foreground">{activeTabConfig.label}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)] rounded-2xl border-border/70 bg-card/95 p-1">
              {tabs.map(({ key, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => setActiveTab(key)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 font-display text-xs uppercase tracking-wider ${
                    activeTab === key ? "bg-[hsl(var(--primary)/0.16)] text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        <div className="mt-4 space-y-4">
          {activeTab === "overview" && (
            <>
              <div className="grid min-w-0 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-sm font-display uppercase tracking-wider">Daily Inspections (14 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0">
                      <AreaChart data={dailyInspections}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-sm font-display uppercase tracking-wider">Classification Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                          {pieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-sm font-display uppercase tracking-wider">Classification Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["fresh", "acceptable", "warning", "spoiled"] as FreshnessClassification[]).map((c) => {
                    const count = classificationCounts[c] || 0;
                    const pct = inspections.length > 0 ? (count / inspections.length) * 100 : 0;
                    return (
                      <div key={c}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-display text-xs uppercase tracking-wider">{c}</span>
                          <span className="font-display text-xs text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div className={`h-full rounded-full transition-all ${classColors[c]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {stats?.roles && (
                <Card className="rounded-3xl border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-sm font-display uppercase tracking-wider">Users by Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {stats.roles.map((r) => (
                        <div key={r.role} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{r.role}</p>
                          <p className="mt-1 font-display text-2xl font-semibold">{r.count}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "users" && (
            <Card className="rounded-3xl border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
                  <Users className="h-4 w-4" />
                  Registered Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profiles.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No users found</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {profiles.map((p) => (
                      <div key={p.id} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-base font-semibold">{p.full_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">{p.location || "No location"}</p>
                          </div>
                          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {p.id === user?.id ? "You" : "User"}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <p>Joined: {format(new Date(p.created_at), "MMM d, yyyy")}</p>
                          <p className="break-all">Inspector Code: {p.inspector_code || "N/A"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "inspections" && (
            <Card className="rounded-3xl border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
                  <ClipboardList className="h-4 w-4" />
                  All Inspections
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inspections.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No inspections yet</p>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {inspections.map((i) => (
                      <div key={i.id} className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-background/50 p-3">
                        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
                          {i.image_url ? (
                            <button
                              type="button"
                              className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border/70 touch-manipulation cursor-zoom-in sm:h-16 sm:w-16"
                              onClick={() => setPreviewImageUrl(i.image_url)}
                              onTouchEnd={() => setPreviewImageUrl(i.image_url)}
                              aria-label="View full inspection image"
                            >
                              <img src={i.image_url} alt="Sample" className="h-full w-full object-cover" />
                            </button>
                          ) : (
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-border/70 bg-secondary sm:h-16 sm:w-16">
                              <span className="font-display text-lg text-muted-foreground">{i.meat_type[0].toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="truncate font-display text-sm font-semibold capitalize">{i.meat_type}</span>
                              <FreshnessBadge classification={i.classification} size="sm" />
                            </div>
                            <p className="text-xs text-muted-foreground">{format(new Date(i.created_at), "MMM d, yyyy h:mm a")}</p>
                            <p className="text-xs text-muted-foreground">Confidence: {i.confidence_score}%</p>
                            <p className="truncate text-[10px] text-muted-foreground">ID: {i.id}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-xl border-border/70 text-destructive hover:text-destructive sm:h-9 sm:w-9"
                            onClick={() => void handleDeleteInspection(i.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "codes" && (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-sm font-display uppercase tracking-wider">Create Access Code</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Code</Label>
                    <Input
                      placeholder="e.g. INSPECTOR-2026"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="h-10 rounded-xl font-display tracking-wider"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Description</Label>
                    <Input
                      placeholder="Batch for Region V"
                      value={newCodeDesc}
                      onChange={(e) => setNewCodeDesc(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <Button size="sm" onClick={handleCreateCode} className="h-10 rounded-xl gap-1">
                    <Plus className="h-4 w-4" />
                    Generate
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-sm font-display uppercase tracking-wider">Manage Access Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  {accessCodes.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No access codes yet</p>
                  ) : (
                    <div className="space-y-3">
                      {accessCodes.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="font-display text-sm font-semibold tracking-wider">{c.code}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${c.is_active ? "bg-fresh/20 text-fresh" : "bg-muted text-muted-foreground"}`}>
                                  {c.is_active ? "Active" : "Disabled"}
                                </span>
                              </div>
                              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                              <p className="mt-1 text-[10px] text-muted-foreground">Used {c.times_used}x - Created {format(new Date(c.created_at), "MMM d, yyyy")}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(c.code);
                                    toast.success("Code copied");
                                  } catch {
                                    toast.error("Failed to copy code");
                                  }
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-xs font-display"
                                onClick={() => void handleToggleCode(c.id, !c.is_active)}
                              >
                                {c.is_active ? "OFF" : "ON"}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                                onClick={() => void handleDeleteCode(c.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(previewImageUrl)} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="w-[min(96vw,980px)] max-w-5xl border-none bg-transparent p-0 shadow-none">
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Inspection full view"
              className="max-h-[85vh] w-full rounded-2xl border border-border/70 bg-black/60 object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;

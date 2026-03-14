import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { profileClient, type Profile } from "@/integrations/api/ProfileClient";
import { inspectionClient } from "@/integrations/api/InspectionClient";
import { accessCodeClient, type AccessCode } from "@/integrations/api/AccessCodeClient";
import type { Inspection, FreshnessClassification } from "@/types/inspection";
import { Loader2, Trash2, Users, ClipboardList, Download, KeyRound, Plus, Copy, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfDay, isAfter } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

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

const AdminDashboard = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [stats, setStats] = useState<{ total_users: number; total_inspections: number; roles: any[] | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "inspections" | "codes">("overview");
  const [newCode, setNewCode] = useState("");
  const [newCodeDesc, setNewCodeDesc] = useState("");

  useEffect(() => {
    loadData();
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

  // ─── Derived analytics ───
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

  const meatTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    inspections.forEach((i) => {
      counts[i.meat_type] = (counts[i.meat_type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value);
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

  const confidenceTrend = useMemo(() => {
    const days = 14;
    const result: { date: string; avg: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayEnd = startOfDay(subDays(new Date(), i - 1));
      const dayInspections = inspections.filter((ins) => {
        const d = new Date(ins.created_at);
        return d >= day && d < dayEnd;
      });
      const avg = dayInspections.length > 0
        ? Math.round(dayInspections.reduce((s, x) => s + x.confidence_score, 0) / dayInspections.length)
        : 0;
      result.push({ date: format(day, "MMM d"), avg });
    }
    return result.filter((d) => d.avg > 0);
  }, [inspections]);

  const chartConfig = {
    count: { label: "Inspections", color: "hsl(var(--primary))" },
    fresh: { label: "Fresh", color: PIE_COLORS.fresh },
    spoiled: { label: "Spoiled", color: PIE_COLORS.spoiled },
    avg: { label: "Avg Confidence", color: "hsl(var(--primary))" },
    value: { label: "Count", color: "hsl(var(--primary))" },
  };

  // ─── Handlers ───
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
      i.id, i.meat_type, i.classification, i.confidence_score,
      i.lab_l, i.lab_a, i.lab_b,
      i.glcm_contrast, i.glcm_correlation, i.glcm_energy, i.glcm_homogeneity,
      i.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meatguard-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleCreateCode = async () => {
    if (!newCode.trim()) { toast.error("Code cannot be empty"); return; }
    try {
      const created = await accessCodeClient.create(newCode.trim(), newCodeDesc.trim() || undefined);
      setAccessCodes((prev) => [created, ...prev]);
      setNewCode("");
      setNewCodeDesc("");
      toast.success("Access code created");
    } catch { toast.error("Failed to create code"); }
  };

  const handleDeleteCode = async (id: string) => {
    try {
      await accessCodeClient.delete(id);
      setAccessCodes((prev) => prev.filter((c) => c.id !== id));
      toast.success("Code deleted");
    } catch { toast.error("Failed to delete code"); }
  };

  const handleToggleCode = async (id: string, active: boolean) => {
    try {
      await accessCodeClient.toggleActive(id, active);
      setAccessCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: active } : c)));
    } catch { toast.error("Failed to update code"); }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "users" as const, label: "Users" },
    { key: "inspections" as const, label: "Inspections" },
    { key: "codes" as const, label: "Access Codes" },
  ];

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Admin Dashboard" subtitle="System management & analytics">
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 font-display text-xs uppercase tracking-wider">
          <Download className="h-4 w-4" /> Export
        </Button>
      </PageHeader>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md px-3 py-2 font-display text-xs uppercase tracking-wider transition-colors ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {activeTab === "overview" && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard label="Total Users" value={stats?.total_users || 0} />
              <MetricCard label="Total Inspections" value={stats?.total_inspections || 0} />
              <Card className="p-4">
                <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-1">Avg Confidence</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-display font-bold">{avgConfidence}%</p>
                  <CheckCircle className="h-4 w-4 text-fresh" />
                </div>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-1">Spoiled Rate</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-display font-bold">{spoiledRate}%</p>
                  {spoiledRate > 20 ? (
                    <AlertTriangle className="h-4 w-4 text-spoiled" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-fresh" />
                  )}
                </div>
              </Card>
            </div>

            {/* Weekly trend badge */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">7-Day Trend vs Prior Week</p>
                  <p className="text-lg font-display font-bold mt-1">
                    {recentTrend >= 0 ? "+" : ""}{recentTrend}% inspections
                  </p>
                </div>
                {recentTrend >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-fresh" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-warning" />
                )}
              </div>
            </Card>

            {/* Daily Inspections Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                  Daily Inspections (14 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <AreaChart data={dailyInspections}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="count" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Fresh vs Spoiled Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                  Fresh vs Spoiled (14 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <BarChart data={dailyInspections}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="fresh" fill={PIE_COLORS.fresh} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="spoiled" fill={PIE_COLORS.spoiled} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Classification Pie */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                    Classification Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Meat Type Bar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                    Inspections by Meat Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <BarChart data={meatTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Confidence Trend */}
            {confidenceTrend.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                    Avg Confidence Score Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <LineChart data={confidenceTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Classification bar breakdown (original) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                  Classification Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["fresh", "acceptable", "warning", "spoiled"] as FreshnessClassification[]).map((c) => {
                  const count = classificationCounts[c] || 0;
                  const pct = inspections.length > 0 ? (count / inspections.length) * 100 : 0;
                  return (
                    <div key={c}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display text-xs uppercase tracking-wider capitalize">{c}</span>
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
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                    Users by Role
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {stats.roles.map((r: any) => (
                      <MetricCard key={r.role} label={r.role} value={r.count} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === "users" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
                <Users className="h-4 w-4" /> Registered Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No users found</p>
              ) : (
                profiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="font-display text-sm font-semibold">{p.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{p.location || "No location"}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Joined {format(new Date(p.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-xs font-display text-muted-foreground uppercase tracking-wider">
                      {p.id === user?.id ? "You" : "User"}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "inspections" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
                <ClipboardList className="h-4 w-4" /> All Inspections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inspections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No inspections yet</p>
              ) : (
                inspections.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display text-sm font-semibold capitalize">{i.meat_type}</span>
                        <FreshnessBadge classification={i.classification} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(i.created_at), "MMM d, yyyy · h:mm a")}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">ID: {i.id.slice(0, 8)}...</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold">{i.confidence_score}%</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteInspection(i.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "codes" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
                <KeyRound className="h-4 w-4" /> Manage Access Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create new code */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">Create New Code</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Code</Label>
                    <Input
                      placeholder="e.g. INSPECTOR-2026"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="font-display tracking-wider text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description (optional)</Label>
                    <Input
                      placeholder="Batch for Region V"
                      value={newCodeDesc}
                      onChange={(e) => setNewCodeDesc(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={handleCreateCode} className="gap-1 font-display text-xs uppercase tracking-wider">
                  <Plus className="h-3.5 w-3.5" /> Generate
                </Button>
              </div>

              {/* List codes */}
              {accessCodes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No access codes yet</p>
              ) : (
                accessCodes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display text-sm font-bold tracking-wider">{c.code}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-display uppercase tracking-wider ${
                          c.is_active ? "bg-fresh/20 text-fresh" : "bg-muted text-muted-foreground"
                        }`}>
                          {c.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Used {c.times_used}× · Created {format(new Date(c.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied!"); }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleCode(c.id, !c.is_active)}
                      >
                        <span className="text-[10px] font-display">{c.is_active ? "OFF" : "ON"}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCode(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

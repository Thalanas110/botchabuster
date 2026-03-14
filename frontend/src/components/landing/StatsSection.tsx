import { useEffect, useState, useMemo } from "react";
import { Users, ClipboardCheck, TrendingUp } from "lucide-react";
import { statsClient } from "@/integrations/api";

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const duration = 1500;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <span className="font-display text-3xl md:text-4xl font-bold text-primary">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export function StatsSection() {
  const [inspectionCount, setInspectionCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [freshRate, setFreshRate] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      try {
        const stats = await statsClient.getLandingPageStats();
        setInspectionCount(stats.inspectionCount);
        setUserCount(stats.userCount);
        setFreshRate(stats.freshRate);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    }
    fetchStats();
  }, []);

  const stats = useMemo(
    () => [
      { icon: Users, value: userCount, suffix: "+", label: "Registered Inspectors" },
      { icon: ClipboardCheck, value: inspectionCount, suffix: "+", label: "Inspections Completed" },
      { icon: TrendingUp, value: freshRate, suffix: "%", label: "Fresh Detection Rate" },
    ],
    [userCount, inspectionCount, freshRate]
  );

  return (
    <section className="px-6 py-16 border-t border-border bg-card/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-xs uppercase tracking-widest text-muted-foreground text-center mb-10">
          Trusted by Inspectors Nationwide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="h-8 w-8 text-primary mx-auto mb-3 opacity-70" />
              <AnimatedCounter target={s.value} suffix={s.suffix} />
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

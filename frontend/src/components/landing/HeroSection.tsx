import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, ChevronRight, Bot, User, Send } from "lucide-react";

export function HeroSection() {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden px-6 py-16 md:py-24">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left — Copy */}
        <div className="text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-6">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-display text-xs uppercase tracking-widest text-primary">
              AI-Powered Inspection
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight leading-[1.1]">
            Assess Meat Freshness,{" "}
            <span className="text-primary">One Scan at a Time</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-lg leading-relaxed">
            MeatLens helps inspectors and consumers objectively evaluate meat
            freshness using Lab* color analysis and GLCM texture features —
            benchmarked against DOH standards.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={user ? "/inspect" : "/signup"}>
              <Button size="lg" className="font-display uppercase tracking-wider gap-2 px-8 text-sm">
                {user ? "Start Inspecting" : "Get Started Free"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={user ? "/history" : "/login"}>
              <Button variant="ghost" size="lg" className="font-display uppercase tracking-wider px-6 text-sm">
                {user ? "View History" : "Learn More"}
              </Button>
            </Link>
          </div>
        </div>

        {/* Right — Phone mockup */}
        <div className="relative flex justify-center lg:justify-end">
          <div className="relative w-[280px] sm:w-[300px]">
            {/* Glow behind phone */}
            <div className="absolute -inset-8 rounded-[3rem] bg-primary/10 blur-3xl" />

            {/* Phone frame */}
            <div className="relative rounded-[2rem] border-2 border-border bg-card shadow-2xl overflow-hidden">
              {/* Status bar */}
              <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-display text-[10px] font-bold uppercase tracking-wider">MeatLens</span>
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[8px] font-bold text-primary">
                  JD
                </div>
              </div>

              {/* Chat header */}
              <div className="px-4 py-2 border-b border-border">
                <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
                  MeatLens AI Assistant
                </p>
              </div>

              {/* Chat messages */}
              <div className="px-3 py-3 space-y-2.5 min-h-[260px]">
                {/* User message */}
                <div className="flex justify-end gap-1.5">
                  <div className="max-w-[75%] rounded-lg bg-primary px-2.5 py-1.5 text-[10px] leading-relaxed text-primary-foreground">
                    Is this pork sample still fresh?
                  </div>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>

                {/* Bot function call */}
                <div className="flex gap-1.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="rounded-lg bg-secondary px-2.5 py-1.5 text-[9px] text-muted-foreground font-display">
                    🔬 Invoked analyzeImage()
                  </div>
                </div>

                {/* Bot response */}
                <div className="flex gap-1.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="max-w-[80%] rounded-lg bg-secondary px-2.5 py-1.5 text-[10px] leading-relaxed text-secondary-foreground">
                    <p className="font-semibold mb-1">Analysis Complete! ✅</p>
                    <p className="text-muted-foreground mb-1"><strong className="text-foreground">Classification:</strong> Fresh</p>
                    <p className="text-muted-foreground mb-1"><strong className="text-foreground">L*:</strong> 42.3 &nbsp; <strong className="text-foreground">a*:</strong> 18.7 &nbsp; <strong className="text-foreground">b*:</strong> 12.1</p>
                    <p className="text-muted-foreground mb-1"><strong className="text-foreground">Confidence:</strong> 94%</p>
                    <p className="text-muted-foreground mt-1.5">
                      💡 Color values are within DOH fresh pork thresholds. Safe for consumption.
                    </p>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="border-t border-border px-3 py-2 flex items-center gap-2">
                <div className="flex-1 rounded-md bg-muted px-2.5 py-1.5 text-[9px] text-muted-foreground">
                  Ask about meat safety...
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                  <Send className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>

              {/* Bottom nav */}
              <div className="flex items-center justify-around border-t border-border py-2 text-[8px] text-muted-foreground">
                <span>Dashboard</span>
                <span>History</span>
                <span>Scan</span>
                <span className="text-primary font-bold">Chat</span>
                <span>Settings</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

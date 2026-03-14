import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShieldCheck, Camera, BarChart3, Zap, ChevronRight, Star,
} from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsSection } from "@/components/landing/StatsSection";

const features = [
  {
    icon: Camera,
    title: "Computer Vision Analysis",
    desc: "Capture meat samples and extract Lab* color space metrics and GLCM texture features using OpenCV.",
  },
  {
    icon: ShieldCheck,
    title: "DOH Standards Compliance",
    desc: "Evaluate freshness against Department of Health meat indicator standards with objective classification.",
  },
  {
    icon: BarChart3,
    title: "Inspection Records",
    desc: "Store and review inspection history with detailed color and texture feature breakdowns.",
  },
  {
    icon: Zap,
    title: "Fast Mobile Inference",
    desc: "Optimized PWA for wet market environments — works offline with instant capture and analysis.",
  },
];

const testimonials = [
  {
    name: "Maria Santos",
    role: "Barangay Health Inspector",
    quote: "MeatGuard has transformed how we conduct market inspections. The objective data gives us confidence in our assessments.",
    rating: 5,
  },
  {
    name: "Carlos Reyes",
    role: "Municipal Food Safety Officer",
    quote: "The Lab* color analysis catches freshness issues that visual inspection alone might miss. Essential tool for public health.",
    rating: 5,
  },
  {
    name: "Ana Dela Cruz",
    role: "Wet Market Inspector",
    quote: "Easy to use on my phone right at the market stall. The reports help me explain findings to vendors clearly.",
    rating: 4,
  },
];

const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-bold uppercase tracking-wider">MeatGuard</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/inspect">
              <Button size="sm" className="font-display uppercase tracking-wider gap-1">
                Open App <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="font-display uppercase tracking-wider">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="font-display uppercase tracking-wider">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <HeroSection />

      <StatsSection />

      {/* Features */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-xs uppercase tracking-widest text-muted-foreground text-center mb-10">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/30"
              >
                <f.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-16 border-t border-border bg-card/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-xs uppercase tracking-widest text-muted-foreground text-center mb-10">
            What Inspectors Say
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-lg border border-border bg-card p-6"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-4 italic">
                  "{t.quote}"
                </p>
                <div>
                  <p className="font-display text-xs font-semibold uppercase tracking-wider">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Classification Scale */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-8">
            Freshness Classification Scale
          </h2>
          <div className="flex justify-center gap-3 flex-wrap">
            {[
              { label: "Fresh", className: "bg-fresh/20 text-fresh border-fresh/40" },
              { label: "Acceptable", className: "bg-acceptable/20 text-acceptable border-acceptable/40" },
              { label: "Warning", className: "bg-warning/20 text-warning border-warning/40" },
              { label: "Spoiled", className: "bg-spoiled/20 text-spoiled border-spoiled/40" },
            ].map((c) => (
              <span
                key={c.label}
                className={`inline-flex items-center rounded-md border px-4 py-2 font-display text-sm font-semibold uppercase tracking-wider ${c.className}`}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t border-border text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight mb-4">
            Ready to Inspect?
          </h2>
          <p className="text-muted-foreground mb-8">
            Get your access code from your organization administrator and start conducting objective meat freshness assessments today.
          </p>
          <Link to={user ? "/inspect" : "/signup"}>
            <Button size="lg" className="font-display uppercase tracking-wider gap-2 px-10">
              {user ? "Go to App" : "Get Started Now"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          MeatGuard — Built for wet market food safety inspection
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;

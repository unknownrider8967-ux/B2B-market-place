import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  ArrowRight,
  Activity,
  ShieldCheck,
  Zap,
  BarChart3,
  Package,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

const STATS = [
  { value: "500+", label: "Verified vendors" },
  { value: "12K+", label: "Medical SKUs" },
  { value: "$2.4B", label: "Procurement processed" },
  { value: "98%", label: "Order accuracy" },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Verified Vendors",
    desc: "Every supplier is vetted, credentialed, and reviewed before listing. FDA, CE, and ISO compliance tracked automatically.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: BarChart3,
    title: "Tiered Pricing & MOQ",
    desc: "Compare volume-based pricing tiers across vendors. Unlock bulk discounts and minimum-order visibility in real time.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Zap,
    title: "Instant RFQs",
    desc: "Submit formal requests for quote to multiple vendors simultaneously. Responses arrive in your inbox, not a sales rep's.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Package,
    title: "Multi-vendor Cart",
    desc: "Add products from different vendors into one checkout. Consolidated invoicing, unified order tracking.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: FileText,
    title: "Audit-ready Records",
    desc: "Every transaction is logged with timestamps, user IDs, and document trails — ready for procurement audits.",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    icon: Activity,
    title: "Live Stock & Lead Times",
    desc: "Vendor inventory and lead times are synced continuously. No more calling reps to check availability.",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
];

const TRUST_ITEMS = [
  "HIPAA-compliant data handling",
  "SOC 2 Type II certified",
  "End-to-end encrypted transactions",
  "99.9% uptime SLA",
];

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, setLocation] = useLocation();
  const { isRtl } = useTranslation();

  useEffect(() => {
    if (isAuthenticated) setLocation("/browse");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    document.title = "MedSupply Exchange – Clinical Procurement Marketplace";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content =
      "MedSupply Exchange is a serious, trustworthy B2B marketplace for hospitals and distributors. Compare tiered pricing, handle MOQs, and streamline your medical supply chain.";
  }, []);

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col font-sans"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              MedSupply<span className="text-primary">Exchange</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#trust" className="hover:text-foreground transition-colors">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            {!isLoading && (
              isAuthenticated ? (
                <Button size="sm" onClick={() => setLocation("/browse")}>
                  Go to app <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={login} className="hidden sm:inline-flex">
                    Sign in
                  </Button>
                  <Button size="sm" onClick={login} className="btn-press">
                    Get started <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-24 lg:py-36 bg-background">
          <div className="absolute inset-0 bg-dot-grid opacity-60 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/20 mb-8"
              style={{ animation: "fadeUp 0.4s ease forwards" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Purpose-built for clinical procurement
            </div>

            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.05] mb-6"
              style={{ animation: "fadeUp 0.5s 0.08s ease both" }}
            >
              Medical procurement,{" "}
              <span className="text-gradient">engineered</span>{" "}
              for precision.
            </h1>

            <p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10"
              style={{ animation: "fadeUp 0.5s 0.16s ease both" }}
            >
              A serious B2B marketplace connecting hospitals and distributors.
              Compare tiered pricing, submit RFQs, and manage your entire
              supply chain — from one platform.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
              style={{ animation: "fadeUp 0.5s 0.24s ease both" }}
            >
              <Button
                size="lg"
                className="h-12 px-8 text-base btn-press shadow-md shadow-primary/20"
                onClick={login}
              >
                Access Marketplace
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base"
                onClick={login}
              >
                Request a demo
              </Button>
            </div>

            <div
              className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
              style={{ animation: "fadeUp 0.5s 0.32s ease both" }}
            >
              {TRUST_ITEMS.map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats bar ───────────────────────────────────────── */}
        <section className="border-y border-border bg-card">
          <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="text-center"
                style={{ animation: `fadeUp 0.45s ${i * 70}ms ease both` }}
              >
                <div className="text-3xl font-bold text-foreground">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────── */}
        <section id="features" className="py-24 px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything procurement teams need
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Built from the ground up for the complexity of medical supply chains.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="group p-6 bg-card border border-border rounded-xl card-hover"
                  >
                    <div className={`inline-flex p-2.5 rounded-lg ${f.bg} mb-4`}>
                      <Icon className={`h-5 w-5 ${f.color}`} />
                    </div>
                    <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Role split ─────────────────────────────────────── */}
        <section className="py-24 px-6 bg-card border-y border-border">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-primary text-white relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/5" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="relative">
                <span className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-4 block">For Buyers</span>
                <h3 className="text-2xl font-bold mb-3">Hospitals &amp; Clinics</h3>
                <p className="text-white/75 text-sm leading-relaxed mb-6">
                  Browse 12,000+ SKUs, compare vendor offers side-by-side, submit RFQs, and track every order — all in one place.
                </p>
                <ul className="space-y-2 text-sm text-white/80">
                  {["Multi-vendor cart & checkout", "Volume pricing comparison", "RFQ management", "Order history & audit trail"].map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-white/60 shrink-0" />{i}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 bg-white text-primary hover:bg-white/90 border-0 btn-press"
                  onClick={login}
                >
                  Start buying <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-foreground text-background relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/5" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="relative">
                <span className="text-xs font-semibold uppercase tracking-widest text-background/50 mb-4 block">For Vendors</span>
                <h3 className="text-2xl font-bold mb-3">Manufacturers &amp; Distributors</h3>
                <p className="text-background/70 text-sm leading-relaxed mb-6">
                  List your catalog with tiered pricing, respond to RFQs, manage fulfillment, and grow your hospital client base.
                </p>
                <ul className="space-y-2 text-sm text-background/75">
                  {["Tiered pricing & MOQ controls", "RFQ inbox & quoting tools", "Order fulfillment dashboard", "Performance analytics"].map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-background/50 shrink-0" />{i}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="mt-8 border-background/30 text-background hover:bg-background/10 btn-press"
                  onClick={login}
                >
                  Start selling <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section id="trust" className="py-24 px-6 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to modernize your procurement?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join hundreds of hospitals and distributors already using MedSupply Exchange.
            </p>
            <Button
              size="lg"
              className="h-12 px-10 text-base btn-press shadow-md shadow-primary/20"
              onClick={login}
            >
              Get started — it's free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <Activity className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold">MedSupplyExchange</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MedSupply Exchange. All rights reserved.
          </p>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

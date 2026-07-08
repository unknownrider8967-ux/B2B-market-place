import { useAuth } from "@workspace/replit-auth-web";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowRight, Activity, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, setLocation] = useLocation();
  const { t, isRtl } = useTranslation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/browse");
    }
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
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">
            MedSupply<span className="text-primary">Exchange</span>
          </span>
        </div>
        <div>
          {isLoading ? null : isAuthenticated ? (
            <Button onClick={() => setLocation("/browse")}>
              {t("landing.hero.goToApp")} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={login}>
              {t("landing.hero.login")} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-card-foreground leading-tight">
              {t("landing.hero.headline")}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              {t("landing.hero.subheadline")}
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button size="lg" className="text-lg px-8 py-6 rounded-sm h-auto" onClick={login}>
                {t("landing.hero.cta")}
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-sidebar py-20 px-6 border-t border-sidebar-border">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background/5 p-6 rounded-lg border border-sidebar-border space-y-4">
              <ShieldCheck className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold text-sidebar-foreground">
                {t("landing.features.verified.title")}
              </h3>
              <p className="text-sidebar-foreground/70">{t("landing.features.verified.desc")}</p>
            </div>
            <div className="bg-background/5 p-6 rounded-lg border border-sidebar-border space-y-4">
              <Activity className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold text-sidebar-foreground">
                {t("landing.features.realtime.title")}
              </h3>
              <p className="text-sidebar-foreground/70">{t("landing.features.realtime.desc")}</p>
            </div>
            <div className="bg-background/5 p-6 rounded-lg border border-sidebar-border space-y-4">
              <Zap className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold text-sidebar-foreground">
                {t("landing.features.rfq.title")}
              </h3>
              <p className="text-sidebar-foreground/70">{t("landing.features.rfq.desc")}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-muted-foreground border-t border-border">
        <p>{t("landing.footer.copy", { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}

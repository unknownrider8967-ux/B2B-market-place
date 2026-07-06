import { useAuth } from "@workspace/replit-auth-web";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowRight, Activity, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      // Auth guard will handle the actual routing in the App component, but we can fast-track
      // to onboarding or app if we know they are logged in.
      setLocation("/browse");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">MedSupply<span className="text-primary">Exchange</span></span>
        </div>
        <div>
          {isLoading ? null : isAuthenticated ? (
            <Button onClick={() => setLocation("/browse")}>Go to App <ArrowRight className="h-4 w-4 ml-2" /></Button>
          ) : (
            <Button onClick={login}>Login / Register <ArrowRight className="h-4 w-4 ml-2" /></Button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-card-foreground leading-tight">
              Clinical procurement,<br /> engineered for precision.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              A serious, trustworthy B2B marketplace for hospitals and distributors. Compare tiered pricing, handle MOQs, and streamline your supply chain.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button size="lg" className="text-lg px-8 py-6 rounded-sm h-auto" onClick={login}>
                Access Marketplace
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-sidebar py-20 px-6 border-t border-sidebar-border">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background/5 p-6 rounded-lg border border-sidebar-border space-y-4">
              <ShieldCheck className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold text-sidebar-foreground">Verified Vendors</h3>
              <p className="text-sidebar-foreground/70">Every distributor and manufacturer goes through strict admin approval before listing products.</p>
            </div>
            <div className="bg-background/5 p-6 rounded-lg border border-sidebar-border space-y-4">
              <Activity className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold text-sidebar-foreground">Real-time Data</h3>
              <p className="text-sidebar-foreground/70">Compare stock levels, delivery days, and tiered pricing side-by-side in high-density tables.</p>
            </div>
            <div className="bg-background/5 p-6 rounded-lg border border-sidebar-border space-y-4">
              <Zap className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold text-sidebar-foreground">Streamlined RFQs</h3>
              <p className="text-sidebar-foreground/70">Can't find exactly what you need? Submit an RFQ and let the vendors come to you.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-muted-foreground border-t border-border">
        <p>© {new Date().getFullYear()} MedSupply Exchange. All rights reserved.</p>
      </footer>
    </div>
  );
}

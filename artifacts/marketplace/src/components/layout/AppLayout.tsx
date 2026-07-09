import { useAuth } from "@workspace/replit-auth-web";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { Link, useLocation } from "wouter";
import { useState, useMemo } from "react";
import {
  Loader2, LogOut, Package, ShoppingCart, FileText,
  ClipboardList, LayoutDashboard, Building2, Heart,
  Menu, X, Activity, BarChart3, Receipt, Warehouse,
  MapPin, Shield, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/lib/i18n";

function getInitials(email?: string | null, name?: string | null): string {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function NavContent({
  navItems,
  location,
  profile,
  language,
  setLanguage,
  logout,
  onNavigate,
}: {
  navItems: { href: string; label: string; icon: React.ElementType }[];
  location: string;
  profile: any;
  language: string;
  setLanguage: (l: string) => void;
  logout: () => void;
  onNavigate?: () => void;
}) {
  const initials = getInitials(
    profile?.user?.email,
    profile?.user?.firstName
      ? `${profile.user.firstName} ${profile.user.lastName ?? ""}`.trim()
      : null,
  );

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center">
            <Activity className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-bold text-sidebar-foreground tracking-tight">MedSupply</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors tracking-wider"
            aria-label="Toggle language"
          >
            {language === "en" ? "AR" : "EN"}
          </button>
          <NotificationBell />
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-1">
          {profile?.role === "admin" ? "Admin Panel" : profile?.role === "vendor" ? "Vendor Portal" : "Marketplace"}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href + "/"));
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium nav-active-bar"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/30 transition-colors mb-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 border border-sidebar-border flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-sidebar-foreground truncate">
              {profile?.user?.firstName
                ? `${profile.user.firstName} ${profile.user.lastName ?? ""}`.trim()
                : profile?.user?.email ?? "User"}
            </div>
            <div className="text-[10px] text-sidebar-foreground/50 truncate">
              {profile?.company?.name || profile?.role}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 h-8 text-xs"
          onClick={logout}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { profile, isLoading } = useAuthGuard(allowedRoles);
  const { logout } = useAuth();
  const [location] = useLocation();
  const { language, setLanguage } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(() => {
    const role = profile?.role;
    if (role === "buyer") {
      return [
        { href: "/browse",   label: "Browse",    icon: Package },
        { href: "/cart",     label: "Cart",       icon: ShoppingCart },
        { href: "/orders",   label: "Orders",     icon: ClipboardList },
        { href: "/rfq",      label: "RFQs",       icon: FileText },
        { href: "/wishlist", label: "Wishlist",   icon: Heart },
        { href: "/compare",  label: "Compare",    icon: BarChart3 },
      ];
    }
    if (role === "vendor") {
      return [
        { href: "/vendor",               label: "Dashboard",     icon: LayoutDashboard },
        { href: "/vendor/offers",        label: "My Offers",     icon: Package },
        { href: "/vendor/orders",        label: "Orders",        icon: ClipboardList },
        { href: "/vendor/rfqs",          label: "RFQs",          icon: FileText },
        { href: "/vendor/warehouses",    label: "Warehouses",    icon: Warehouse },
        { href: "/vendor/shipping-zones", label: "Shipping",     icon: MapPin },
      ];
    }
    if (role === "admin") {
      return [
        { href: "/admin",           label: "Dashboard",  icon: LayoutDashboard },
        { href: "/admin/companies", label: "Companies",  icon: Building2 },
        { href: "/admin/products",  label: "Products",   icon: Package },
        { href: "/admin/coupons",   label: "Coupons",    icon: Tag },
        { href: "/admin/reports",   label: "Reports",    icon: BarChart3 },
        { href: "/admin/audit-logs", label: "Audit Logs", icon: Shield },
      ];
    }
    return [];
  }, [profile?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const navContentProps = {
    navItems,
    location,
    profile,
    language,
    setLanguage,
    logout,
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-col bg-sidebar border-r border-sidebar-border shrink-0">
        <NavContent {...navContentProps} />
      </aside>

      {/* ── Mobile sidebar (Sheet) ───────────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button
            className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground border border-sidebar-border shadow-md"
            aria-label="Open navigation"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-56 bg-sidebar border-sidebar-border"
        >
          <NavContent
            {...navContentProps}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* ── Main ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar spacer */}
        <div className="md:hidden h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-center px-4 shrink-0">
          <span className="font-bold text-sm text-foreground">
            MedSupply<span className="text-primary">Exchange</span>
          </span>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}

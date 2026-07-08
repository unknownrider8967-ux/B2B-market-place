import { useAuth } from "@workspace/replit-auth-web";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { Link, useLocation } from "wouter";
import { Loader2, LogOut, Package, ShoppingCart, FileText, ClipboardList, LayoutDashboard, Building2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useTranslation } from "@/lib/i18n";

export function AppLayout({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { profile, isLoading } = useAuthGuard(allowedRoles);
  const { logout } = useAuth();
  const [location] = useLocation();
  const { language, setLanguage } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const role = profile.role;
  
  const navItems = role === "buyer" ? [
    { href: "/browse", label: "Browse", icon: Package },
    { href: "/cart", label: "Cart", icon: ShoppingCart },
    { href: "/orders", label: "Orders", icon: ClipboardList },
    { href: "/rfq", label: "RFQs", icon: FileText },
    { href: "/wishlist", label: "Wishlist", icon: Heart },
  ] : role === "vendor" ? [
    { href: "/vendor", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vendor/offers", label: "My Offers", icon: Package },
    { href: "/vendor/orders", label: "Orders", icon: ClipboardList },
    { href: "/vendor/rfqs", label: "RFQs", icon: FileText },
  ] : [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/companies", label: "Companies", icon: Building2 },
    { href: "/admin/products", label: "Products", icon: Package },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border bg-sidebar">
          <h1 className="text-xl font-bold text-sidebar-primary">MedSupply</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="text-xs font-medium px-2 py-1 rounded border border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              aria-label="Toggle language"
            >
              {language === "en" ? "AR" : "EN"}
            </button>
            <NotificationBell />
          </div>
        </div>
        
        <div className="p-4 flex-1">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || location.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}>
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex flex-col gap-3">
            <div className="px-3 py-2 text-sm text-sidebar-foreground/70 break-all">
              <span className="block font-medium text-sidebar-foreground truncate">{profile.user.email}</span>
              <span className="block text-xs uppercase mt-0.5 tracking-wider">{profile.company?.name || role}</span>
            </div>
            <Button variant="outline" className="w-full justify-start text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/50" onClick={() => logout()}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

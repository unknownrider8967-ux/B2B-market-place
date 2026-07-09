import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, DollarSign, Users, Building2, Package,
  FileText, AlertCircle, ArrowRight, TrendingUp,
} from "lucide-react";
import { Link } from "wouter";

function StatCard({
  title,
  value,
  icon: Icon,
  accent,
  href,
  note,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent?: "primary" | "amber" | "destructive";
  href?: string;
  note?: string;
}) {
  const accentClass =
    accent === "destructive"
      ? "text-destructive"
      : accent === "amber"
      ? "text-amber-500"
      : "text-primary";

  const card = (
    <Card className={`stat-card-accent card-hover ${href ? "cursor-pointer" : ""} ${accent === "destructive" ? "border-destructive/30 bg-destructive/5" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-1.5 rounded-md bg-muted`}>
          <Icon className={`h-4 w-4 ${accentClass}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${accent === "destructive" ? "text-destructive" : "text-foreground"}`}>
          {value}
        </div>
        {note && <p className={`text-xs mt-1 ${accent === "destructive" ? "text-destructive/70" : "text-muted-foreground"}`}>{note}</p>}
        {href && (
          <div className={`flex items-center gap-1 text-xs mt-2 font-medium ${accentClass}`}>
            View all <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

function StatCardSkeleton() {
  return (
    <Card className="stat-card-accent">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <Skeleton className="h-4 w-28 skeleton-shimmer" />
        <Skeleton className="h-7 w-7 rounded-md skeleton-shimmer" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 skeleton-shimmer" />
        <Skeleton className="h-3 w-32 mt-2 skeleton-shimmer" />
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminDashboard({
    query: { queryKey: getGetAdminDashboardQueryKey() },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Marketplace overview and key metrics.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md">
          <Activity className="h-3 w-3" />
          Live data
        </div>
      </div>

      {/* Primary metrics */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard
                title="Total Revenue"
                value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
                note="Lifetime GMV"
              />
              <StatCard
                title="Total Orders"
                value={stats.totalOrders.toLocaleString()}
                icon={Activity}
                note="All time"
              />
              <StatCard
                title="Active Buyers"
                value={stats.activeBuyers.toLocaleString()}
                icon={Users}
                note="Approved accounts"
              />
              <StatCard
                title="Active Vendors"
                value={stats.activeVendors.toLocaleString()}
                icon={Building2}
                note="Approved suppliers"
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Secondary metrics */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Catalog &amp; Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              {stats.pendingApprovals > 0 && (
                <StatCard
                  title="Pending Approvals"
                  value={stats.pendingApprovals}
                  icon={AlertCircle}
                  accent="destructive"
                  href="/admin/companies"
                  note="Companies awaiting review"
                />
              )}
              <StatCard
                title="Total Products"
                value={stats.totalProducts.toLocaleString()}
                icon={Package}
                href="/admin/products"
                note="Across all vendors"
              />
              <StatCard
                title="Open RFQs"
                value={stats.openRfqs.toLocaleString()}
                icon={FileText}
                note="Awaiting vendor response"
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: "/admin/companies", label: "Review company applications", icon: Building2 },
            { href: "/admin/products", label: "Manage product catalog", icon: Package },
            { href: "/admin/reports", label: "View revenue reports", icon: TrendingUp },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-muted/30 transition-all duration-150 cursor-pointer group">
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

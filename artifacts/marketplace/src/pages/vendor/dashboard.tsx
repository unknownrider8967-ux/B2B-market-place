import { useGetVendorDashboard, getGetVendorDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Package, ClipboardList, FileText, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  note,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  href?: string;
  note?: string;
}) {
  const inner = (
    <Card className={`stat-card-accent card-hover ${href ? "cursor-pointer" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-1.5 rounded-md bg-muted">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        {href && (
          <div className="flex items-center gap-1 text-xs mt-2 font-medium text-primary">
            View all <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
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
        <Skeleton className="h-3 w-24 mt-2 skeleton-shimmer" />
      </CardContent>
    </Card>
  );
}

export default function VendorDashboard() {
  const { data: stats, isLoading } = useGetVendorDashboard({
    query: { queryKey: getGetVendorDashboardQueryKey() },
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendor Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your selling activity at a glance.</p>
      </div>

      {/* Metrics */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard
                title="Total Revenue"
                value={`$${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
                note="Lifetime earnings"
              />
              <StatCard
                title="Active Offers"
                value={stats.totalOffers.toLocaleString()}
                icon={Package}
                href="/vendor/offers"
                note="Live on marketplace"
              />
              <StatCard
                title="Total Orders"
                value={stats.totalOrders.toLocaleString()}
                icon={ClipboardList}
                href="/vendor/orders"
                note="All time"
              />
              <StatCard
                title="Open RFQs"
                value={stats.openRfqs.toLocaleString()}
                icon={FileText}
                href="/vendor/rfqs"
                note="Awaiting your response"
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
            { href: "/vendor/offers", label: "Manage your product offers", icon: Package },
            { href: "/vendor/orders", label: "Fulfill pending orders", icon: ClipboardList },
            { href: "/vendor/rfqs", label: "Respond to RFQ requests", icon: TrendingUp },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-muted/30 transition-all duration-150 cursor-pointer group">
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
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

import { useGetMyVendorScorecard, getGetMyVendorScorecardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, Star, Package, XCircle, Truck, BarChart3, Award
} from "lucide-react";

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function ScoreBar({ value, max = 1, colorClass = "bg-primary" }: { value: number; max?: number; colorClass?: string }) {
  const width = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function MetricCard({
  title,
  value,
  bar,
  barColor,
  icon: Icon,
  note,
}: {
  title: string;
  value: string;
  bar?: number;
  barColor?: string;
  icon: React.ElementType;
  note?: string;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-1.5 rounded-md bg-muted">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {bar !== undefined && <ScoreBar value={bar} colorClass={barColor} />}
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <Skeleton className="h-4 w-28 skeleton-shimmer" />
        <Skeleton className="h-7 w-7 rounded-md skeleton-shimmer" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-8 w-20 skeleton-shimmer" />
        <Skeleton className="h-2 w-full rounded-full skeleton-shimmer" />
        <Skeleton className="h-3 w-32 skeleton-shimmer" />
      </CardContent>
    </Card>
  );
}

export default function VendorScorecard() {
  const { data: sc, isLoading } = useGetMyVendorScorecard({
    query: { queryKey: getGetMyVendorScorecardQueryKey() },
  });

  const rating = sc ? Number(sc.avgRating) : 0;
  const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));

  return (
    <div className="max-w-4xl mx-auto space-y-8 page-enter">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Award className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance Scorecard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your fulfilment metrics — buyers see these when comparing vendors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : sc ? (
          <>
            <MetricCard
              title="Fulfillment Rate"
              value={pct(sc.fulfillmentRate)}
              bar={sc.fulfillmentRate}
              barColor={sc.fulfillmentRate >= 0.9 ? "bg-primary" : sc.fulfillmentRate >= 0.7 ? "bg-amber-500" : "bg-destructive"}
              icon={TrendingUp}
              note="Completed vs total orders"
            />
            <MetricCard
              title="Cancellation Rate"
              value={pct(sc.cancellationRate)}
              bar={sc.cancellationRate}
              barColor={sc.cancellationRate <= 0.05 ? "bg-primary" : sc.cancellationRate <= 0.15 ? "bg-amber-500" : "bg-destructive"}
              icon={XCircle}
              note="Lower is better"
            />
            <MetricCard
              title="Avg. Delivery Time"
              value={sc.avgDeliveryDays > 0 ? `${Number(sc.avgDeliveryDays).toFixed(1)} days` : "—"}
              icon={Truck}
              note="Based on active offers"
            />
            <MetricCard
              title="Avg. Rating"
              value={rating > 0 ? `${Number(rating).toFixed(1)} / 5` : "No ratings yet"}
              bar={rating}
              barColor={rating >= 4 ? "bg-primary" : rating >= 3 ? "bg-amber-400" : "bg-destructive"}
              icon={Star}
              note={rating > 0 ? `${stars}  ·  ${sc.totalReviews} review${sc.totalReviews !== 1 ? "s" : ""}` : "Complete orders to receive ratings"}
            />
            <MetricCard
              title="Total Orders"
              value={sc.totalOrders.toLocaleString()}
              icon={Package}
              note="All time"
            />
            <MetricCard
              title="Total Reviews"
              value={sc.totalReviews.toLocaleString()}
              icon={BarChart3}
              note="From verified buyers"
            />
          </>
        ) : null}
      </div>

      {sc && (
        <div className="p-4 bg-muted/30 rounded-xl border border-border text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">How scores affect your visibility</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Fulfillment rate ≥ 90% — highlighted in buyer search results</li>
            <li>Avg. rating ≥ 4.0 — earns "Top Rated" badge on offer cards</li>
            <li>Cancellation rate &gt; 15% — may reduce offer visibility</li>
          </ul>
        </div>
      )}
    </div>
  );
}

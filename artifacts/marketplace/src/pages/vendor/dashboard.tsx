import { useGetVendorDashboard } from "@workspace/api-client-react";
import { getGetVendorDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, ClipboardList, FileText, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function VendorDashboard() {
  const { data: stats, isLoading } = useGetVendorDashboard({
    query: { queryKey: getGetVendorDashboardQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vendor Dashboard</h1>
        <p className="text-muted-foreground">Your selling activity at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Link href="/vendor/offers">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Offers</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOffers}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vendor/orders">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
              <ClipboardList className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vendor/rfqs">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open RFQs</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openRfqs}</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

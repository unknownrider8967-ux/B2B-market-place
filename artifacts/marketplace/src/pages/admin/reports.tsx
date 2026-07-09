import { useState } from "react";
import {
  useGetSalesReport,
  useGetVendorReport,
  useGetCommissionReport,
} from "@workspace/api-client-react";
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TrendingUp, Users, DollarSign } from "lucide-react";

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <Skeleton className={`w-full skeleton-shimmer rounded-lg`} style={{ height }} />;
}

export default function AdminReports() {
  const [days, setDays] = useState(30);
  const { data: salesData, isLoading: salesLoading } = useGetSalesReport({ days });
  const { data: vendorData = [], isLoading: vendorLoading } = useGetVendorReport();
  const { data: commissionData = [], isLoading: commissionLoading } = useGetCommissionReport();

  return (
    <div className="max-w-6xl mx-auto space-y-8 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform revenue, vendor performance, and commissions.</p>
      </div>

      {/* Sales Trend */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Sales Trend</h2>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {salesLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-lg skeleton-shimmer" />
              <Skeleton className="h-20 rounded-lg skeleton-shimmer" />
            </div>
            <ChartSkeleton height={260} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card-accent p-4 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  ${(salesData?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="stat-card-accent p-4 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {(salesData?.totalOrders ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesData?.points ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis yAxisId="rev" orientation="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [
                    name === "revenue" ? `$${value.toFixed(2)}` : value,
                    name === "revenue" ? "Revenue" : "Orders",
                  ]}
                />
                <Line yAxisId="rev" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="revenue" />
                <Line yAxisId="ord" type="monotone" dataKey="orders" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} name="orders" />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </section>

      {/* Vendor Performance */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Vendor Performance</h2>
        </div>

        {vendorLoading ? (
          <div className="space-y-3">
            <ChartSkeleton height={220} />
            <Skeleton className="h-40 rounded-lg skeleton-shimmer" />
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vendorData.slice(0, 10)} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="vendorName" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">
                        No vendor data yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendorData.map((v) => (
                      <TableRow key={v.vendorCompanyId} className="hover:bg-muted/20">
                        <TableCell className="font-medium text-sm">{v.vendorName}</TableCell>
                        <TableCell className="text-right text-sm">{v.totalOrders.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-primary">
                          ${v.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {v.avgRating > 0 ? `⭐ ${v.avgRating.toFixed(1)}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      {/* Commission Report */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Commission by Vendor Subtype</h2>
        </div>

        {commissionLoading ? (
          <Skeleton className="h-40 rounded-lg skeleton-shimmer" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Subtype</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">
                      No commission data yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  commissionData.map((c) => (
                    <TableRow key={c.subtype} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-sm capitalize">{c.subtype.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right text-sm">{c.ratePercent.toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-sm">
                        ${c.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-sm font-bold text-primary">
                        ${c.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

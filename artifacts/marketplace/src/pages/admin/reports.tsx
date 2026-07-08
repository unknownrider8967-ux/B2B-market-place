import { useState } from "react";
import {
  useGetSalesReport,
  useGetVendorReport,
  useGetCommissionReport,
} from "@workspace/api-client-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, TrendingUp, Users, DollarSign } from "lucide-react";

export default function AdminReports() {
  const [days, setDays] = useState(30);
  const { data: salesData, isLoading: salesLoading } = useGetSalesReport({ days });
  const { data: vendorData = [], isLoading: vendorLoading } = useGetVendorReport();
  const { data: commissionData = [], isLoading: commissionLoading } = useGetCommissionReport();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>

      {/* Sales Trend */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Sales Trend</h2>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-36">
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
          <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted/40 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-primary">${(salesData?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">{(salesData?.totalOrders ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesData?.points ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis yAxisId="rev" orientation="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
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
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Vendor Performance</h2>
        </div>
        {vendorLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vendorData.slice(0, 10)} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="vendorName" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorData.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No vendor data yet.</TableCell></TableRow>
                  )}
                  {vendorData.map((v) => (
                    <TableRow key={v.vendorCompanyId}>
                      <TableCell className="font-medium">{v.vendorName}</TableCell>
                      <TableCell className="text-right">{v.totalOrders.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${v.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{v.avgRating > 0 ? `⭐ ${v.avgRating.toFixed(1)}` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      {/* Commission Report */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Commission by Vendor Subtype</h2>
        </div>
        {commissionLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subtype</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Commission Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionData.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No commission data yet.</TableCell></TableRow>
                )}
                {commissionData.map((c) => (
                  <TableRow key={c.subtype}>
                    <TableCell className="font-medium capitalize">{c.subtype.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right">{c.ratePercent.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">${c.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-primary font-semibold">${c.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

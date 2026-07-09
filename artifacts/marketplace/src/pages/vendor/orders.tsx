import { useListVendorOrderItems, useUpdateOrderStatus } from "@workspace/api-client-react";
import { getListVendorOrderItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, PackageSearch } from "lucide-react";

const STATUSES = ["pending", "confirmed", "shipped", "completed", "cancelled"] as const;

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-500/12 text-amber-600 border-amber-400/30",
  confirmed: "bg-sky-500/12 text-sky-600 border-sky-400/30",
  shipped:   "bg-violet-500/12 text-violet-600 border-violet-400/30",
  completed: "bg-primary/12 text-primary border-primary/30",
  cancelled: "bg-destructive/12 text-destructive border-destructive/30",
};

function TableSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            {["Order", "Product", "Qty", "Subtotal", "Placed", "Status"].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4].map((i) => (
            <TableRow key={i}>
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-full skeleton-shimmer" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function VendorOrders() {
  const { data: items = [], isLoading } = useListVendorOrderItems({
    query: { queryKey: getListVendorOrderItemsQueryKey() },
  });
  const updateStatus = useUpdateOrderStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStatusChange = (orderId: number, status: (typeof STATUSES)[number]) => {
    updateStatus.mutate(
      { id: orderId, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "Order updated" });
          queryClient.invalidateQueries({ queryKey: getListVendorOrderItemsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading…" : `${items.length} order item${items.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <PackageSearch className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">No orders yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Orders for your products will appear here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-sm font-medium">#{item.orderId}</TableCell>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.quantity}</TableCell>
                  <TableCell className="font-semibold text-primary">${item.subtotal.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(item.orderCreatedAt).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={item.orderStatus}
                      onValueChange={(v) => handleStatusChange(item.orderId, v as (typeof STATUSES)[number])}
                    >
                      <SelectTrigger className={`w-36 ml-auto h-7 text-xs border ${STATUS_STYLES[item.orderStatus] ?? ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

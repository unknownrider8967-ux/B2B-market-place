import { useListVendorOrderItems, useUpdateOrderStatus } from "@workspace/api-client-react";
import { getListVendorOrderItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ClipboardList } from "lucide-react";

const STATUSES = ["pending", "confirmed", "shipped", "completed", "cancelled"] as const;

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  confirmed: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  shipped: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  completed: "bg-primary/15 text-primary border-primary/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function VendorOrders() {
  const { data: items = [], isLoading } = useListVendorOrderItems({ query: { queryKey: getListVendorOrderItemsQueryKey() } });
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

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Orders</h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl text-muted-foreground">
          No orders for your products yet.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
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
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">#{item.orderId}</TableCell>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="font-medium text-primary">${item.subtotal.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(item.orderCreatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select value={item.orderStatus} onValueChange={(v) => handleStatusChange(item.orderId, v as (typeof STATUSES)[number])}>
                      <SelectTrigger className={`w-40 ml-auto h-8 text-xs ${statusStyles[item.orderStatus] ?? ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
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

import { useListMyOrders, useAddCartItem } from "@workspace/api-client-react";
import { getListMyOrdersQueryKey, getListCartItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, PackageSearch, ClipboardList, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const statusStyles: Record<string, string> = {
  pending:   "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  confirmed: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  shipped:   "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  completed: "bg-primary/15 text-primary border-primary/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function BuyerOrders() {
  const { data: orders = [], isLoading } = useListMyOrders({
    query: { queryKey: getListMyOrdersQueryKey() },
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const addCart = useAddCartItem();

  const handleBuyAgain = async (items: { offerId: number; quantity: number }[]) => {
    let added = 0;
    for (const item of items) {
      try {
        await new Promise<void>((resolve, reject) => {
          addCart.mutate(
            { data: { offerId: item.offerId, quantity: item.quantity } },
            { onSuccess: () => { added++; resolve(); }, onError: () => resolve() },
          );
        });
      } catch {
        // skip unavailable offers
      }
    }
    queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() });
    if (added > 0) {
      toast({ title: "Added to cart", description: `${added} item(s) added. Head to cart to checkout.` });
      setLocation("/cart");
    } else {
      toast({ title: "Items unavailable", description: "None of the offers from this order are currently available.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-card border border-border rounded-xl mt-8">
        <PackageSearch className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground">No orders yet</h2>
        <p className="text-muted-foreground mt-2 mb-6">Your placed orders will appear here.</p>
        <Button onClick={() => setLocation("/browse")}>Browse Products</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20">
              <div>
                <div className="font-semibold text-foreground">Order #{order.id}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={statusStyles[order.status] ?? ""}>
                  {order.status}
                </Badge>
                <div className="font-bold text-primary text-lg">${order.totalAmount.toFixed(2)}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBuyAgain(order.items.map((i) => ({ offerId: i.offerId, quantity: i.quantity })))}
                  disabled={addCart.isPending}
                  title="Re-add all items to cart"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Buy Again
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-foreground">{item.productName}</div>
                    <div className="text-xs text-muted-foreground">{item.vendorName} &bull; Qty {item.quantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${item.subtotal.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} each</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

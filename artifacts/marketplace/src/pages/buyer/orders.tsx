import { useListMyOrders, useAddCartItem } from "@workspace/api-client-react";
import { getListMyOrdersQueryKey, getListCartItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageSearch, ClipboardList, RotateCcw, ArrowRight, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-500/12 text-amber-600 border-amber-400/30",
  confirmed: "bg-sky-500/12 text-sky-600 border-sky-400/30",
  shipped:   "bg-violet-500/12 text-violet-600 border-violet-400/30",
  completed: "bg-primary/12 text-primary border-primary/30",
  cancelled: "bg-destructive/12 text-destructive border-destructive/30",
};

function OrdersSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-8 w-36 skeleton-shimmer" />
      {[1, 2].map((i) => (
        <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-24 skeleton-shimmer" />
              <Skeleton className="h-4 w-32 skeleton-shimmer" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full skeleton-shimmer" />
          </div>
          {[1, 2].map((j) => (
            <div key={j} className="p-4 flex justify-between">
              <Skeleton className="h-4 w-48 skeleton-shimmer" />
              <Skeleton className="h-4 w-16 skeleton-shimmer" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

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
        await new Promise<void>((resolve) => {
          addCart.mutate(
            { data: { offerId: item.offerId, quantity: item.quantity } },
            { onSuccess: () => { added++; resolve(); }, onError: () => resolve() },
          );
        });
      } catch { /* skip */ }
    }
    queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() });
    if (added > 0) {
      toast({ title: "Added to cart", description: `${added} item(s) added.` });
      setLocation("/cart");
    } else {
      toast({ title: "Items unavailable", description: "None of these offers are currently available.", variant: "destructive" });
    }
  };

  if (isLoading) return <OrdersSkeleton />;

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-28 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <PackageSearch className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No orders yet</h2>
        <p className="text-muted-foreground mt-2 mb-6 text-sm">Your placed orders will appear here.</p>
        <Button onClick={() => setLocation("/browse")}>
          Browse Products <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
        </div>
      </div>

      <div className="space-y-4 stagger-children">
        {orders.map((order) => (
          <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Order header */}
            <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-semibold text-sm text-foreground">Order #{order.id}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs ${STATUS_STYLES[order.status] ?? ""}`}>
                  {order.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-primary">${order.totalAmount.toFixed(2)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => handleBuyAgain(order.items.map((i) => ({ offerId: i.offerId, quantity: i.quantity })))}
                  disabled={addCart.isPending}
                >
                  <RotateCcw className="h-3 w-3" />
                  Buy Again
                </Button>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-foreground">{item.productName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.vendorName} · Qty {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="font-semibold text-foreground">${item.subtotal.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

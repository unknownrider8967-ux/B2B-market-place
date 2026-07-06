import { useListCartItems, useUpdateCartItem, useRemoveCartItem, useCheckoutCart } from "@workspace/api-client-react";
import { getListCartItemsQueryKey, getListMyOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, ShoppingCart, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function Cart() {
  const { data: cartItems = [], isLoading } = useListCartItems();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const checkout = useCheckoutCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-card border border-border rounded-xl mt-8">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground">Your cart is empty</h2>
        <p className="text-muted-foreground mt-2 mb-6">Browse the marketplace to find medical supplies.</p>
        <Button onClick={() => setLocation("/browse")}>Browse Products</Button>
      </div>
    );
  }

  const handleUpdate = (id: number, quantity: number, moq: number) => {
    if (quantity < moq) {
      toast({ title: "Invalid Quantity", description: `Minimum order quantity is ${moq}`, variant: "destructive" });
      return;
    }
    updateItem.mutate({ id, data: { quantity } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() })
    });
  };

  const handleRemove = (id: number) => {
    removeItem.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() })
    });
  };

  const handleCheckout = () => {
    checkout.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Order Placed", description: "Your order has been submitted successfully." });
        queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
        setLocation("/orders");
      },
      onError: (err: any) => {
        toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
      
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="divide-y divide-border">
          {cartItems.map((item) => (
            <div key={item.id} className="p-4 flex flex-col md:flex-row items-center gap-4 hover:bg-muted/20">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{item.productName}</h3>
                <div className="text-sm text-muted-foreground">
                  {item.vendorName} • MOQ: {item.moq} • Stock: {item.stock}
                </div>
              </div>
              
              <div className="font-medium text-foreground w-24 text-right">
                ${item.unitPrice.toFixed(2)} <span className="text-xs text-muted-foreground font-normal">/ {item.productUnit}</span>
              </div>
              
              <div className="w-32 flex items-center gap-2">
                <Input 
                  type="number" 
                  min={item.moq} 
                  defaultValue={item.quantity}
                  onBlur={(e) => handleUpdate(item.id, Number(e.target.value), item.moq)}
                  className="h-9 w-full text-right"
                />
              </div>

              <div className="w-24 font-bold text-primary text-right">
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </div>

              <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        
        <div className="bg-muted/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border">
          <div className="text-xl font-bold text-foreground">
            Total: <span className="text-primary">${totalAmount.toFixed(2)}</span>
          </div>
          <Button size="lg" onClick={handleCheckout} disabled={checkout.isPending}>
            {checkout.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
            Confirm Order
          </Button>
        </div>
      </div>
    </div>
  );
}

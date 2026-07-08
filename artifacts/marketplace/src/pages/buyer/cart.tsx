import { useState } from "react";
import { useListCartItems, useUpdateCartItem, useRemoveCartItem, useCheckoutCart, useValidateCoupon } from "@workspace/api-client-react";
import { getListCartItemsQueryKey, getListMyOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, ShoppingCart, CheckCircle, Tag, X } from "lucide-react";
import { useLocation } from "wouter";

export default function Cart() {
  const { data: cartItems = [], isLoading } = useListCartItems();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const checkout = useCheckoutCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [validateParams, setValidateParams] = useState<{ code: string; subtotal: number } | null>(null);

  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const { data: couponValidation, isFetching: validating } = useValidateCoupon(
    { code: validateParams?.code ?? "", subtotal: validateParams?.subtotal ?? 0 },
    { query: { enabled: validateParams != null } },
  );

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
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() }),
    });
    // Reset coupon when cart changes
    if (appliedCode) {
      setAppliedCode(null);
      setValidateParams(null);
    }
  };

  const handleRemove = (id: number) => {
    removeItem.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() }),
    });
    if (appliedCode) {
      setAppliedCode(null);
      setValidateParams(null);
    }
  };

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setAppliedCode(code);
    setValidateParams({ code, subtotal });
  };

  const handleRemoveCoupon = () => {
    setAppliedCode(null);
    setValidateParams(null);
    setCouponInput("");
  };

  const discountAmount = appliedCode && couponValidation?.valid ? couponValidation.discountAmount : 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const handleCheckout = () => {
    // Pass couponCode via body — the API client sends undefined body by default,
    // so we use the raw mutation with custom request body
    const body = appliedCode && couponValidation?.valid ? { couponCode: appliedCode } : undefined;
    checkout.mutate(body as unknown as void, {
      onSuccess: () => {
        toast({ title: "Order Placed", description: "Your order has been submitted successfully." });
        queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
        setLocation("/orders");
      },
      onError: (err: any) => {
        toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      },
    });
  };

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

        {/* Coupon + Summary */}
        <div className="bg-muted/30 p-6 border-t border-border space-y-4">
          {/* Coupon Input */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="pl-9 font-mono uppercase"
                  disabled={appliedCode != null}
                />
              </div>
              {appliedCode == null ? (
                <Button variant="outline" onClick={handleApplyCoupon} disabled={!couponInput.trim() || validating}>
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              ) : (
                <Button variant="outline" size="icon" onClick={handleRemoveCoupon} className="text-destructive hover:text-destructive">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {appliedCode && couponValidation && (
              <span className={couponValidation.valid ? "text-sm text-green-600 dark:text-green-400 font-medium" : "text-sm text-destructive"}>
                {couponValidation.valid
                  ? `✓ Saved $${couponValidation.discountAmount.toFixed(2)}`
                  : `✗ ${couponValidation.reason}`}
              </span>
            )}
          </div>

          {/* Order Summary */}
          <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
            <div className="space-y-1 text-sm">
              <div className="flex gap-8 text-muted-foreground">
                <span>Subtotal</span>
                <span className="ml-auto">${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex gap-8 text-green-600 dark:text-green-400">
                  <span>Discount ({appliedCode})</span>
                  <span className="ml-auto">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="text-xl font-bold text-foreground">
                Total: <span className="text-primary">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <Button size="lg" onClick={handleCheckout} disabled={checkout.isPending}>
              {checkout.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
              Confirm Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

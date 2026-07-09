import { useState } from "react";
import {
  useListCartItems, useUpdateCartItem, useRemoveCartItem,
  useCheckoutCart, useValidateCoupon,
} from "@workspace/api-client-react";
import { getListCartItemsQueryKey, getListMyOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, ShoppingCart, CheckCircle, Tag, X, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

function CartSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-8 w-40 skeleton-shimmer" />
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48 skeleton-shimmer" />
              <Skeleton className="h-4 w-32 skeleton-shimmer" />
            </div>
            <Skeleton className="h-9 w-24 skeleton-shimmer" />
            <Skeleton className="h-6 w-20 skeleton-shimmer" />
            <Skeleton className="h-8 w-8 rounded-md skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

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

  if (isLoading) return <CartSkeleton />;

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-28 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Your cart is empty</h2>
        <p className="text-muted-foreground mt-2 mb-6 text-sm">Browse the marketplace to find medical supplies.</p>
        <Button onClick={() => setLocation("/browse")}>
          Browse Products <ArrowRight className="h-4 w-4" />
        </Button>
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
    if (appliedCode) { setAppliedCode(null); setValidateParams(null); }
  };

  const handleRemove = (id: number) => {
    removeItem.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() }),
    });
    if (appliedCode) { setAppliedCode(null); setValidateParams(null); }
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
    const body = appliedCode && couponValidation?.valid ? { couponCode: appliedCode } : undefined;
    checkout.mutate(body as unknown as void, {
      onSuccess: () => {
        toast({ title: "Order Placed", description: "Your order has been submitted successfully." });
        queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
        setLocation("/orders");
      },
      onError: (err: any) => toast({ title: "Checkout failed", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Shopping Cart</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{cartItems.length} item{cartItems.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Items */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {cartItems.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 group hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{item.productName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.vendorName} · MOQ {item.moq} · {item.stock} in stock
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    ${item.unitPrice.toFixed(2)} / {item.productUnit}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Input
                    type="number"
                    min={item.moq}
                    defaultValue={item.quantity}
                    onBlur={(e) => handleUpdate(item.id, Number(e.target.value), item.moq)}
                    className="h-8 w-20 text-right text-sm"
                  />
                  <div className="w-20 text-right font-bold text-sm text-foreground">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemove(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 lg:sticky lg:top-4">
          <h2 className="font-semibold text-sm text-foreground">Order Summary</h2>

          {/* Coupon */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="pl-8 h-8 text-xs font-mono uppercase"
                  disabled={appliedCode != null}
                />
              </div>
              {appliedCode == null ? (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleApplyCoupon} disabled={!couponInput.trim() || validating}>
                  {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                </Button>
              ) : (
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleRemoveCoupon}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {appliedCode && couponValidation && (
              <p className={`text-xs font-medium ${couponValidation.valid ? "text-emerald-600" : "text-destructive"}`}>
                {couponValidation.valid ? `✓ Saved $${couponValidation.discountAmount.toFixed(2)}` : `✗ ${couponValidation.reason}`}
              </p>
            )}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount ({appliedCode})</span>
                <span>−${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <Button className="w-full btn-press" size="lg" onClick={handleCheckout} disabled={checkout.isPending}>
            {checkout.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
              : <><CheckCircle className="h-4 w-4 mr-2" />Confirm Order</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

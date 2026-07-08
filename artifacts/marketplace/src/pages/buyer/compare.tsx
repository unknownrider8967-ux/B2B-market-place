import { useSearch, useLocation } from "wouter";
import { useListProductOffers, useGetProduct } from "@workspace/api-client-react";
import { getListProductOffersQueryKey, getGetProductQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Package,
  Truck,
  Box,
  Factory,
  Store,
  Award,
  ShieldCheck,
  Star,
  ChevronLeft,
} from "lucide-react";
import { useAddCartItem } from "@workspace/api-client-react";
import { getListCartItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const VENDOR_BADGES: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  manufacturer:     { label: "Manufacturer",           icon: Factory,     className: "text-blue-600 border-blue-400/40 bg-blue-500/10" },
  distributor:      { label: "Authorized Distributor", icon: Award,       className: "text-emerald-600 border-emerald-400/40 bg-emerald-500/10" },
  importer:         { label: "Importer",               icon: ShieldCheck, className: "text-violet-600 border-violet-400/40 bg-violet-500/10" },
  wholesaler:       { label: "Wholesaler",             icon: Store,       className: "text-amber-600 border-amber-400/40 bg-amber-500/10" },
  medical_supplier: { label: "Verified Supplier",      icon: ShieldCheck, className: "text-primary border-primary/40 bg-primary/10" },
};

function VendorBadge({ subtype }: { subtype: string }) {
  const key = subtype.toLowerCase().replace(/\s+/g, "_");
  const badge = VENDOR_BADGES[key];
  if (!badge) return <span className="text-xs text-muted-foreground">{subtype}</span>;
  const Icon = badge.icon;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${badge.className}`}>
      <Icon className="h-3 w-3" /> {badge.label}
    </Badge>
  );
}

function Row({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 px-4 text-sm font-medium text-muted-foreground bg-muted/30 w-36 align-top">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-3 px-4 text-sm align-top">
          {v}
        </td>
      ))}
    </tr>
  );
}

export default function ComparePage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(search);
  const productId = Number(params.get("product"));

  const { data: product, isLoading: productLoading } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) },
  });

  const { data: offers = [], isLoading: offersLoading } = useListProductOffers(productId, {
    query: { enabled: !!productId, queryKey: getListProductOffersQueryKey(productId) },
  });

  const addCart = useAddCartItem();
  const [addingOfferId, setAddingOfferId] = useState<number | null>(null);

  const handleAddToCart = (offerId: number, moq: number) => {
    setAddingOfferId(offerId);
    addCart.mutate(
      { data: { offerId, quantity: moq } },
      {
        onSuccess: () => {
          toast({ title: "Added to Cart" });
          queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() });
          setAddingOfferId(null);
        },
        onError: (err: any) => {
          toast({ title: "Failed", description: err.message, variant: "destructive" });
          setAddingOfferId(null);
        },
      },
    );
  };

  if (!productId) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        No product selected. Go to a product detail page and click "Compare Vendors".
      </div>
    );
  }

  if (productLoading || offersLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return <div className="p-8 text-center">Product not found</div>;
  }

  if (offers.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/products/${productId}`)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Product
        </Button>
        <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
          No vendor offers available to compare for this product.
        </div>
      </div>
    );
  }

  const lowestPrice = Math.min(...offers.map((o) => o.price));

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/products/${productId}`)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Compare Vendors</h1>
          <p className="text-muted-foreground text-sm">{product.name} — {offers.length} vendors</p>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="py-4 px-4 text-left text-sm font-semibold text-muted-foreground w-36">Attribute</th>
              {offers.map((offer) => (
                <th key={offer.id} className="py-4 px-4 text-left">
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground">{offer.vendorName}</div>
                    <VendorBadge subtype={offer.vendorSubtype} />
                    {offer.price === lowestPrice && (
                      <Badge className="text-xs bg-emerald-500/15 text-emerald-700 border-emerald-400/40">
                        <Star className="h-3 w-3 mr-1 fill-current" /> Best Price
                      </Badge>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row
              label="Base Price"
              values={offers.map((o) => (
                <span
                  className={`font-bold text-base ${o.price === lowestPrice ? "text-emerald-600" : "text-foreground"}`}
                >
                  ${o.price.toFixed(2)}
                </span>
              ))}
            />
            <Row
              label="Min. Order"
              values={offers.map((o) => (
                <div className="flex items-center gap-1">
                  <Box className="h-3 w-3 text-muted-foreground" />
                  {o.moq} {product.unit}
                </div>
              ))}
            />
            <Row
              label="Stock"
              values={offers.map((o) => (
                o.stock > 0 ? (
                  <span className={o.stock < 10 ? "text-amber-600 font-medium" : "text-foreground"}>
                    {o.stock} units{o.stock < 10 ? " ⚠️" : ""}
                  </span>
                ) : (
                  <span className="text-destructive font-medium">Out of stock</span>
                )
              ))}
            />
            <Row
              label="Lead Time"
              values={offers.map((o) => (
                <div className="flex items-center gap-1">
                  <Truck className="h-3 w-3 text-muted-foreground" />
                  {o.deliveryDays} day{o.deliveryDays !== 1 ? "s" : ""}
                </div>
              ))}
            />
            <Row
              label="Volume Tiers"
              values={offers.map((o) =>
                o.priceTiers.length > 0 ? (
                  <div className="space-y-1">
                    {o.priceTiers.map((t, i) => (
                      <div key={i} className="text-xs bg-muted/50 rounded px-1.5 py-0.5 inline-block mr-1 mb-1">
                        {t.minQty}{t.maxQty ? `–${t.maxQty}` : "+"}: <span className="font-medium">${t.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">No tiers</span>
                ),
              )}
            />
            <Row
              label=""
              values={offers.map((o) => (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={o.stock < o.moq || (addCart.isPending && addingOfferId === o.id)}
                  onClick={() => handleAddToCart(o.id, o.moq)}
                >
                  {addCart.isPending && addingOfferId === o.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Add to Cart
                </Button>
              ))}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

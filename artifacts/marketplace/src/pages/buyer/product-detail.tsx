import { useParams } from "wouter";
import {
  useGetProduct,
  useListProductOffers,
  useAddCartItem,
  useListWishlist,
  useAddToWishlist,
  useRemoveFromWishlist,
} from "@workspace/api-client-react";
import {
  getGetProductQueryKey,
  getListProductOffersQueryKey,
  getListCartItemsQueryKey,
  getListWishlistQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, ShoppingCart, Truck, Box, ShieldCheck, Heart, Factory, Store, Award } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const VENDOR_BADGES: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  manufacturer:    { label: "Manufacturer",           icon: Factory,     className: "text-blue-600 border-blue-400/40 bg-blue-500/10" },
  distributor:     { label: "Authorized Distributor", icon: Award,       className: "text-emerald-600 border-emerald-400/40 bg-emerald-500/10" },
  importer:        { label: "Importer",               icon: ShieldCheck, className: "text-violet-600 border-violet-400/40 bg-violet-500/10" },
  wholesaler:      { label: "Wholesaler",             icon: Store,       className: "text-amber-600 border-amber-400/40 bg-amber-500/10" },
  medical_supplier:{ label: "Verified Supplier",      icon: ShieldCheck, className: "text-primary border-primary/40 bg-primary/10" },
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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading: productLoading } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) },
  });

  const { data: offers = [], isLoading: offersLoading } = useListProductOffers(productId, {
    query: { enabled: !!productId, queryKey: getListProductOffersQueryKey(productId) },
  });

  const { data: wishlist = [] } = useListWishlist({
    query: { queryKey: getListWishlistQueryKey() },
  });

  const isWishlisted = wishlist.some((w) => w.productId === productId);

  const addCart = useAddCartItem();
  const addWishlist = useAddToWishlist();
  const removeWishlist = useRemoveFromWishlist();

  const [addingOfferId, setAddingOfferId] = useState<number | null>(null);

  const handleAddToCart = (offerId: number, moq: number) => {
    setAddingOfferId(offerId);
    addCart.mutate(
      { data: { offerId, quantity: moq } },
      {
        onSuccess: () => {
          toast({ title: "Added to Cart", description: "The offer has been added to your cart." });
          queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() });
          setAddingOfferId(null);
        },
        onError: (err: any) => {
          toast({ title: "Failed to add", description: err.message || "An error occurred", variant: "destructive" });
          setAddingOfferId(null);
        },
      },
    );
  };

  const handleWishlistToggle = () => {
    if (isWishlisted) {
      removeWishlist.mutate(
        { productId },
        {
          onSuccess: () => {
            toast({ title: "Removed from wishlist" });
            queryClient.invalidateQueries({ queryKey: getListWishlistQueryKey() });
          },
        },
      );
    } else {
      addWishlist.mutate(
        { data: { productId } },
        {
          onSuccess: () => {
            toast({ title: "Added to wishlist" });
            queryClient.invalidateQueries({ queryKey: getListWishlistQueryKey() });
          },
        },
      );
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row gap-8 bg-card border border-border p-6 rounded-xl">
        <div className="w-full md:w-1/3 aspect-square bg-muted rounded-lg flex items-center justify-center">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply"
            />
          ) : (
            <Package className="h-24 w-24 text-muted-foreground/30" />
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
              <p className="text-muted-foreground text-lg mt-1">Unit: {product.unit}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`shrink-0 transition-colors ${
                isWishlisted
                  ? "text-red-500 border-red-400/40 hover:bg-red-500/10"
                  : "text-muted-foreground hover:text-red-500"
              }`}
              onClick={handleWishlistToggle}
              disabled={addWishlist.isPending || removeWishlist.isPending}
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`} />
            </Button>
          </div>
          <div className="prose prose-sm dark:prose-invert">
            <p>{product.description || "No description provided."}</p>
          </div>
          {offers.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="text-xs">
                {offers.length} vendor{offers.length !== 1 ? "s" : ""} offering this product
              </Badge>
              <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                From ${Math.min(...offers.map((o) => o.price)).toFixed(2)}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Vendor Offers</h2>
        {offers.length === 0 ? (
          <div className="text-center p-12 bg-card border border-border rounded-lg text-muted-foreground">
            No offers currently available for this product.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Volume Tiers</TableHead>
                  <TableHead>MOQ</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow key={offer.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium text-foreground">{offer.vendorName}</div>
                      <div className="mt-1">
                        <VendorBadge subtype={offer.vendorSubtype} />
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">${offer.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {offer.priceTiers.length > 0 ? (
                        <div className="space-y-1">
                          {offer.priceTiers.map((t, i) => (
                            <div key={i} className="text-xs bg-muted/50 rounded px-1.5 py-0.5 inline-block mr-1">
                              {t.minQty}{t.maxQty ? `–${t.maxQty}` : "+"}: <span className="font-medium">${t.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No tiers</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Box className="h-3 w-3 text-muted-foreground" /> {offer.moq}
                      </div>
                    </TableCell>
                    <TableCell>
                      {offer.stock > 0 ? (
                        <span className={offer.stock < 10 ? "text-amber-600 font-medium" : ""}>{offer.stock}</span>
                      ) : (
                        <span className="text-destructive font-medium">Out of stock</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3 text-muted-foreground" /> {offer.deliveryDays}d
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={offer.stock < offer.moq || (addCart.isPending && addingOfferId === offer.id)}
                        onClick={() => handleAddToCart(offer.id, offer.moq)}
                      >
                        {addCart.isPending && addingOfferId === offer.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ShoppingCart className="h-4 w-4 mr-2" />
                        )}
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

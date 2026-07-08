import { useParams, useLocation } from "wouter";
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
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Package,
  ShoppingCart,
  Truck,
  Box,
  ShieldCheck,
  Heart,
  Factory,
  Store,
  Award,
  GitCompare,
  Star,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

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

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-5 w-5 transition-colors ${
            n <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
          } ${onChange ? "cursor-pointer" : ""}`}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          onClick={() => onChange?.(n)}
        />
      ))}
    </div>
  );
}

interface ReviewsData {
  reviews: Array<{
    id: number;
    reviewerName: string;
    vendorName: string;
    vendorCompanyId: number;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
  vendorStats: Array<{ vendorCompanyId: number; avgRating: number; reviewCount: number }>;
  overallAvg: number | null;
  totalCount: number;
}

function ReviewsSection({ productId, offers }: { productId: number; offers: Array<{ id: number; vendorCompanyId: number; vendorName: string }> }) {
  const { toast } = useToast();
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(offers[0]?.vendorCompanyId ?? null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: reviewsData, refetch } = useQuery<ReviewsData>({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (!res.ok) throw new Error("Failed to load reviews");
      return res.json();
    },
  });

  const submitReview = async () => {
    if (!selectedVendorId || rating === 0) {
      toast({ title: "Please select a vendor and rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, vendorCompanyId: selectedVendorId, rating, comment: comment || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to submit");
      }
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      setRating(0);
      setComment("");
      refetch();
    } catch (err: any) {
      toast({ title: "Could not submit review", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const reviews = reviewsData?.reviews ?? [];
  const overallAvg = reviewsData?.overallAvg;
  const totalCount = reviewsData?.totalCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" /> Reviews & Ratings
        </h2>
        {overallAvg !== null && overallAvg !== undefined && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(overallAvg)} />
            <span className="font-bold text-lg">{overallAvg.toFixed(1)}</span>
            <span className="text-muted-foreground text-sm">({totalCount} review{totalCount !== 1 ? "s" : ""})</span>
          </div>
        )}
      </div>

      {/* Submit a review (only shown if there are offers — buyer must have purchased) */}
      {offers.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold">Leave a Review</h3>
          <p className="text-sm text-muted-foreground">You can review vendors you have purchased from.</p>
          <div className="flex flex-wrap gap-2">
            {offers.map((o) => (
              <button
                key={o.vendorCompanyId}
                onClick={() => setSelectedVendorId(o.vendorCompanyId)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  selectedVendorId === o.vendorCompanyId
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {o.vendorName}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Your Rating</p>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <Textarea
            placeholder="Optional: describe your experience (quality, delivery, packaging...)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <Button onClick={submitReview} disabled={submitting || rating === 0}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Review
          </Button>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <div className="text-center p-8 bg-card border border-border rounded-xl text-muted-foreground text-sm">
          No reviews yet for this product.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-medium text-sm">{r.reviewerName}</span>
                  <span className="text-muted-foreground text-xs mx-2">·</span>
                  <span className="text-muted-foreground text-xs">{r.vendorName}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <StarRating value={r.rating} />
                </div>
              </div>
              {r.comment && <p className="text-sm text-foreground/80">{r.comment}</p>}
              <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const [, navigate] = useLocation();
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
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in">
      {/* Product header */}
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
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="outline" className="text-xs">
                {offers.length} vendor{offers.length !== 1 ? "s" : ""} offering this product
              </Badge>
              <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                From ${Math.min(...offers.map((o) => o.price)).toFixed(2)}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-6 px-3 gap-1"
                onClick={() => navigate(`/compare?product=${productId}`)}
              >
                <GitCompare className="h-3 w-3" /> Compare Vendors
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Vendor Offers table */}
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

      <Separator />

      {/* Reviews & Ratings section */}
      <ReviewsSection
        productId={productId}
        offers={offers.map((o) => ({ id: o.id, vendorCompanyId: o.vendorCompanyId, vendorName: o.vendorName }))}
      />
    </div>
  );
}

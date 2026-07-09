import { useListWishlist, useRemoveFromWishlist } from "@workspace/api-client-react";
import { getListWishlistQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Heart, Package2, Trash2, ChevronRight, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
          <Skeleton className="aspect-video w-full skeleton-shimmer" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4 skeleton-shimmer" />
            <Skeleton className="h-4 w-1/3 skeleton-shimmer" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 flex-1 skeleton-shimmer" />
              <Skeleton className="h-8 w-8 skeleton-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Wishlist() {
  const { data: items = [], isLoading } = useListWishlist({
    query: { queryKey: getListWishlistQueryKey() },
  });
  const removeFromWishlist = useRemoveFromWishlist();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRemove = (productId: number) => {
    removeFromWishlist.mutate(
      { productId },
      {
        onSuccess: () => {
          toast({ title: "Removed from wishlist" });
          queryClient.invalidateQueries({ queryKey: getListWishlistQueryKey() });
        },
        onError: (err: any) =>
          toast({ title: "Error", description: err?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Wishlist</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading…" : `${items.length} saved product${items.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {isLoading ? (
        <WishlistSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
            <Heart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Your wishlist is empty</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">Save products you're interested in for quick access.</p>
          <Link href="/browse">
            <Button>
              Browse Products <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
          {items.map((item) => (
            <div
              key={item.id}
              className="group bg-card border border-border rounded-xl overflow-hidden card-hover"
            >
              <Link href={`/products/${item.productId}`}>
                <div className="aspect-video bg-muted flex items-center justify-center relative cursor-pointer overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="object-contain w-full h-full mix-blend-multiply p-4 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <Package2 className="h-12 w-12 text-muted-foreground/25" />
                  )}
                  <Badge className="absolute top-2.5 left-2.5 bg-background/90 backdrop-blur-sm text-foreground border-border text-[10px]">
                    {item.categoryName}
                  </Badge>
                </div>
              </Link>

              <div className="p-4 space-y-3">
                <div>
                  <Link href={`/products/${item.productId}`}>
                    <h3 className="font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-2 cursor-pointer leading-snug">
                      {item.productName}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">Per {item.productUnit}</p>
                </div>

                <div className="flex items-center gap-2">
                  {item.minPrice != null ? (
                    <span className="text-base font-bold text-foreground">
                      From ${item.minPrice.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No offers yet</span>
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {item.offerCount} offer{item.offerCount !== 1 ? "s" : ""}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Link href={`/products/${item.productId}`} className="flex-1">
                    <Button variant="default" size="sm" className="w-full text-xs gap-1">
                      Compare <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
                    onClick={() => handleRemove(item.productId)}
                    disabled={removeFromWishlist.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

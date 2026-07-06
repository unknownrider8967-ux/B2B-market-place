import { useListWishlist, useRemoveFromWishlist } from "@workspace/api-client-react";
import { getListWishlistQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Heart, Package2, Trash2, Loader2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3">
        <Heart className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">My Wishlist</h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Your wishlist is empty</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            Save products you're interested in for quick access later.
          </p>
          <Link href="/browse">
            <Button>Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
            >
              <Link href={`/products/${item.productId}`}>
                <div className="aspect-video bg-muted flex items-center justify-center p-6 relative cursor-pointer">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="object-contain w-full h-full mix-blend-multiply"
                    />
                  ) : (
                    <Package2 className="h-14 w-14 text-muted-foreground/30" />
                  )}
                  <Badge className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground border-border text-xs">
                    {item.categoryName}
                  </Badge>
                </div>
              </Link>

              <div className="p-4 space-y-3">
                <div>
                  <Link href={`/products/${item.productId}`}>
                    <h3 className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 cursor-pointer">
                      {item.productName}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground mt-0.5">Per {item.productUnit}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {item.minPrice != null ? (
                      <span className="text-lg font-bold text-foreground">
                        From ${item.minPrice.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No offers yet</span>
                    )}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {item.offerCount} offer{item.offerCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Link href={`/products/${item.productId}`} className="flex-1">
                    <Button variant="default" size="sm" className="w-full">
                      Compare <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(item.productId)}
                    disabled={removeFromWishlist.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
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

import { useState } from "react";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search, Package2, Filter, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function ProductCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Skeleton className="aspect-square w-full skeleton-shimmer" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4 skeleton-shimmer" />
        <Skeleton className="h-4 w-1/2 skeleton-shimmer" />
        <div className="pt-3 border-t border-border flex justify-between items-end">
          <Skeleton className="h-7 w-20 skeleton-shimmer" />
          <Skeleton className="h-5 w-16 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

export default function Browse() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const { data: categories = [] } = useListCategories();

  const queryParams = {
    search: search || undefined,
    categoryId: category !== "all" ? Number(category) : undefined,
  };

  const { data: products = [], isLoading } = useListProducts(queryParams, {
    query: { queryKey: ["products", queryParams] },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Browse medical supplies from{" "}
          <span className="text-foreground font-medium">{categories.length > 0 ? `${categories.length} categories` : "verified vendors"}</span>.
        </p>
      </div>

      {/* Search & filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-3 bg-card border border-border rounded-xl shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search products, brands, SKUs..."
            className="pl-9 border-transparent bg-muted/50 focus:bg-background transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-52">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="border-transparent bg-muted/50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Result count */}
      {!isLoading && products.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{products.length}</span> product{products.length !== 1 ? "s" : ""}
          {search && <> for &ldquo;<span className="text-foreground">{search}</span>&rdquo;</>}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Package2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No products found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Try adjusting your search or selecting a different category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <div className="group bg-card border border-border rounded-xl overflow-hidden card-hover cursor-pointer h-full flex flex-col">
                {/* Image */}
                <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="object-contain w-full h-full mix-blend-multiply p-4 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <Package2 className="h-14 w-14 text-muted-foreground/25" />
                  )}
                  <Badge className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm text-foreground border-border text-[10px] font-medium">
                    {product.categoryName}
                  </Badge>
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Per {product.unit}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">From</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-foreground">
                          {product.minPrice !== null ? `$${product.minPrice.toFixed(2)}` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {product.offerCount} offer{product.offerCount !== 1 ? "s" : ""}
                      </Badge>
                      <div className="flex items-center text-[11px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Compare <ChevronRight className="h-3 w-3 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

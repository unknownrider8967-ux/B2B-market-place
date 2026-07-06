import { useState } from "react";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search, Package2, Filter, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function Browse() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const { data: categories = [] } = useListCategories();
  
  const queryParams = {
    search: search || undefined,
    categoryId: category !== "all" ? Number(category) : undefined
  };

  const { data: products = [], isLoading } = useListProducts(queryParams, {
    query: {
      queryKey: ["products", queryParams]
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
          <p className="text-muted-foreground">Browse medical supplies across all verified vendors.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg border border-border"></div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-lg">
          <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, i) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <div className="group bg-card hover:bg-muted/50 border border-border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md hover-elevate cursor-pointer h-full flex flex-col animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="aspect-square bg-muted flex items-center justify-center p-6 relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="object-contain w-full h-full mix-blend-multiply" />
                  ) : (
                    <Package2 className="h-16 w-16 text-muted-foreground/30" />
                  )}
                  <Badge className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground border-border">
                    {product.categoryName}
                  </Badge>
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Per {product.unit}</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">From</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-foreground">
                          {product.minPrice !== null ? `$${product.minPrice.toFixed(2)}` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end">
                      <Badge variant="outline" className="text-xs font-normal">
                        {product.offerCount} offer{product.offerCount !== 1 ? 's' : ''}
                      </Badge>
                      <div className="mt-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-sm font-medium">
                        Compare <ChevronRight className="h-4 w-4 ml-1" />
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

import { useParams } from "wouter";
import { useGetProduct, useListProductOffers, useAddCartItem } from "@workspace/api-client-react";
import { getGetProductQueryKey, getListProductOffersQueryKey, getListCartItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, ShoppingCart, Truck, Box, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading: productLoading } = useGetProduct(productId, {
    query: {
      enabled: !!productId,
      queryKey: getGetProductQueryKey(productId)
    }
  });

  const { data: offers = [], isLoading: offersLoading } = useListProductOffers(productId, {
    query: {
      enabled: !!productId,
      queryKey: getListProductOffersQueryKey(productId)
    }
  });

  const addCart = useAddCartItem();

  const handleAddToCart = (offerId: number, moq: number) => {
    addCart.mutate({ data: { offerId, quantity: moq } }, {
      onSuccess: () => {
        toast({ title: "Added to Cart", description: "The offer has been added to your cart." });
        queryClient.invalidateQueries({ queryKey: getListCartItemsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to add", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  if (productLoading || offersLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!product) {
    return <div className="p-8 text-center">Product not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row gap-8 bg-card border border-border p-6 rounded-xl">
        <div className="w-full md:w-1/3 aspect-square bg-muted rounded-lg flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
          ) : (
            <Package className="h-24 w-24 text-muted-foreground/30" />
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
            <p className="text-muted-foreground text-lg mt-1">Unit: {product.unit}</p>
          </div>
          <div className="prose prose-sm dark:prose-invert">
            <p>{product.description || "No description provided."}</p>
          </div>
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
                  <TableHead>Tiers</TableHead>
                  <TableHead>MOQ</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map(offer => (
                  <TableRow key={offer.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium text-foreground flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4 text-primary" /> {offer.vendorName}
                      </div>
                      <div className="text-xs text-muted-foreground">{offer.vendorSubtype}</div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">${offer.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {offer.priceTiers.length > 0 ? (
                        <div className="space-y-1">
                          {offer.priceTiers.map((t, i) => (
                            <div key={i} className="text-xs">
                              {t.minQty}{t.maxQty ? `-${t.maxQty}` : '+'} : ${t.price.toFixed(2)}
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
                    <TableCell>{offer.stock > 0 ? offer.stock : <span className="text-destructive font-medium">Out of stock</span>}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3 text-muted-foreground" /> {offer.deliveryDays} days
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        disabled={offer.stock < offer.moq || addCart.isPending}
                        onClick={() => handleAddToCart(offer.id, offer.moq)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" /> Add
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

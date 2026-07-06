import { useState } from "react";
import {
  useListMyOffers,
  useCreateOffer,
  useUpdateOffer,
  useDeleteOffer,
  useListProducts,
  useCreateProduct,
  useListCategories,
} from "@workspace/api-client-react";
import {
  getListMyOffersQueryKey,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import type { OfferWithProduct, PriceTier } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, PackagePlus, Package } from "lucide-react";

type TierDraft = { minQty: string; maxQty: string; price: string };

const emptyTier: TierDraft = { minQty: "", maxQty: "", price: "" };

export default function VendorOffers() {
  const { data: offers = [], isLoading } = useListMyOffers({ query: { queryKey: getListMyOffersQueryKey() } });
  const { data: products = [] } = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey() } });
  const { data: categories = [] } = useListCategories();

  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();
  const deleteOffer = useDeleteOffer();
  const createProduct = useCreateProduct();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferWithProduct | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const [offerForm, setOfferForm] = useState({
    productId: "",
    price: "",
    moq: "",
    stock: "",
    deliveryDays: "",
    status: "active" as "active" | "inactive",
  });
  const [tiers, setTiers] = useState<TierDraft[]>([{ ...emptyTier }]);

  const [productForm, setProductForm] = useState({ categoryId: "", name: "", description: "", unit: "" });

  const invalidateOffers = () => queryClient.invalidateQueries({ queryKey: getListMyOffersQueryKey() });

  const openCreateOffer = () => {
    setEditingOffer(null);
    setOfferForm({ productId: "", price: "", moq: "", stock: "", deliveryDays: "", status: "active" });
    setTiers([{ ...emptyTier }]);
    setOfferDialogOpen(true);
  };

  const openEditOffer = (offer: OfferWithProduct) => {
    setEditingOffer(offer);
    setOfferForm({
      productId: String(offer.productId),
      price: String(offer.price),
      moq: String(offer.moq),
      stock: String(offer.stock),
      deliveryDays: String(offer.deliveryDays),
      status: offer.status,
    });
    setTiers(
      offer.priceTiers.length
        ? offer.priceTiers.map((t) => ({ minQty: String(t.minQty), maxQty: t.maxQty !== null ? String(t.maxQty) : "", price: String(t.price) }))
        : [{ ...emptyTier }],
    );
    setOfferDialogOpen(true);
  };

  const handleTierChange = (index: number, field: keyof TierDraft, value: string) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addTier = () => setTiers((prev) => [...prev, { ...emptyTier }]);
  const removeTier = (index: number) => setTiers((prev) => prev.filter((_, i) => i !== index));

  const handleOfferSubmit = () => {
    if (!offerForm.productId || !offerForm.price || !offerForm.moq || !offerForm.stock || !offerForm.deliveryDays) {
      toast({ title: "Missing fields", description: "All offer fields are required.", variant: "destructive" });
      return;
    }

    const priceTiers: PriceTier[] = tiers
      .filter((t) => t.minQty && t.price)
      .map((t) => ({ minQty: Number(t.minQty), maxQty: t.maxQty ? Number(t.maxQty) : null, price: Number(t.price) }));

    const data = {
      productId: Number(offerForm.productId),
      price: Number(offerForm.price),
      moq: Number(offerForm.moq),
      stock: Number(offerForm.stock),
      deliveryDays: Number(offerForm.deliveryDays),
      priceTiers,
    };

    if (editingOffer) {
      updateOffer.mutate(
        { id: editingOffer.id, data: { ...data, status: offerForm.status } },
        {
          onSuccess: () => {
            toast({ title: "Offer updated" });
            invalidateOffers();
            setOfferDialogOpen(false);
          },
          onError: (err: any) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }),
        },
      );
    } else {
      createOffer.mutate(
        { data },
        {
          onSuccess: () => {
            toast({ title: "Offer created" });
            invalidateOffers();
            setOfferDialogOpen(false);
          },
          onError: (err: any) => toast({ title: "Create failed", description: err?.message, variant: "destructive" }),
        },
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteOffer.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Offer removed" });
          invalidateOffers();
        },
        onError: (err: any) => toast({ title: "Delete failed", description: err?.message, variant: "destructive" }),
      },
    );
  };

  const handleCreateProduct = () => {
    if (!productForm.categoryId || !productForm.name.trim() || !productForm.unit.trim()) {
      toast({ title: "Missing fields", description: "Category, name, and unit are required.", variant: "destructive" });
      return;
    }
    createProduct.mutate(
      {
        data: {
          categoryId: Number(productForm.categoryId),
          name: productForm.name,
          description: productForm.description || undefined,
          unit: productForm.unit,
        },
      },
      {
        onSuccess: (newProduct) => {
          toast({ title: "Product created", description: "You can now list an offer for it." });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setProductDialogOpen(false);
          setProductForm({ categoryId: "", name: "", description: "", unit: "" });
          setOfferForm((f) => ({ ...f, productId: String(newProduct.id) }));
        },
        onError: (err: any) => toast({ title: "Create failed", description: err?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Offers</h1>
          <p className="text-muted-foreground">Manage the products and pricing you offer to buyers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setProductDialogOpen(true)}>
            <PackagePlus className="h-4 w-4 mr-2" /> New Product
          </Button>
          <Button onClick={openCreateOffer}>
            <Plus className="h-4 w-4 mr-2" /> New Offer
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">No offers yet</h2>
          <p className="text-muted-foreground mt-2">List your first offer to start selling.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>MOQ</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-medium">{offer.productName}</div>
                    <div className="text-xs text-muted-foreground">{offer.productUnit}</div>
                  </TableCell>
                  <TableCell className="font-bold text-primary">${offer.price.toFixed(2)}</TableCell>
                  <TableCell>{offer.moq}</TableCell>
                  <TableCell>{offer.stock}</TableCell>
                  <TableCell>{offer.deliveryDays}d</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={offer.status === "active" ? "border-primary/40 text-primary" : "text-muted-foreground"}>
                      {offer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditOffer(offer)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(offer.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOffer ? "Edit Offer" : "New Offer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={offerForm.productId} onValueChange={(v) => setOfferForm({ ...offerForm, productId: v })} disabled={!!editingOffer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Price ($)</Label>
                <Input type="number" min={0} step="0.01" value={offerForm.price} onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>MOQ</Label>
                <Input type="number" min={1} value={offerForm.moq} onChange={(e) => setOfferForm({ ...offerForm, moq: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" min={0} value={offerForm.stock} onChange={(e) => setOfferForm({ ...offerForm, stock: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Delivery Days</Label>
                <Input type="number" min={0} value={offerForm.deliveryDays} onChange={(e) => setOfferForm({ ...offerForm, deliveryDays: e.target.value })} />
              </div>
            </div>

            {editingOffer && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={offerForm.status} onValueChange={(v: "active" | "inactive") => setOfferForm({ ...offerForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Volume Price Tiers</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addTier}>
                  <Plus className="h-3 w-3 mr-1" /> Add Tier
                </Button>
              </div>
              {tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Min qty" type="number" value={tier.minQty} onChange={(e) => handleTierChange(i, "minQty", e.target.value)} />
                  <Input placeholder="Max qty (blank = ∞)" type="number" value={tier.maxQty} onChange={(e) => handleTierChange(i, "maxQty", e.target.value)} />
                  <Input placeholder="Price" type="number" step="0.01" value={tier.price} onChange={(e) => handleTierChange(i, "price", e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTier(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleOfferSubmit} disabled={createOffer.isPending || updateOffer.isPending}>
              {(createOffer.isPending || updateOffer.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingOffer ? "Save Changes" : "Create Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Master Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={productForm.categoryId} onValueChange={(v) => setProductForm({ ...productForm, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input placeholder="e.g. box, unit, pack" value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateProduct} disabled={createProduct.isPending}>
              {createProduct.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

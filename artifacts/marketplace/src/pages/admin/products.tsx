import { useState } from "react";
import {
  useListProducts,
  useListCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateCategory,
  useDeleteCategory,
  getListProductsQueryKey,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Trash2, Pencil, Tag, Loader2, Search } from "lucide-react";

type ProductFormState = {
  name: string;
  description: string;
  unit: string;
  categoryId: string;
  imageUrl: string;
};

const EMPTY_PRODUCT: ProductFormState = {
  name: "",
  description: "",
  unit: "",
  categoryId: "",
  imageUrl: "",
};

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [productDialog, setProductDialog] = useState<{ open: boolean; id?: number }>({ open: false });
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT);
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "" });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const productsQueryKey = getListProductsQueryKey({ search: search || undefined });
  const categoriesQueryKey = getListCategoriesQueryKey();

  const { data: products = [], isLoading: productsLoading } = useListProducts(
    { search: search || undefined },
    { query: { queryKey: productsQueryKey } },
  );
  const { data: categories = [] } = useListCategories({ query: { queryKey: categoriesQueryKey } });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const openAddProduct = () => {
    setProductForm(EMPTY_PRODUCT);
    setProductDialog({ open: true });
  };

  const openEditProduct = (p: (typeof products)[0]) => {
    setProductForm({
      name: p.name,
      description: p.description ?? "",
      unit: p.unit,
      categoryId: String(p.categoryId),
      imageUrl: p.imageUrl ?? "",
    });
    setProductDialog({ open: true, id: p.id });
  };

  const handleProductSubmit = () => {
    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim() || undefined,
      unit: productForm.unit.trim(),
      categoryId: Number(productForm.categoryId),
      imageUrl: productForm.imageUrl.trim() || undefined,
    };

    if (!payload.name || !payload.unit || !payload.categoryId) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setProductDialog({ open: false });
    };

    if (productDialog.id) {
      updateProduct.mutate(
        { id: productDialog.id, data: payload },
        {
          onSuccess: () => { toast({ title: "Product updated" }); invalidate(); },
          onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
        },
      );
    } else {
      createProduct.mutate(
        { data: payload },
        {
          onSuccess: () => { toast({ title: "Product created" }); invalidate(); },
          onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
        },
      );
    }
  };

  const handleDeleteProduct = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This will also remove all vendor offers and wishlist entries for this product.`)) return;
    deleteProduct.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Product deleted" });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
      },
    );
  };

  const handleCreateCategory = () => {
    if (!categoryForm.name.trim() || !categoryForm.slug.trim()) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    createCategory.mutate(
      { data: { name: categoryForm.name.trim(), slug: categoryForm.slug.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Category created" });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          setCategoryForm({ name: "", slug: "" });
          setCategoryDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
      },
    );
  };

  const handleDeleteCategory = (id: number, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    deleteCategory.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Category deleted" });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3">
        <Package className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Product Catalog</h1>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" /> Master Products
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="h-4 w-4 mr-2" /> Categories
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={openAddProduct}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>

          {productsLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Offers</TableHead>
                    <TableHead>Min Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No products yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium text-foreground">{p.name}</div>
                          {p.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.categoryName}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.unit}</TableCell>
                        <TableCell>{p.offerCount}</TableCell>
                        <TableCell>
                          {p.minPrice != null ? (
                            <span className="font-medium text-primary">${p.minPrice.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditProduct(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setCategoryDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Category
            </Button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                      No categories yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={productDialog.open} onOpenChange={(open) => setProductDialog({ open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{productDialog.id ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Disposable Gloves"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={productForm.categoryId}
                  onValueChange={(v) => setProductForm({ ...productForm, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
                <Label>
                  Unit <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  placeholder="e.g. box, pack, piece"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Input
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog({ open: false })}>
              Cancel
            </Button>
            <Button
              onClick={handleProductSubmit}
              disabled={createProduct.isPending || updateProduct.isPending}
            >
              {(createProduct.isPending || updateProduct.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {productDialog.id ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                  setCategoryForm({ name, slug });
                }}
                placeholder="e.g. Surgical Supplies"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder="surgical-supplies"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={createCategory.isPending}>
              {createCategory.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

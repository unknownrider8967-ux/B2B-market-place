import { useState } from "react";
import {
  useListCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
} from "@workspace/api-client-react";
import { getListCouponsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Tag } from "lucide-react";

type DiscountType = "percentage" | "fixed";

interface CouponForm {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderValue: string;
  usageLimit: string;
  isActive: boolean;
  expiresAt: string;
}

const defaultForm: CouponForm = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minOrderValue: "",
  usageLimit: "",
  isActive: true,
  expiresAt: "",
};

export default function AdminCoupons() {
  const { data: coupons = [], isLoading } = useListCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CouponForm>(defaultForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() });

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (coupon: (typeof coupons)[number]) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderValue: coupon.minOrderValue != null ? String(coupon.minOrderValue) : "",
      usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
      isActive: coupon.isActive,
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const buildPayload = () => ({
    code: form.code,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minOrderValue: form.minOrderValue !== "" ? Number(form.minOrderValue) : undefined,
    usageLimit: form.usageLimit !== "" ? Number(form.usageLimit) : undefined,
    isActive: form.isActive,
    expiresAt: form.expiresAt ? new Date(form.expiresAt) : undefined,
  });

  const handleSave = () => {
    if (!form.code || !form.discountValue) {
      toast({ title: "Validation error", description: "Code and discount value are required.", variant: "destructive" });
      return;
    }
    const payload = buildPayload();
    if (editingId != null) {
      updateCoupon.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => { toast({ title: "Coupon updated" }); setDialogOpen(false); invalidate(); },
          onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
        },
      );
    } else {
      createCoupon.mutate(
        { data: payload },
        {
          onSuccess: () => { toast({ title: "Coupon created" }); setDialogOpen(false); invalidate(); },
          onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
        },
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteCoupon.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Coupon deleted" }); setDeleteConfirmId(null); invalidate(); },
        onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Coupons</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Coupon
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No coupons yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{c.discountType}</Badge>
                  </TableCell>
                  <TableCell>
                    {c.discountType === "percentage" ? `${c.discountValue}%` : `$${Number(c.discountValue).toFixed(2)}`}
                  </TableCell>
                  <TableCell>{c.minOrderValue != null ? `$${Number(c.minOrderValue).toFixed(2)}` : "—"}</TableCell>
                  <TableCell>
                    {c.usedCount}{c.usageLimit != null ? `/${c.usageLimit}` : ""}
                  </TableCell>
                  <TableCell>
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <Badge className={c.isActive ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirmId(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId != null ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Code</Label>
              <Input
                placeholder="SUMMER20"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="mt-1 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v as DiscountType })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder={form.discountType === "percentage" ? "20" : "10.00"}
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Order Value ($)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Optional"
                  value={form.minOrderValue}
                  onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createCoupon.isPending || updateCoupon.isPending}>
              {(createCoupon.isPending || updateCoupon.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId != null ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId != null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Are you sure you want to delete this coupon? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId != null && handleDelete(deleteConfirmId)}
              disabled={deleteCoupon.isPending}
            >
              {deleteCoupon.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

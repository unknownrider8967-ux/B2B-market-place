import { useState } from "react";
import {
  useListMyWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
  useListInventoryAlerts,
  getListMyWarehousesQueryKey,
  getListInventoryAlertsQueryKey,
} from "@workspace/api-client-react";
import type { Warehouse } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Warehouse as WarehouseIcon, Plus, Pencil, Trash2, Loader2, AlertTriangle, PackageX } from "lucide-react";

type WarehouseForm = { name: string; address: string };
const EMPTY_FORM: WarehouseForm = { name: "", address: "" };

export default function VendorWarehouses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: warehouses = [], isLoading } = useListMyWarehouses({
    query: { queryKey: getListMyWarehousesQueryKey() },
  });
  const { data: alerts = [], isLoading: alertsLoading } = useListInventoryAlerts({
    query: { queryKey: getListInventoryAlertsQueryKey() },
  });

  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<WarehouseForm>(EMPTY_FORM);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListMyWarehousesQueryKey() });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setForm({ name: w.name, address: w.address ?? "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "Warehouse name is required", variant: "destructive" });
      return;
    }
    const data = { name: form.name.trim(), address: form.address.trim() || undefined };

    if (editing) {
      updateWarehouse.mutate(
        { id: editing.id, data },
        {
          onSuccess: () => { toast({ title: "Warehouse updated" }); invalidate(); setDialogOpen(false); },
          onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
        },
      );
    } else {
      createWarehouse.mutate(
        { data },
        {
          onSuccess: () => { toast({ title: "Warehouse created" }); invalidate(); setDialogOpen(false); },
          onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
        },
      );
    }
  };

  const handleDelete = (w: Warehouse) => {
    if (!confirm(`Delete warehouse "${w.name}"?`)) return;
    deleteWarehouse.mutate(
      { id: w.id },
      {
        onSuccess: () => { toast({ title: "Warehouse deleted" }); invalidate(); },
        onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
      },
    );
  };

  const outOfStock = alerts.filter((a) => a.severity === "out_of_stock");
  const lowStock = alerts.filter((a) => a.severity === "low_stock");

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <WarehouseIcon className="h-7 w-7 text-primary" /> Warehouses
          </h1>
          <p className="text-muted-foreground">Manage your fulfillment locations.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Warehouse
        </Button>
      </div>

      {/* Inventory Alerts Panel */}
      {alertsLoading ? null : alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Inventory Alerts
          </h2>
          {outOfStock.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium text-destructive text-sm">
                <PackageX className="h-4 w-4" /> Out of Stock ({outOfStock.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {outOfStock.map((a) => (
                  <Badge key={a.offerId} variant="destructive" className="font-normal">
                    {a.productName} — 0 units
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4" /> Low Stock ({lowStock.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStock.map((a) => (
                  <Badge key={a.offerId} variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-normal">
                    {a.productName} — {a.stock} / {a.lowStockThreshold} threshold
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warehouses Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <WarehouseIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">No warehouses yet</h2>
          <p className="text-muted-foreground mt-2">Add your first warehouse to track fulfillment locations.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((w) => (
                <TableRow key={w.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">{w.address ?? <span className="text-xs italic">No address</span>}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(w)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(w)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Main Distribution Center"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="e.g. 123 Logistics Ave, Chicago IL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createWarehouse.isPending || updateWarehouse.isPending}>
              {(createWarehouse.isPending || updateWarehouse.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

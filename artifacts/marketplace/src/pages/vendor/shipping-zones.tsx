import { useState } from "react";
import {
  useListMyShippingZones,
  useCreateShippingZone,
  useUpdateShippingZone,
  useDeleteShippingZone,
  getListMyShippingZonesQueryKey,
} from "@workspace/api-client-react";
import type { ShippingZone } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Truck, Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react";

type ZoneForm = { name: string; regions: string; rate: string; etaDays: string };
const EMPTY_FORM: ZoneForm = { name: "", regions: "", rate: "0", etaDays: "3" };

export default function VendorShippingZones() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: zones = [], isLoading } = useListMyShippingZones({
    query: { queryKey: getListMyShippingZonesQueryKey() },
  });

  const createZone = useCreateShippingZone();
  const updateZone = useUpdateShippingZone();
  const deleteZone = useDeleteShippingZone();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingZone | null>(null);
  const [form, setForm] = useState<ZoneForm>(EMPTY_FORM);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListMyShippingZonesQueryKey() });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (z: ShippingZone) => {
    setEditing(z);
    setForm({
      name: z.name,
      regions: z.regions,
      rate: String(z.rate),
      etaDays: String(z.etaDays),
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.regions.trim()) {
      toast({ title: "Name and regions are required", variant: "destructive" });
      return;
    }
    const rate = parseFloat(form.rate);
    const etaDays = parseInt(form.etaDays, 10);
    if (isNaN(rate) || rate < 0) {
      toast({ title: "Rate must be a non-negative number", variant: "destructive" });
      return;
    }
    if (isNaN(etaDays) || etaDays < 0) {
      toast({ title: "ETA days must be a non-negative integer", variant: "destructive" });
      return;
    }
    const data = { name: form.name.trim(), regions: form.regions.trim(), rate, etaDays };

    if (editing) {
      updateZone.mutate(
        { id: editing.id, data },
        {
          onSuccess: () => { toast({ title: "Shipping zone updated" }); invalidate(); setDialogOpen(false); },
          onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
        },
      );
    } else {
      createZone.mutate(
        { data },
        {
          onSuccess: () => { toast({ title: "Shipping zone created" }); invalidate(); setDialogOpen(false); },
          onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
        },
      );
    }
  };

  const handleDelete = (z: ShippingZone) => {
    if (!confirm(`Delete shipping zone "${z.name}"?`)) return;
    deleteZone.mutate(
      { id: z.id },
      {
        onSuccess: () => { toast({ title: "Shipping zone deleted" }); invalidate(); },
        onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-7 w-7 text-primary" /> Shipping Zones
          </h1>
          <p className="text-muted-foreground">Define delivery regions, rates, and estimated arrival times.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Zone
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : zones.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">No shipping zones yet</h2>
          <p className="text-muted-foreground mt-2">Create zones to define delivery regions and pricing for buyers.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Zone Name</TableHead>
                <TableHead>Regions</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((z) => (
                <TableRow key={z.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{z.name}</TableCell>
                  <TableCell>
                    <div className="flex items-start gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{z.regions}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-primary">${Number(z.rate).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{z.etaDays} day{z.etaDays !== 1 ? "s" : ""}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(z)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(z)}>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Shipping Zone" : "Add Shipping Zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Zone Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Local, National, International"
              />
            </div>
            <div className="space-y-2">
              <Label>Regions <span className="text-destructive">*</span></Label>
              <Input
                value={form.regions}
                onChange={(e) => setForm({ ...form, regions: e.target.value })}
                placeholder="e.g. Chicago, IL, Indiana, Wisconsin"
              />
              <p className="text-xs text-muted-foreground">Comma-separated list of regions, states, or cities.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ETA (days)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.etaDays}
                  onChange={(e) => setForm({ ...form, etaDays: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createZone.isPending || updateZone.isPending}>
              {(createZone.isPending || updateZone.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Save Changes" : "Create Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import {
  useListVendorExpiringBatches,
  useListMyOffers,
  useCreateOfferBatch,
  getListVendorExpiringBatchesQueryKey,
  getListMyOffersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Plus, AlertTriangle, CalendarClock } from "lucide-react";

const RESET = { offerId: "", batchNumber: "", lotNumber: "", quantity: "", manufactureDate: "", expiryDate: "" };

function daysUntil(date: string | Date) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function urgencyClass(days: number) {
  if (days < 0) return "bg-destructive/12 text-destructive border-destructive/30";
  if (days <= 14) return "bg-red-500/12 text-red-600 border-red-400/30";
  if (days <= 30) return "bg-amber-500/12 text-amber-600 border-amber-400/30";
  return "bg-sky-500/12 text-sky-600 border-sky-400/30";
}

export default function VendorBatches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...RESET });

  const { data: expiring = [], isLoading } = useListVendorExpiringBatches(
    { days: 90 },
    { query: { queryKey: getListVendorExpiringBatchesQueryKey({ days: 90 }) } },
  );
  const { data: offers = [] } = useListMyOffers({ query: { queryKey: getListMyOffersQueryKey() } });

  const createBatch = useCreateOfferBatch({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorExpiringBatchesQueryKey() });
        toast({ title: "Batch recorded" });
        setOpen(false);
        setForm({ ...RESET });
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
    },
  });

  const handleSubmit = () => {
    if (!form.offerId || !form.batchNumber || !form.quantity || !form.expiryDate) {
      toast({ title: "Missing fields", description: "Offer, batch number, quantity, and expiry date are required.", variant: "destructive" });
      return;
    }
    createBatch.mutate({
      id: Number(form.offerId),
      data: {
        vendorOfferId: Number(form.offerId),
        batchNumber: form.batchNumber,
        lotNumber: form.lotNumber || null,
        quantity: Number(form.quantity),
        manufactureDate: form.manufactureDate ? new Date(form.manufactureDate) : null,
        expiryDate: new Date(form.expiryDate),
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Batch & Expiry Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track lot numbers and expiry dates across your inventory. Showing batches expiring within 90 days.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Record Batch
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <Skeleton className="h-4 w-48 skeleton-shimmer" />
              <Skeleton className="h-3 w-72 skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : expiring.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <CalendarClock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No expiring batches</h2>
          <p className="text-sm text-muted-foreground mt-1.5 mb-5">
            No batches expiring in the next 90 days. Record batches to track expiry.
          </p>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Record Batch
          </Button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {expiring.map((b: any) => {
            const days = daysUntil(b.expiryDate);
            return (
              <Card key={b.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{b.productName ?? `Offer #${b.vendorOfferId}`}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {b.batchNumber}
                        </Badge>
                        {b.lotNumber && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Lot: {b.lotNumber}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Qty: {b.quantity.toLocaleString()} units
                        {b.manufactureDate && ` · Mfg: ${new Date(b.manufactureDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs gap-1 ${urgencyClass(days)}`}>
                      {days < 0 ? (
                        <><AlertTriangle className="h-3 w-3" /> EXPIRED {Math.abs(days)}d ago</>
                      ) : days <= 30 ? (
                        <><AlertTriangle className="h-3 w-3" /> Expires in {days}d</>
                      ) : (
                        <>Expires {new Date(b.expiryDate).toLocaleDateString()}</>
                      )}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Record Batch Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm({ ...RESET }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record New Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Offer / Product *</Label>
              <Select value={form.offerId} onValueChange={(v) => setForm((f) => ({ ...f, offerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select an offer" /></SelectTrigger>
                <SelectContent>
                  {offers.map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.productName ?? `Offer #${o.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Batch Number *</Label>
                <Input
                  placeholder="e.g. BATCH-001"
                  value={form.batchNumber}
                  onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lot Number</Label>
                <Input
                  placeholder="Optional"
                  value={form.lotNumber}
                  onChange={(e) => setForm((f) => ({ ...f, lotNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                placeholder="Number of units"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Manufacture Date</Label>
                <Input
                  type="date"
                  value={form.manufactureDate}
                  onChange={(e) => setForm((f) => ({ ...f, manufactureDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date *</Label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createBatch.isPending}>
              {createBatch.isPending ? "Saving…" : "Record Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

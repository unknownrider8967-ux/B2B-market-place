import { useState } from "react";
import { useListRfqs, useCreateRfqResponse } from "@workspace/api-client-react";
import { getListRfqsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, MessageSquareText } from "lucide-react";

export default function VendorRfqs() {
  const { data: rfqs = [], isLoading } = useListRfqs({ query: { queryKey: getListRfqsQueryKey() } });
  const respond = useCreateRfqResponse();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [form, setForm] = useState({ price: "", quantity: "", leadTimeDays: "", terms: "" });

  const openRespond = (id: number, defaultQty: number) => {
    setRespondingId(id);
    setForm({ price: "", quantity: String(defaultQty), leadTimeDays: "", terms: "" });
  };

  const handleSubmit = () => {
    if (respondingId === null) return;
    if (!form.price || !form.quantity || !form.leadTimeDays) {
      toast({ title: "Missing fields", description: "Price, quantity, and lead time are required.", variant: "destructive" });
      return;
    }
    respond.mutate(
      {
        id: respondingId,
        data: {
          price: Number(form.price),
          quantity: Number(form.quantity),
          leadTimeDays: Number(form.leadTimeDays),
          terms: form.terms || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Quote submitted" });
          queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() });
          setRespondingId(null);
        },
        onError: (err: any) => toast({ title: "Failed to submit", description: err?.message, variant: "destructive" }),
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
        <FileText className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Open RFQs</h1>
      </div>

      {rfqs.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <MessageSquareText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">No open RFQs</h2>
          <p className="text-muted-foreground mt-2">New buyer requests will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rfqs.map((rfq) => (
            <div key={rfq.id} className="p-5 bg-card border border-border rounded-xl">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground">{rfq.title}</h3>
                <Badge variant="outline">{rfq.buyerCompanyName}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{rfq.description || "No description"}</p>
              <div className="text-xs text-muted-foreground mt-3">Quantity: {rfq.quantity}</div>
              <Button size="sm" className="mt-4 w-full" onClick={() => openRespond(rfq.id, rfq.quantity)}>
                Submit Quote
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={respondingId !== null} onOpenChange={(open) => !open && setRespondingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lead Time (days)</Label>
              <Input type="number" min={0} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Terms (optional)</Label>
              <Textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={respond.isPending}>
              {respond.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

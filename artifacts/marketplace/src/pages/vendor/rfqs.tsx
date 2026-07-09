import { useState } from "react";
import { useListRfqs, useCreateRfqResponse } from "@workspace/api-client-react";
import { getListRfqsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquareText, Building2, SendHorizonal } from "lucide-react";

function RfqSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-5 bg-card border border-border rounded-xl space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-40 skeleton-shimmer" />
            <Skeleton className="h-5 w-20 rounded-full skeleton-shimmer" />
          </div>
          <Skeleton className="h-4 w-full skeleton-shimmer" />
          <Skeleton className="h-4 w-2/3 skeleton-shimmer" />
          <Skeleton className="h-8 w-full skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

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
        onError: (err: any) =>
          toast({ title: "Failed to submit", description: err?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Open RFQs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Buyer requests you can quote on.</p>
      </div>

      {isLoading ? (
        <RfqSkeleton />
      ) : rfqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <MessageSquareText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">No open RFQs</h2>
          <p className="text-sm text-muted-foreground mt-1">New buyer requests will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 stagger-children">
          {rfqs.map((rfq) => (
            <div key={rfq.id} className="p-5 bg-card border border-border rounded-xl card-hover">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm text-foreground line-clamp-1">{rfq.title}</h3>
                <Badge variant="outline" className="text-[10px] shrink-0 flex items-center gap-1">
                  <Building2 className="h-2.5 w-2.5" />
                  {rfq.buyerCompanyName}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                {rfq.description || "No description provided."}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span className="font-medium text-foreground">Qty {rfq.quantity}</span>
              </div>
              <Button
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => openRespond(rfq.id, rfq.quantity)}
              >
                <SendHorizonal className="h-3.5 w-3.5" />
                Submit Quote
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={respondingId !== null} onOpenChange={(open) => !open && setRespondingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Price ($)</Label>
                <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Quantity</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Lead Time (days)</Label>
              <Input type="number" min={0} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Terms (optional)</Label>
              <Textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondingId(null)}>Cancel</Button>
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

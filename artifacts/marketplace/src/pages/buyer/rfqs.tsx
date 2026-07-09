import { useState } from "react";
import { useListRfqs, useCreateRfq, useGetRfq } from "@workspace/api-client-react";
import { getListRfqsQueryKey, getGetRfqQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, Plus, MessageSquareText, Clock, CheckCircle2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  open:   "bg-primary/12 text-primary border-primary/30",
  closed: "bg-muted text-muted-foreground border-border",
};

function RfqDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: rfq, isLoading } = useGetRfq(id, { query: { queryKey: getGetRfqQueryKey(id) } });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{rfq?.title ?? "RFQ Details"}</DialogTitle>
        </DialogHeader>
        {isLoading || !rfq ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-full skeleton-shimmer" />
            <Skeleton className="h-4 w-3/4 skeleton-shimmer" />
            <Skeleton className="h-32 w-full skeleton-shimmer" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
              {rfq.description || "No description provided."}
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Quantity</span>
                <div className="font-semibold text-foreground mt-0.5">{rfq.quantity}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Responses</span>
                <div className="font-semibold text-foreground mt-0.5">{rfq.responses.length}</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Vendor Responses ({rfq.responses.length})
              </h3>
              {rfq.responses.length === 0 ? (
                <div className="text-center py-6 bg-muted/30 rounded-lg">
                  <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Awaiting vendor responses</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rfq.responses.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl border border-border bg-card">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">{r.vendorName}</span>
                        <span className="font-bold text-primary">${r.price.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Qty {r.quantity}</span>
                        <span>·</span>
                        <span>{r.leadTimeDays} day lead time</span>
                      </div>
                      {r.terms && <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">{r.terms}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RfqSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-5 bg-card border border-border rounded-xl space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-40 skeleton-shimmer" />
            <Skeleton className="h-5 w-14 rounded-full skeleton-shimmer" />
          </div>
          <Skeleton className="h-4 w-full skeleton-shimmer" />
          <Skeleton className="h-4 w-2/3 skeleton-shimmer" />
          <div className="flex justify-between pt-1">
            <Skeleton className="h-3.5 w-16 skeleton-shimmer" />
            <Skeleton className="h-3.5 w-20 skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BuyerRfqs() {
  const { data: rfqs = [], isLoading } = useListRfqs({ query: { queryKey: getListRfqsQueryKey() } });
  const createRfq = useCreateRfq();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", quantity: "" });

  const handleSubmit = () => {
    if (!form.title.trim() || !form.quantity) {
      toast({ title: "Missing info", description: "Title and quantity are required.", variant: "destructive" });
      return;
    }
    createRfq.mutate(
      { data: { title: form.title, description: form.description || undefined, quantity: Number(form.quantity) } },
      {
        onSuccess: () => {
          toast({ title: "RFQ submitted", description: "Vendors will be able to respond shortly." });
          queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() });
          setOpen(false);
          setForm({ title: "", description: "", quantity: "" });
        },
        onError: (err: any) => toast({ title: "Failed to submit", description: err?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Requests for Quotation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Submit requests and track vendor responses.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New RFQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit a Request for Quotation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Bulk order of surgical gloves"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Specify requirements, deadlines, quality standards…"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createRfq.isPending}>
                {createRfq.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit RFQ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <RfqSkeleton />
      ) : rfqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <MessageSquareText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">No RFQs yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Submit a request to get quotes from vendors.</p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create your first RFQ
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 stagger-children">
          {rfqs.map((rfq) => (
            <button
              key={rfq.id}
              onClick={() => setSelectedId(rfq.id)}
              className="text-left p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all duration-150 group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {rfq.title}
                </h3>
                <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_STYLES[rfq.status] ?? ""}`}>
                  {rfq.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {rfq.description || "No description provided."}
              </p>
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <span>Qty {rfq.quantity}</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {rfq.responseCount} response{rfq.responseCount !== 1 ? "s" : ""}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedId !== null && <RfqDetail id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

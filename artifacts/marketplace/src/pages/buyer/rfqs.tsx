import { useState } from "react";
import { useListRfqs, useCreateRfq, useGetRfq } from "@workspace/api-client-react";
import { getListRfqsQueryKey, getGetRfqQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, Plus, MessageSquareText } from "lucide-react";

function RfqDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: rfq, isLoading } = useGetRfq(id, { query: { queryKey: getGetRfqQueryKey(id) } });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rfq?.title ?? "RFQ"}</DialogTitle>
        </DialogHeader>
        {isLoading || !rfq ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{rfq.description || "No description provided."}</div>
            <div className="text-sm">Quantity requested: <span className="font-medium text-foreground">{rfq.quantity}</span></div>
            <div>
              <h3 className="font-semibold mb-2">Vendor Responses ({rfq.responses.length})</h3>
              {rfq.responses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No responses yet.</p>
              ) : (
                <div className="space-y-2">
                  {rfq.responses.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border border-border bg-muted/20">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{r.vendorName}</span>
                        <span className="font-bold text-primary">${r.price.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Qty {r.quantity} &bull; Lead time {r.leadTimeDays} days
                      </div>
                      {r.terms && <div className="text-xs mt-1">{r.terms}</div>}
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
        onError: (err: any) => {
          toast({ title: "Failed to submit", description: err?.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Requests for Quotation</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New RFQ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit a Request for Quotation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Bulk order of surgical gloves" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Specify requirements, deadlines, quality standards..." />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={createRfq.isPending}>
                {createRfq.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit RFQ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rfqs.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <MessageSquareText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">No RFQs yet</h2>
          <p className="text-muted-foreground mt-2">Submit a request to get quotes from vendors.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rfqs.map((rfq) => (
            <button
              key={rfq.id}
              onClick={() => setSelectedId(rfq.id)}
              className="text-left p-5 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground">{rfq.title}</h3>
                <Badge variant="outline" className={rfq.status === "open" ? "border-primary/40 text-primary" : ""}>
                  {rfq.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{rfq.description || "No description"}</p>
              <div className="text-xs text-muted-foreground mt-3 flex justify-between">
                <span>Qty {rfq.quantity}</span>
                <span>{rfq.responseCount} response{rfq.responseCount === 1 ? "" : "s"}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedId !== null && <RfqDetail id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

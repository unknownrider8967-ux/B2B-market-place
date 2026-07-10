import { useState } from "react";
import {
  useListMyReturns,
  useListMyOrders,
  useCreateReturn,
  getListMyReturnsQueryKey,
  getListMyOrdersQueryKey,
} from "@workspace/api-client-react";
import type { Return } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PackageSearch, Plus, AlertCircle, RotateCcw } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  requested:    "bg-amber-500/12 text-amber-600 border-amber-400/30",
  under_review: "bg-sky-500/12 text-sky-600 border-sky-400/30",
  approved:     "bg-primary/12 text-primary border-primary/30",
  rejected:     "bg-destructive/12 text-destructive border-destructive/30",
  refunded:     "bg-violet-500/12 text-violet-600 border-violet-400/30",
};

const TYPE_LABELS: Record<string, string> = {
  damaged:    "Damaged Goods",
  missing:    "Missing Item",
  wrong_item: "Wrong Item",
  other:      "Other",
};

function ReturnSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32 skeleton-shimmer" />
            <Skeleton className="h-5 w-20 rounded-full skeleton-shimmer" />
          </div>
          <Skeleton className="h-3 w-64 skeleton-shimmer" />
          <Skeleton className="h-3 w-48 skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

export default function BuyerReturns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [returnType, setReturnType] = useState<string>("");
  const [reason, setReason] = useState("");

  const { data: returns = [], isLoading } = useListMyReturns({
    query: { queryKey: getListMyReturnsQueryKey() },
  });

  const { data: orders = [] } = useListMyOrders({
    query: { queryKey: getListMyOrdersQueryKey() },
  });

  const createReturn = useCreateReturn({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyReturnsQueryKey() });
        toast({ title: "Return submitted", description: "Your request is under review." });
        setOpen(false);
        resetForm();
      },
      onError: (err: any) => {
        toast({ title: "Submission failed", description: err?.message ?? "Please try again.", variant: "destructive" });
      },
    },
  });

  const resetForm = () => {
    setSelectedOrderId("");
    setSelectedItemId("");
    setReturnType("");
    setReason("");
  };

  const selectedOrder = orders.find((o) => String(o.id) === selectedOrderId);
  const selectedItems = selectedOrder?.items ?? [];

  const handleSubmit = () => {
    if (!selectedOrderId || !selectedItemId || !returnType || !reason.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    createReturn.mutate({
      data: {
        orderId: Number(selectedOrderId),
        orderItemId: Number(selectedItemId),
        type: returnType as any,
        reason,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Returns & Claims</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Submit and track return requests for your orders.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {isLoading ? (
        <ReturnSkeleton />
      ) : returns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <RotateCcw className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No return requests</h2>
          <p className="text-sm text-muted-foreground mt-1.5 mb-5">Submit a return or claim for a received order.</p>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Request
          </Button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {(returns as (Return & { productName?: string | null; vendorName?: string | null })[]).map((r) => (
            <Card key={r.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {r.productName ?? `Order Item #${r.orderItemId}`}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[r.type] ?? r.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Order #{r.orderId} · Vendor: {r.vendorName ?? r.vendorCompanyId}
                    </p>
                    <p className="text-sm text-foreground/80 mt-1">{r.reason}</p>
                    {r.adminNote && (
                      <div className="flex items-start gap-1.5 mt-2 p-2 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{r.adminNote}</span>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      {new Date(r.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs ${STATUS_STYLES[r.status] ?? ""}`}>
                    {r.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Return Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Return / Claim</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Order</Label>
              <Select value={selectedOrderId} onValueChange={(v) => { setSelectedOrderId(v); setSelectedItemId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      Order #{o.id} — ${Number(o.totalAmount).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedItems.length > 0 && (
              <div className="space-y-1.5">
                <Label>Item</Label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedItems.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.productName} × {item.quantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Claim Type</Label>
              <Select value={returnType} onValueChange={setReturnType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Damaged Goods</SelectItem>
                  <SelectItem value="missing">Missing Item</SelectItem>
                  <SelectItem value="wrong_item">Wrong Item Received</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reason / Details</Label>
              <Textarea
                placeholder="Describe the issue in detail..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createReturn.isPending}>
              {createReturn.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

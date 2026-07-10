import { useState } from "react";
import {
  useListMyVendorOrders,
  useUpdateVendorOrderPoStatus,
  useUpdateVendorOrderStatus,
  getListMyVendorOrdersQueryKey,
} from "@workspace/api-client-react";
import type { VendorOrderWithItems } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, XCircle, Truck, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-500/12 text-amber-600 border-amber-400/30",
  confirmed:  "bg-sky-500/12 text-sky-600 border-sky-400/30",
  processing: "bg-blue-500/12 text-blue-600 border-blue-400/30",
  packed:     "bg-violet-500/12 text-violet-600 border-violet-400/30",
  shipped:    "bg-indigo-500/12 text-indigo-600 border-indigo-400/30",
  delivered:  "bg-primary/12 text-primary border-primary/30",
  completed:  "bg-primary/12 text-primary border-primary/30",
  cancelled:  "bg-destructive/12 text-destructive border-destructive/30",
};

const PO_STYLES: Record<string, string> = {
  pending:  "bg-amber-500/12 text-amber-600 border-amber-400/30",
  accepted: "bg-primary/12 text-primary border-primary/30",
  rejected: "bg-destructive/12 text-destructive border-destructive/30",
};

const FULFILLMENT_STATUSES = ["confirmed", "processing", "packed", "shipped", "delivered", "completed", "cancelled"] as const;

export default function VendorSuborders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [statusDialog, setStatusDialog] = useState<{ vo: VendorOrderWithItems } | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const { data: orders = [], isLoading } = useListMyVendorOrders({
    query: { queryKey: getListMyVendorOrdersQueryKey() },
  });

  const updatePo = useUpdateVendorOrderPoStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyVendorOrdersQueryKey() });
        toast({ title: "PO status updated" });
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
    },
  });

  const updateStatus = useUpdateVendorOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyVendorOrdersQueryKey() });
        toast({ title: "Order status updated" });
        setStatusDialog(null);
        setNewStatus("");
      },
      onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
    },
  });

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Accept or reject POs from buyers and track fulfilment status.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32 skeleton-shimmer" />
                <Skeleton className="h-5 w-20 rounded-full skeleton-shimmer" />
              </div>
              <Skeleton className="h-3 w-48 skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No purchase orders</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            When buyers place orders that include your products, POs will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {(orders as VendorOrderWithItems[]).map((vo) => (
            <Card key={vo.id} className="border-border overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-muted/20 border-b border-border">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <div className="font-mono text-sm font-semibold text-foreground">{vo.poNumber}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(vo.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${PO_STYLES[vo.poStatus] ?? ""}`}>
                      PO: {vo.poStatus}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${STATUS_STYLES[vo.status] ?? ""}`}>
                      {vo.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-primary">${Number(vo.subtotal).toFixed(2)}</span>

                    {vo.poStatus === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => updatePo.mutate({ id: vo.id, data: { poStatus: "accepted" } })}
                          disabled={updatePo.isPending}
                        >
                          <CheckCircle className="h-3 w-3" /> Accept PO
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => updatePo.mutate({ id: vo.id, data: { poStatus: "rejected" } })}
                          disabled={updatePo.isPending}
                        >
                          <XCircle className="h-3 w-3" /> Reject
                        </Button>
                      </>
                    )}

                    {vo.poStatus === "accepted" && vo.status !== "completed" && vo.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => { setStatusDialog({ vo }); setNewStatus(vo.status); }}
                      >
                        <Truck className="h-3 w-3" /> Update Status
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => toggleExpand(vo.id)}
                    >
                      {expanded.has(vo.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Items (collapsible) */}
                {expanded.has(vo.id) && (
                  <div className="divide-y divide-border">
                    {vo.items.map((item: any) => (
                      <div key={item.id} className="px-5 py-3 flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Qty {item.quantity} × ${Number(item.unitPrice).toFixed(2)}
                          </div>
                        </div>
                        <div className="font-semibold">${Number(item.subtotal).toFixed(2)}</div>
                      </div>
                    ))}
                    {vo.trackingNumber && (
                      <div className="px-5 py-2 text-xs text-muted-foreground bg-muted/20">
                        Tracking: <span className="font-mono font-medium text-foreground">{vo.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Status Update Dialog */}
      <Dialog open={!!statusDialog} onOpenChange={(v) => { if (!v) { setStatusDialog(null); setNewStatus(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Fulfillment Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FULFILLMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Cancel</Button>
            <Button
              onClick={() => statusDialog && updateStatus.mutate({ id: statusDialog.vo.id, data: { status: newStatus as any } })}
              disabled={updateStatus.isPending || !newStatus}
            >
              {updateStatus.isPending ? "Saving…" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import {
  useListAdminReturns,
  useUpdateReturnStatus,
  getListAdminReturnsQueryKey,
} from "@workspace/api-client-react";
import type { Return } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, CheckCircle, XCircle, DollarSign, Filter } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  requested:    "bg-amber-500/12 text-amber-600 border-amber-400/30",
  under_review: "bg-sky-500/12 text-sky-600 border-sky-400/30",
  approved:     "bg-primary/12 text-primary border-primary/30",
  rejected:     "bg-destructive/12 text-destructive border-destructive/30",
  refunded:     "bg-violet-500/12 text-violet-600 border-violet-400/30",
};

const TYPE_LABELS: Record<string, string> = {
  damaged:    "Damaged",
  missing:    "Missing",
  wrong_item: "Wrong Item",
  other:      "Other",
};

const ALL_STATUSES = ["all", "requested", "under_review", "approved", "rejected", "refunded"] as const;

export default function AdminReturns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Return & { productName?: string | null; vendorName?: string | null } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const { data: allReturns = [], isLoading } = useListAdminReturns({
    query: { queryKey: getListAdminReturnsQueryKey() },
  });

  const updateStatus = useUpdateReturnStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminReturnsQueryKey() });
        toast({ title: "Return updated" });
        setSelected(null);
        setAdminNote("");
      },
      onError: (err: any) => {
        toast({ title: "Update failed", description: err?.message, variant: "destructive" });
      },
    },
  });

  const filtered = statusFilter === "all"
    ? allReturns
    : allReturns.filter((r) => r.status === statusFilter);

  const handleUpdate = (status: "under_review" | "approved" | "rejected" | "refunded") => {
    if (!selected) return;
    updateStatus.mutate({ id: selected.id, data: { status, adminNote: adminNote || undefined } });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Returns & Disputes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Mediate buyer return and claim requests.</p>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {ALL_STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            className="h-7 text-xs capitalize"
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
            {s !== "all" && (
              <span className="ml-1 text-[10px] opacity-60">
                ({allReturns.filter((r) => r.status === s).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40 skeleton-shimmer" />
                <Skeleton className="h-5 w-24 rounded-full skeleton-shimmer" />
              </div>
              <Skeleton className="h-3 w-56 skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <RotateCcw className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No returns</h2>
          <p className="text-sm text-muted-foreground mt-1.5">No return requests match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {(filtered as (Return & { productName?: string | null; vendorName?: string | null })[]).map((r) => (
            <Card key={r.id} className="border-border hover:border-primary/20 transition-colors cursor-pointer" onClick={() => { setSelected(r); setAdminNote(r.adminNote ?? ""); }}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {r.productName ?? `Item #${r.orderItemId}`}
                      </span>
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[r.type] ?? r.type}</Badge>
                      <Badge variant="outline" className={`text-xs ${STATUS_STYLES[r.status] ?? ""}`}>
                        {r.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Order #{r.orderId} · Vendor: {r.vendorName ?? r.vendorCompanyId}
                    </p>
                    <p className="text-xs text-foreground/70 mt-1 line-clamp-1">{r.reason}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 shrink-0">
                    {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mediation Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) { setSelected(null); setAdminNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return #{selected?.id} — Mediation</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-1">
              <div className="p-3 bg-muted/30 rounded-lg space-y-1 text-sm">
                <p><span className="text-muted-foreground">Product:</span> {selected.productName ?? `Item #${selected.orderItemId}`}</p>
                <p><span className="text-muted-foreground">Order:</span> #{selected.orderId}</p>
                <p><span className="text-muted-foreground">Type:</span> {TYPE_LABELS[selected.type] ?? selected.type}</p>
                <p><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={`text-xs ml-1 ${STATUS_STYLES[selected.status] ?? ""}`}>{selected.status.replace("_", " ")}</Badge></p>
              </div>
              <div className="space-y-1.5">
                <Label>Buyer Reason</Label>
                <p className="text-sm text-foreground/80 p-3 bg-muted/20 rounded-lg">{selected.reason}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Admin Note (visible to buyer)</Label>
                <Textarea
                  placeholder="Add a note for the buyer..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => handleUpdate("under_review")} disabled={updateStatus.isPending}>
              Mark Under Review
            </Button>
            <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => handleUpdate("approved")} disabled={updateStatus.isPending}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
            </Button>
            <Button variant="outline" size="sm" className="border-violet-400/30 text-violet-600 hover:bg-violet-500/10" onClick={() => handleUpdate("refunded")} disabled={updateStatus.isPending}>
              <DollarSign className="h-3.5 w-3.5 mr-1" />Refunded
            </Button>
            <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleUpdate("rejected")} disabled={updateStatus.isPending}>
              <XCircle className="h-3.5 w-3.5 mr-1" />Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

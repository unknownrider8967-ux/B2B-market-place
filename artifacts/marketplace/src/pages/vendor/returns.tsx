import {
  useListVendorReturns,
  useUpdateReturnStatus,
  getListVendorReturnsQueryKey,
} from "@workspace/api-client-react";
import type { Return } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, CheckCircle, XCircle, Clock } from "lucide-react";

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

function Skeleton3() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40 skeleton-shimmer" />
            <Skeleton className="h-5 w-24 rounded-full skeleton-shimmer" />
          </div>
          <Skeleton className="h-3 w-56 skeleton-shimmer" />
          <Skeleton className="h-3 w-72 skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

export default function VendorReturns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: returns = [], isLoading } = useListVendorReturns({
    query: { queryKey: getListVendorReturnsQueryKey() },
  });

  const updateStatus = useUpdateReturnStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorReturnsQueryKey() });
        toast({ title: "Return status updated" });
      },
      onError: (err: any) => {
        toast({ title: "Update failed", description: err?.message, variant: "destructive" });
      },
    },
  });

  const handleStatus = (id: number, status: "under_review" | "approved" | "rejected") => {
    updateStatus.mutate({ id, data: { status } });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Returns & Claims</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Review and action buyer return requests for your orders.</p>
      </div>

      {isLoading ? (
        <Skeleton3 />
      ) : returns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <RotateCcw className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No return requests</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Buyer return and claim requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {(returns as (Return & { productName?: string | null; vendorName?: string | null })[]).map((r) => (
            <Card key={r.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {r.productName ?? `Order Item #${r.orderItemId}`}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[r.type] ?? r.type}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${STATUS_STYLES[r.status] ?? ""}`}>
                        {r.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Order #{r.orderId}</p>
                    <p className="text-sm text-foreground/80 mt-1">{r.reason}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      {new Date(r.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  {r.status === "requested" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleStatus(r.id, "under_review")}
                        disabled={updateStatus.isPending}
                      >
                        <Clock className="h-3 w-3" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => handleStatus(r.id, "approved")}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => handleStatus(r.id, "rejected")}
                        disabled={updateStatus.isPending}
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {r.status === "under_review" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => handleStatus(r.id, "approved")}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => handleStatus(r.id, "rejected")}
                        disabled={updateStatus.isPending}
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

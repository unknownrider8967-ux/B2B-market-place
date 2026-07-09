import {
  useListAdminPayoutRequests,
  useUpdatePayoutRequestStatus,
  getListAdminPayoutRequestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Check, X, Banknote } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/12 text-amber-600 border-amber-400/30",
  approved: "bg-sky-500/12 text-sky-600 border-sky-400/30",
  paid: "bg-primary/12 text-primary border-primary/30",
  rejected: "bg-destructive/12 text-destructive border-destructive/30",
};

export default function AdminPayouts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useListAdminPayoutRequests({
    query: { queryKey: getListAdminPayoutRequestsQueryKey() },
  });

  const updateStatus = useUpdatePayoutRequestStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminPayoutRequestsQueryKey() });
        toast({ title: "Updated", description: "Payout request status updated." });
      },
      onError: () => {
        toast({ title: "Update failed", description: "Could not update payout request.", variant: "destructive" });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <Skeleton className="h-64 rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendor Payouts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{requests.length} payout request{requests.length !== 1 ? "s" : ""}</p>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No payout requests yet</h2>
          <p className="text-muted-foreground mt-2 text-sm">Vendor payout requests will appear here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.vendorName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </TableCell>
                  <TableCell className="font-semibold">${r.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_STYLES[r.status] ?? ""}`}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => updateStatus.mutate({ id: r.id, data: { status: "approved" } })}
                          disabled={updateStatus.isPending}
                        >
                          <Check className="h-3 w-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={() => updateStatus.mutate({ id: r.id, data: { status: "rejected" } })}
                          disabled={updateStatus.isPending}
                        >
                          <X className="h-3 w-3" /> Reject
                        </Button>
                      </div>
                    )}
                    {r.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => updateStatus.mutate({ id: r.id, data: { status: "paid" } })}
                        disabled={updateStatus.isPending}
                      >
                        <Banknote className="h-3 w-3" /> Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

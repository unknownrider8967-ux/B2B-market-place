import { useState } from "react";
import {
  useGetMyWallet,
  useCreatePayoutRequest,
  useListMyPayoutRequests,
  getGetMyWalletQueryKey,
  getListMyPayoutRequestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Wallet as WalletIcon, DollarSign, Clock, Loader2, ArrowUpRight, Receipt } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/12 text-amber-600 border-amber-400/30",
  approved: "bg-sky-500/12 text-sky-600 border-sky-400/30",
  paid: "bg-primary/12 text-primary border-primary/30",
  rejected: "bg-destructive/12 text-destructive border-destructive/30",
};

const TX_LABELS: Record<string, string> = {
  sale: "Sale",
  commission: "Commission",
  payout: "Payout",
  adjustment: "Adjustment",
};

export default function VendorWallet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const { data: wallet, isLoading } = useGetMyWallet({
    query: { queryKey: getGetMyWalletQueryKey() },
  });
  const { data: payoutRequests = [] } = useListMyPayoutRequests({
    query: { queryKey: getListMyPayoutRequestsQueryKey() },
  });

  const createPayout = useCreatePayoutRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyWalletQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMyPayoutRequestsQueryKey() });
        toast({ title: "Payout requested", description: "Your request is pending admin approval." });
        setPayoutOpen(false);
        setAmount("");
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "Could not submit payout request.";
        toast({ title: "Request failed", description: message, variant: "destructive" });
      },
    },
  });

  const handleSubmit = () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount.", variant: "destructive" });
      return;
    }
    createPayout.mutate({ data: { amount: value } });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-36 skeleton-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-28 rounded-xl skeleton-shimmer" />
          <Skeleton className="h-28 rounded-xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Balance, transactions, and payout requests</p>
        </div>
        <Button
          onClick={() => setPayoutOpen(true)}
          disabled={!wallet || wallet.availableBalance <= 0}
          className="gap-1.5"
        >
          <ArrowUpRight className="h-4 w-4" />
          Request Payout
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
        <Card className="stat-card-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
            <div className="p-1.5 rounded-md bg-muted">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${(wallet?.availableBalance ?? 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
          </CardContent>
        </Card>
        <Card className="stat-card-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Balance</CardTitle>
            <div className="p-1.5 rounded-md bg-muted">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${(wallet?.pendingBalance ?? 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payout approval</p>
          </CardContent>
        </Card>
      </div>

      {payoutRequests.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm text-foreground">Payout Requests</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutRequests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </TableCell>
                  <TableCell className="font-medium">${r.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_STYLES[r.status] ?? ""}`}>
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-foreground">Recent Transactions</h2>
        </div>
        {(!wallet || wallet.transactions.length === 0) ? (
          <div className="p-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <WalletIcon className="h-8 w-8 text-muted-foreground/50" />
            No transactions yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wallet.transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{TX_LABELS[t.type] ?? t.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.description ?? "—"}</TableCell>
                  <TableCell className={`text-right font-semibold ${t.amount < 0 ? "text-destructive" : "text-primary"}`}>
                    {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="payout-amount">Amount</Label>
            <Input
              id="payout-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Available balance: ${(wallet?.availableBalance ?? 0).toFixed(2)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createPayout.isPending}>
              {createPayout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

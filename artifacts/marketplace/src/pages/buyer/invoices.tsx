import {
  useListMyInvoices,
  getListMyInvoicesQueryKey,
} from "@workspace/api-client-react";
import type { Invoice } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, AlertCircle } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  unpaid:  "bg-amber-500/12 text-amber-600 border-amber-400/30",
  paid:    "bg-primary/12 text-primary border-primary/30",
  overdue: "bg-destructive/12 text-destructive border-destructive/30",
};

function daysOverdue(dueDate: string | Date) {
  return Math.ceil((Date.now() - new Date(dueDate).getTime()) / 86400000);
}

export default function BuyerInvoices() {
  const { data: invoices = [], isLoading } = useListMyInvoices({
    query: { queryKey: getListMyInvoicesQueryKey() },
  });

  const outstanding = (invoices as Invoice[])
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Credit-term invoices for your orders.
        </p>
      </div>

      {outstanding > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/8 border border-amber-400/30 rounded-xl text-sm">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-700 font-medium">
            Outstanding balance: ${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                {["Invoice #", "Order", "Amount", "Due Date", "Status"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5].map((j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full skeleton-shimmer" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Receipt className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No invoices</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Invoices are generated for orders with Net 15/30/60 credit terms.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices as Invoice[]).map((inv) => {
                const overdue = inv.status === "overdue" ? daysOverdue(inv.dueDate as any) : 0;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-muted-foreground">#{inv.orderId}</TableCell>
                    <TableCell className="font-semibold">
                      ${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(inv.dueDate as any).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      {overdue > 0 && (
                        <span className="ml-1.5 text-xs text-destructive">({overdue}d overdue)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_STYLES[inv.status] ?? ""}`}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

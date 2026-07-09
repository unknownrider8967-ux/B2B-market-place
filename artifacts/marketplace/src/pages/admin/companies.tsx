import { useState } from "react";
import { useListAdminCompanies, useUpdateCompanyStatus } from "@workspace/api-client-react";
import { getListAdminCompaniesQueryKey } from "@workspace/api-client-react";
import type { CompanyStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, X, Ban } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-500/12 text-amber-600 border-amber-400/30",
  approved:  "bg-primary/12 text-primary border-primary/30",
  rejected:  "bg-destructive/12 text-destructive border-destructive/30",
  suspended: "bg-muted text-muted-foreground border-border",
};

const FILTERS: { label: string; value: CompanyStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Suspended", value: "suspended" },
];

function TableSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            {["Company", "Type", "Contact", "Status", "Actions"].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              {[1, 2, 3, 4, 5].map((j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full skeleton-shimmer" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdminCompanies() {
  const [filter, setFilter] = useState<CompanyStatus | "all">("pending");
  const { data: companies = [], isLoading } = useListAdminCompanies(
    filter === "all" ? undefined : { status: filter },
    { query: { queryKey: getListAdminCompaniesQueryKey(filter === "all" ? undefined : { status: filter }) } },
  );
  const updateStatus = useUpdateCompanyStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleUpdate = (id: number, status: CompanyStatus) => {
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: `Company ${status}` });
          queryClient.invalidateQueries({ queryKey: getListAdminCompaniesQueryKey() });
        },
        onError: (err: any) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }),
      },
    );
  };

  const pendingCount = filter === "pending" ? companies.length : undefined;

  return (
    <div className="max-w-6xl mx-auto space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Review and manage buyer and vendor registrations.</p>
        </div>
        {pendingCount !== undefined && pendingCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-400/30 rounded-lg text-xs font-medium text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {pendingCount} awaiting review
          </div>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">No companies</h2>
          <p className="text-sm text-muted-foreground mt-1">No companies match the selected filter.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-sm text-foreground">{c.name}</div>
                    {c.registrationNumber && (
                      <div className="text-xs text-muted-foreground font-mono">{c.registrationNumber}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm capitalize text-foreground">{c.type}</div>
                    <div className="text-xs text-muted-foreground">{c.subtype}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.contactEmail && <div className="text-foreground">{c.contactEmail}</div>}
                    {c.contactPhone && <div className="text-xs text-muted-foreground">{c.contactPhone}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_STYLES[c.status] ?? ""}`}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {c.status !== "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleUpdate(c.id, "approved")}
                          title="Approve"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {c.status !== "rejected" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleUpdate(c.id, "rejected")}
                          title="Reject"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {c.status !== "suspended" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => handleUpdate(c.id, "suspended")}
                          title="Suspend"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
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

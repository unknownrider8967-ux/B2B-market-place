import { useState } from "react";
import { useListAdminCompanies, useUpdateCompanyStatus } from "@workspace/api-client-react";
import { getListAdminCompaniesQueryKey } from "@workspace/api-client-react";
import type { CompanyStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Check, X, Ban } from "lucide-react";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  approved: "bg-primary/15 text-primary border-primary/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  suspended: "bg-muted text-muted-foreground border-border",
};

const FILTERS: { label: string; value: CompanyStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Suspended", value: "suspended" },
];

export default function AdminCompanies() {
  const [filter, setFilter] = useState<CompanyStatus | "all">("all");
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Companies</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"} onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl text-muted-foreground">
          No companies match this filter.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
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
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.registrationNumber || "No registration #"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="capitalize">{c.type}</div>
                    <div className="text-xs text-muted-foreground">{c.subtype}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{c.contactEmail}</div>
                    <div className="text-xs text-muted-foreground">{c.contactPhone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusStyles[c.status] ?? ""}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {c.status !== "approved" && (
                      <Button variant="ghost" size="icon" className="text-primary hover:text-primary" onClick={() => handleUpdate(c.id, "approved")} title="Approve">
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {c.status !== "rejected" && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleUpdate(c.id, "rejected")} title="Reject">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {c.status !== "suspended" && (
                      <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => handleUpdate(c.id, "suspended")} title="Suspend">
                        <Ban className="h-4 w-4" />
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

import { useState } from "react";
import {
  useListMyComplianceCertificates,
  useCreateComplianceCertificate,
  getListMyComplianceCertificatesQueryKey,
} from "@workspace/api-client-react";
import type { ComplianceCertificate } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Plus, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-500/12 text-amber-600 border-amber-400/30",
  approved: "bg-primary/12 text-primary border-primary/30",
  rejected: "bg-destructive/12 text-destructive border-destructive/30",
  expired:  "bg-muted text-muted-foreground border-border",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending:  Clock,
  approved: CheckCircle,
  rejected: XCircle,
  expired:  AlertCircle,
};

const TYPE_LABELS: Record<string, string> = {
  fda: "FDA Certificate",
  ce:  "CE Certificate",
  iso: "ISO Certificate",
  gmp: "GMP Certificate",
};

const RESET = { type: "", certificateNumber: "", fileUrl: "", issueDate: "", expiryDate: "", productId: "" };

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function VendorCompliance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...RESET });

  const { data: certs = [], isLoading } = useListMyComplianceCertificates({
    query: { queryKey: getListMyComplianceCertificatesQueryKey() },
  });

  const create = useCreateComplianceCertificate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyComplianceCertificatesQueryKey() });
        toast({ title: "Certificate submitted", description: "Awaiting admin review." });
        setOpen(false);
        setForm({ ...RESET });
      },
      onError: (err: any) => toast({ title: "Submission failed", description: err?.message, variant: "destructive" }),
    },
  });

  const handleSubmit = () => {
    if (!form.type || !form.certificateNumber || !form.expiryDate) {
      toast({ title: "Missing fields", description: "Type, number, and expiry date are required.", variant: "destructive" });
      return;
    }
    create.mutate({
      data: {
        type: form.type as any,
        certificateNumber: form.certificateNumber,
        fileUrl: form.fileUrl || null,
        issueDate: form.issueDate ? new Date(form.issueDate) : null,
        expiryDate: new Date(form.expiryDate),
        productId: form.productId ? Number(form.productId) : null,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance Certificates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload FDA, CE, ISO, and GMP certificates. Approved certs show as trust badges on your offers.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Certificate
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40 skeleton-shimmer" />
                <Skeleton className="h-5 w-20 rounded-full skeleton-shimmer" />
              </div>
              <Skeleton className="h-3 w-56 skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : certs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <ShieldCheck className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No certificates yet</h2>
          <p className="text-sm text-muted-foreground mt-1.5 mb-5">
            Upload your compliance certificates to build buyer trust.
          </p>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Certificate
          </Button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {(certs as ComplianceCertificate[]).map((cert) => {
            const days = daysUntil(cert.expiryDate as any);
            const StatusIcon = STATUS_ICONS[cert.status] ?? Clock;
            return (
              <Card key={cert.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{TYPE_LABELS[cert.type] ?? cert.type}</span>
                        <Badge variant="outline" className="text-xs font-mono">{cert.certificateNumber}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {cert.issueDate && (
                          <span>Issued: {new Date(cert.issueDate as any).toLocaleDateString()}</span>
                        )}
                        <span className={days !== null && days < 30 ? "text-destructive font-medium" : ""}>
                          Expires: {new Date(cert.expiryDate as any).toLocaleDateString()}
                          {days !== null && days < 30 && days >= 0 && ` · ⚠️ ${days}d left`}
                          {days !== null && days < 0 && " · EXPIRED"}
                        </span>
                        {cert.productId && <span>Product #{cert.productId}</span>}
                      </div>
                      {cert.adminNote && (
                        <p className="text-xs text-muted-foreground italic mt-1">Admin note: {cert.adminNote}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-xs gap-1 ${STATUS_STYLES[cert.status] ?? ""}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cert.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Certificate Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm({ ...RESET }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Compliance Certificate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Certificate Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fda">FDA Certificate</SelectItem>
                  <SelectItem value="ce">CE Certificate</SelectItem>
                  <SelectItem value="iso">ISO Certificate</SelectItem>
                  <SelectItem value="gmp">GMP Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Certificate Number *</Label>
              <Input
                placeholder="e.g. FDA-2024-12345"
                value={form.certificateNumber}
                onChange={(e) => setForm((f) => ({ ...f, certificateNumber: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date *</Label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Certificate File URL <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                type="url"
                placeholder="https://docs.example.com/cert.pdf"
                value={form.fileUrl}
                onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Linked Product ID <span className="text-muted-foreground">(leave blank for company-wide)</span></Label>
              <Input
                type="number"
                placeholder="Product ID (optional)"
                value={form.productId}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending ? "Submitting…" : "Submit for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

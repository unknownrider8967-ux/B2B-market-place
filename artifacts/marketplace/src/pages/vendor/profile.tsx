import { useState, useEffect } from "react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Phone, MapPin, Hash, FileText, Save, Loader2, Shield, CheckCircle } from "lucide-react";

const SUBTYPE_LABELS: Record<string, string> = {
  manufacturer: "Manufacturer",
  authorized_distributor: "Authorized Distributor",
  importer: "Importer",
  wholesaler: "Wholesaler",
  medical_supplier: "Medical Supplier",
};

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Skeleton className="h-8 w-40 skeleton-shimmer" />
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24 skeleton-shimmer" />
            <Skeleton className="h-9 w-full skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VendorProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey() },
  });

  const company = profile?.company as any;

  const [form, setForm] = useState({
    name: "",
    registrationNumber: "",
    taxInfo: "",
    address: "",
    contactPhone: "",
    contactEmail: "",
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? "",
        registrationNumber: company.registrationNumber ?? "",
        taxInfo: company.taxInfo ?? "",
        address: company.address ?? "",
        contactPhone: company.contactPhone ?? "",
        contactEmail: company.contactEmail ?? "",
      });
    }
  }, [company?.id]);

  const handleSave = async () => {
    setSaving(true);
    // Normalize empty optional strings to null so the backend's .email() validator
    // doesn't reject "" — only send fields that are non-empty or intentionally cleared
    const payload = {
      name: form.name || undefined,
      registrationNumber: form.registrationNumber.trim() || null,
      taxInfo: form.taxInfo.trim() || null,
      address: form.address.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
    };
    try {
      const res = await fetch("/api/companies/mine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to update profile");
      }
      await queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      toast({ title: "Profile updated", description: "Your company profile has been saved." });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendor Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your company information shown to buyers.</p>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={
            company?.status === "approved"
              ? "bg-primary/10 text-primary border-primary/30"
              : company?.status === "pending"
              ? "bg-amber-500/10 text-amber-600 border-amber-400/30"
              : "bg-destructive/10 text-destructive border-destructive/30"
          }
        >
          {company?.status === "approved" ? (
            <CheckCircle className="h-3 w-3 mr-1" />
          ) : (
            <Shield className="h-3 w-3 mr-1" />
          )}
          {company?.status ?? "—"}
        </Badge>
        {company?.verifiedBadge && (
          <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-400/30">
            ✅ Verified Supplier
          </Badge>
        )}
        {company?.subtype && (
          <Badge variant="outline" className="text-muted-foreground">
            {SUBTYPE_LABELS[company.subtype] ?? company.subtype}
          </Badge>
        )}
      </div>

      {/* Editable fields */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your company name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg">
                <Hash className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                Registration Number
              </Label>
              <Input
                id="reg"
                value={form.registrationNumber}
                onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                placeholder="e.g. CR-12345"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax">
                <FileText className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                Tax Info / VAT Number
              </Label>
              <Input
                id="tax"
                value={form.taxInfo}
                onChange={(e) => setForm((f) => ({ ...f, taxInfo: e.target.value }))}
                placeholder="e.g. VAT-98765"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">
              <MapPin className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
              Business Address
            </Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Full business address"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                <Phone className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                Contact Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="+1 555 0100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                <Mail className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                Contact Email
              </Label>
              <Input
                id="email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="contact@company.com"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Read-only account info */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">
              {profile?.user?.firstName
                ? `${profile.user.firstName} ${profile.user.lastName ?? ""}`.trim()
                : "—"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{(profile?.user as any)?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium capitalize">{profile?.role ?? "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

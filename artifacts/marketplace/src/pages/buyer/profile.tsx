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
import { Building2, Mail, Phone, MapPin, Save, Loader2, CreditCard } from "lucide-react";

const CREDIT_TERM_LABELS: Record<string, string> = {
  none:  "No Credit Terms",
  net15: "Net 15",
  net30: "Net 30",
  net60: "Net 60",
};

const SUBTYPE_LABELS: Record<string, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  pharmacy: "Pharmacy",
  medical_center: "Medical Center",
  doctor: "Doctor",
  distributor: "Distributor",
  corporate: "Corporate Buyer",
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

export default function BuyerProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey() },
  });

  const company = profile?.company as any;

  const [form, setForm] = useState({
    name: "",
    address: "",
    contactPhone: "",
    contactEmail: "",
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? "",
        address: company.address ?? "",
        contactPhone: company.contactPhone ?? "",
        contactEmail: company.contactEmail ?? "",
      });
    }
  }, [company?.id]);

  const handleSave = async () => {
    setSaving(true);
    // Normalize empty optional strings to null so backend validators don't reject ""
    const payload = {
      name: form.name || undefined,
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
      toast({ title: "Profile updated", description: "Your profile has been saved." });
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
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your organization and contact information.</p>
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {company?.subtype && (
          <Badge variant="outline" className="text-muted-foreground">
            {SUBTYPE_LABELS[company.subtype] ?? company.subtype}
          </Badge>
        )}
        {company?.creditTerm && company.creditTerm !== "none" && (
          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-400/30">
            <CreditCard className="h-3 w-3 mr-1" />
            {CREDIT_TERM_LABELS[company.creditTerm] ?? company.creditTerm}
          </Badge>
        )}
      </div>

      {/* Editable fields */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Organization Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your organization name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">
              <MapPin className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
              Billing / Delivery Address
            </Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Full address"
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
                placeholder="procurement@org.com"
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

      {/* Account info (read-only) */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 text-sm divide-y divide-border/50">
          {[
            {
              label: "Name",
              value: profile?.user?.firstName
                ? `${profile.user.firstName} ${profile.user.lastName ?? ""}`.trim()
                : "—",
            },
            { label: "Email", value: (profile?.user as any)?.email ?? "—" },
            { label: "Role", value: profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "—" },
            ...(company?.creditTerm && company.creditTerm !== "none"
              ? [
                  {
                    label: "Credit Limit",
                    value: company.creditLimit
                      ? `$${Number(company.creditLimit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : "—",
                  },
                  {
                    label: "Outstanding Balance",
                    value: `$${Number(company.outstandingBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  },
                ]
              : []),
          ].map((row) => (
            <div key={row.label} className="flex justify-between py-2">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

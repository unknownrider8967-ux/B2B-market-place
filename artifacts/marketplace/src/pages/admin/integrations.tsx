import { useEffect, useState } from "react";
import {
  useListIntegrationSettings,
  useUpdateIntegrationSetting,
  useDeleteIntegrationSetting,
  getListIntegrationSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, CreditCard, Mail, Trash2, ShieldCheck, KeyRound } from "lucide-react";

type Provider = "stripe" | "paypal" | "smtp";

interface FieldDef {
  key: string;
  label: string;
  secret: boolean;
  placeholder?: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
}

const PROVIDER_DEFS: Record<Provider, { title: string; description: string; icon: React.ElementType; fields: FieldDef[] }> = {
  stripe: {
    title: "Stripe",
    description: "Card payments and checkout.",
    icon: CreditCard,
    fields: [
      { key: "publishableKey", label: "Publishable key", secret: false, placeholder: "pk_live_..." },
      { key: "secretKey", label: "Secret key", secret: true, placeholder: "sk_live_..." },
      { key: "webhookSecret", label: "Webhook signing secret", secret: true, placeholder: "whsec_..." },
    ],
  },
  paypal: {
    title: "PayPal",
    description: "PayPal checkout and payouts.",
    icon: CreditCard,
    fields: [
      {
        key: "mode",
        label: "Mode",
        secret: false,
        type: "select",
        options: [
          { value: "sandbox", label: "Sandbox" },
          { value: "live", label: "Live" },
        ],
      },
      { key: "clientId", label: "Client ID", secret: false, placeholder: "AX..." },
      { key: "clientSecret", label: "Client secret", secret: true, placeholder: "EL..." },
    ],
  },
  smtp: {
    title: "SMTP Email",
    description: "Transactional email delivery (order confirmations, notifications).",
    icon: Mail,
    fields: [
      { key: "host", label: "Host", secret: false, placeholder: "smtp.example.com" },
      { key: "port", label: "Port", secret: false, placeholder: "587" },
      { key: "username", label: "Username", secret: false, placeholder: "apikey" },
      { key: "password", label: "Password", secret: true, placeholder: "••••••••" },
      { key: "fromEmail", label: "From address", secret: false, placeholder: "orders@yourcompany.com" },
    ],
  },
};

const PROVIDERS: Provider[] = ["stripe", "paypal", "smtp"];

function ProviderCard({
  provider,
  setting,
  onSaved,
}: {
  provider: Provider;
  setting: { enabled: boolean; configured: boolean; fields: Record<string, string>; updatedAt: string | null } | undefined;
  onSaved: () => void;
}) {
  const def = PROVIDER_DEFS[provider];
  const Icon = def.icon;
  const { toast } = useToast();
  const updateMutation = useUpdateIntegrationSetting();
  const deleteMutation = useDeleteIntegrationSetting();

  const [enabled, setEnabled] = useState(setting?.enabled ?? false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setEnabled(setting?.enabled ?? false);
  }, [setting?.enabled]);

  const handleChange = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const handleSave = () => {
    updateMutation.mutate(
      { provider, data: { enabled, fields: values } },
      {
        onSuccess: () => {
          toast({ title: `${def.title} settings saved` });
          setValues({});
          onSaved();
        },
        onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed to save", variant: "destructive" }),
      },
    );
  };

  const handleClear = () => {
    deleteMutation.mutate(
      { provider },
      {
        onSuccess: () => {
          toast({ title: `${def.title} configuration removed` });
          setConfirmClear(false);
          setValues({});
          onSaved();
        },
        onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed to remove", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{def.title}</h3>
              {setting?.configured ? (
                <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
                  <ShieldCheck className="h-3 w-3" /> Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Not configured</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label className="text-xs text-muted-foreground">Enabled</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {def.fields.map((field) => {
          const existingMasked = setting?.fields?.[field.key];
          if (field.type === "select") {
            const current = values[field.key] ?? existingMasked ?? field.options?.[0]?.value ?? "";
            return (
              <div key={field.key}>
                <Label className="text-xs">{field.label}</Label>
                <Select value={current} onValueChange={(v) => handleChange(field.key, v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }
          return (
            <div key={field.key}>
              <Label className="text-xs flex items-center gap-1">
                {field.secret && <KeyRound className="h-3 w-3 text-muted-foreground" />}
                {field.label}
              </Label>
              <Input
                type={field.secret ? "password" : "text"}
                className="mt-1 font-mono text-sm"
                placeholder={existingMasked || field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
              />
              {existingMasked && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Current: <span className="font-mono">{existingMasked}</span> — leave blank to keep it.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <div>
          {setting?.updatedAt && (
            <p className="text-[11px] text-muted-foreground">
              Last updated {new Date(setting.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {setting?.configured && (
            confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Remove config?</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={handleClear} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Confirm
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmClear(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
              </Button>
            )
          )}
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminIntegrations() {
  const { data: settings, isLoading } = useListIntegrationSettings();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListIntegrationSettingsQueryKey() });

  const byProvider = new Map((settings ?? []).map((s) => [s.provider, s]));

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage payment gateway and third-party service credentials. Secret keys are encrypted at rest and never
          displayed in full after saving.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider}
              provider={provider}
              setting={byProvider.get(provider) as any}
              onSaved={invalidate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

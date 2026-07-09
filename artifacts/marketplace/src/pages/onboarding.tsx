import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetMyProfile, useOnboardMyProfile } from "@workspace/api-client-react";
import { getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Activity, Building2, ShoppingBag, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const onboardSchema = z.object({
  role: z.enum(["buyer", "vendor"]),
  company: z.object({
    name: z.string().min(1, "Company name is required"),
    type: z.enum(["buyer", "vendor"]),
    subtype: z.string().min(1, "Organization type is required"),
    registrationNumber: z.string().optional(),
    taxInfo: z.string().optional(),
    address: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  }),
});

type OnboardForm = z.infer<typeof onboardSchema>;

export default function Onboarding() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: {
      enabled: isAuthenticated,
      queryKey: getGetMyProfileQueryKey(),
      retry: false,
    },
  });

  const onboard = useOnboardMyProfile();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/");
    else if (profile?.companyId) {
      if (profile.role === "admin") setLocation("/admin");
      else if (profile.role === "vendor") setLocation("/vendor");
      else setLocation("/browse");
    }
  }, [isAuthenticated, authLoading, profile, setLocation]);

  const form = useForm<OnboardForm>({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      role: "buyer",
      company: { name: "", type: "buyer", subtype: "", registrationNumber: "", taxInfo: "", address: "", contactPhone: "", contactEmail: "" },
    },
  });

  const watchRole = form.watch("role");
  useEffect(() => { form.setValue("company.type", watchRole); }, [watchRole, form]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const onSubmit = (data: OnboardForm) => {
    onboard.mutate(
      { data },
      {
        onSuccess: (res) => {
          toast({ title: "Welcome to MedSupply Exchange", description: "Your profile has been created." });
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
          if (res.role === "vendor") setLocation("/vendor");
          else setLocation("/browse");
        },
        onError: (err: any) =>
          toast({ title: "Error", description: err?.message || "Failed to complete registration", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-2/5 bg-sidebar flex-col justify-between p-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Activity className="h-4.5 w-4.5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-sidebar-foreground">MedSupplyExchange</span>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-sidebar-foreground leading-snug">
              Your gateway to verified medical supply procurement.
            </h2>
            <p className="text-sidebar-foreground/60 mt-3 text-sm leading-relaxed">
              Set up your company profile to access the full marketplace — browse 12,000+ SKUs, compare vendor pricing, and submit RFQs.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: ShoppingBag, text: "Compare tiered pricing across verified vendors" },
              { icon: Building2, text: "Manage multi-vendor orders in one place" },
              { icon: ArrowRight, text: "Accounts reviewed and approved within 24 hours" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-sidebar-accent flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-sidebar-accent-foreground" />
                </div>
                <span className="text-sm text-sidebar-foreground/70">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} MedSupply Exchange
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base">MedSupplyExchange</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Complete your profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your company to access the marketplace.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Role */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">I am joining as…</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["buyer", "vendor"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => form.setValue("role", r)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      watchRole === r
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="font-semibold text-sm capitalize text-foreground">{r}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r === "buyer" ? "Hospital, clinic, pharmacy" : "Manufacturer, distributor"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Company details */}
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pb-1 border-b border-border">
                Company Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Company Name <span className="text-destructive">*</span></Label>
                  <Input {...form.register("company.name")} placeholder="Your company name" />
                  {form.formState.errors.company?.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.company.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Organization Type <span className="text-destructive">*</span></Label>
                  <Input
                    {...form.register("company.subtype")}
                    placeholder={watchRole === "buyer" ? "e.g. Private Hospital" : "e.g. Distributor"}
                  />
                  {form.formState.errors.company?.subtype && (
                    <p className="text-xs text-destructive">{form.formState.errors.company.subtype.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Registration Number</Label>
                  <Input {...form.register("company.registrationNumber")} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tax ID / VAT</Label>
                  <Input {...form.register("company.taxInfo")} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Contact Email</Label>
                  <Input type="email" {...form.register("company.contactEmail")} />
                  {form.formState.errors.company?.contactEmail && (
                    <p className="text-xs text-destructive">{form.formState.errors.company.contactEmail.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Address</Label>
                  <Input {...form.register("company.address")} />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-10 btn-press" disabled={onboard.isPending}>
              {onboard.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Setting up…</>
                : <>Complete Registration <ArrowRight className="h-4 w-4" /></>}
            </Button>

            {watchRole === "vendor" && (
              <p className="text-xs text-muted-foreground text-center">
                Vendor accounts require admin approval before you can start selling. We typically review within 24 hours.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

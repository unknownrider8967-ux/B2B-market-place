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
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const onboardSchema = z.object({
  role: z.enum(["buyer", "vendor"]),
  company: z.object({
    name: z.string().min(1, "Company name is required"),
    type: z.enum(["buyer", "vendor"]),
    subtype: z.string().min(1, "Company type is required"),
    registrationNumber: z.string().optional(),
    taxInfo: z.string().optional(),
    address: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email("Invalid email").optional().or(z.literal('')),
  })
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
      retry: false
    }
  });

  const onboard = useOnboardMyProfile();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    } else if (profile?.companyId) {
      // Already onboarded
      if (profile.role === 'admin') setLocation("/admin");
      else if (profile.role === 'vendor') setLocation("/vendor");
      else setLocation("/browse");
    }
  }, [isAuthenticated, authLoading, profile, setLocation]);

  const form = useForm<OnboardForm>({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      role: "buyer",
      company: {
        name: "",
        type: "buyer",
        subtype: "",
        registrationNumber: "",
        taxInfo: "",
        address: "",
        contactPhone: "",
        contactEmail: ""
      }
    }
  });

  const watchRole = form.watch("role");
  
  useEffect(() => {
    form.setValue("company.type", watchRole);
  }, [watchRole, form]);

  if (authLoading || profileLoading) {
    return <div className="min-h-screen flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const onSubmit = (data: OnboardForm) => {
    onboard.mutate({ data }, {
      onSuccess: (res) => {
        toast({ title: "Welcome to MedSupply", description: "Your profile has been created." });
        queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        if (res.role === 'vendor') setLocation("/vendor");
        else setLocation("/browse");
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message || "Failed to onboard", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-card text-card-foreground p-8 rounded-lg shadow-sm border border-card-border">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-2">Set up your company to access the marketplace.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>I am a...</Label>
            <Select 
              value={form.watch("role")} 
              onValueChange={(val: "buyer" | "vendor") => form.setValue("role", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Buyer (Hospital, Clinic, Pharmacy)</SelectItem>
                <SelectItem value="vendor">Vendor (Manufacturer, Distributor)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Company Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name <span className="text-destructive">*</span></Label>
                <Input {...form.register("company.name")} />
                {form.formState.errors.company?.name && <p className="text-xs text-destructive">{form.formState.errors.company.name.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Organization Type <span className="text-destructive">*</span></Label>
                <Input {...form.register("company.subtype")} placeholder={watchRole === 'buyer' ? "e.g. Private Hospital" : "e.g. Distributor"} />
                {form.formState.errors.company?.subtype && <p className="text-xs text-destructive">{form.formState.errors.company.subtype.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Registration Number</Label>
                <Input {...form.register("company.registrationNumber")} />
              </div>

              <div className="space-y-2">
                <Label>Tax ID / VAT</Label>
                <Input {...form.register("company.taxInfo")} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Input {...form.register("company.address")} />
              </div>

              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" {...form.register("company.contactEmail")} />
                {form.formState.errors.company?.contactEmail && <p className="text-xs text-destructive">{form.formState.errors.company.contactEmail.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input {...form.register("company.contactPhone")} />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={onboard.isPending}>
            {onboard.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Complete Registration
          </Button>
          
          {watchRole === 'vendor' && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Note: Vendor accounts require admin approval before you can start selling.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

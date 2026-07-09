import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Activity, ShoppingBag, Building2, ArrowRight, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLoginWithPassword,
  useRegisterWithPassword,
  getGetCurrentAuthUserQueryKey,
} from "@workspace/api-client-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"login" | "register">("login");

  const login = useLoginWithPassword();
  const register = useRegisterWithPassword();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", firstName: "", lastName: "" },
  });

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getGetCurrentAuthUserQueryKey() });
    setLocation("/onboarding");
  };

  const onLogin = (data: LoginForm) => {
    login.mutate(
      { data },
      {
        onSuccess,
        onError: (err: any) =>
          toast({
            title: "Login failed",
            description: err?.data?.error || err?.message || "Invalid email or password.",
            variant: "destructive",
          }),
      },
    );
  };

  const onRegister = (data: RegisterForm) => {
    register.mutate(
      { data },
      {
        onSuccess,
        onError: (err: any) =>
          toast({
            title: "Registration failed",
            description: err?.data?.error || err?.message || "Could not create your account.",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="min-h-screen bg-background flex page-enter">
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
              Sign in to your procurement workspace.
            </h2>
            <p className="text-sidebar-foreground/60 mt-3 text-sm leading-relaxed">
              Browse verified vendors, compare tiered pricing, and manage orders across your organization.
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
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base">MedSupplyExchange</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Welcome</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in or create an account to access the marketplace.
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" autoComplete="email" {...loginForm.register("email")} />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full btn-press" disabled={login.isPending}>
                  {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-first">First name</Label>
                    <Input id="reg-first" {...registerForm.register("firstName")} />
                    {registerForm.formState.errors.firstName && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-last">Last name</Label>
                    <Input id="reg-last" {...registerForm.register("lastName")} />
                    {registerForm.formState.errors.lastName && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" autoComplete="email" {...registerForm.register("email")} />
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full btn-press" disabled={register.isPending}>
                  {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { useGetMyProfile } from "@workspace/api-client-react";
import { getGetMyProfileQueryKey } from "@workspace/api-client-react";

export function useAuthGuard(allowedRoles?: string[]) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { 
    data: profile, 
    isLoading: profileLoading, 
    isError 
  } = useGetMyProfile({
    query: {
      enabled: isAuthenticated,
      queryKey: getGetMyProfileQueryKey(),
      retry: false
    }
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
      return;
    }

    if (isAuthenticated && !profileLoading) {
      // If error (404 typically means no profile), redirect to onboarding
      if (isError || !profile) {
        setLocation("/onboarding");
        return;
      }
      
      // If profile exists but no company, they need to finish onboarding
      if (!profile.companyId) {
        setLocation("/onboarding");
        return;
      }

      if (allowedRoles && !allowedRoles.includes(profile.role)) {
        // Redirect to appropriate home based on role
        if (profile.role === 'admin') setLocation("/admin");
        else if (profile.role === 'vendor') setLocation("/vendor");
        else setLocation("/browse");
      }
    }
  }, [isAuthenticated, authLoading, profile, profileLoading, isError, allowedRoles, setLocation]);

  return { profile, isLoading: authLoading || profileLoading };
}

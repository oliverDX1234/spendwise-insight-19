import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useOnboarding() {
  const { user } = useAuth();

  const { data: needsOnboarding = false, isLoading } = useQuery({
    queryKey: ["onboarding", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("users")
        .select("onboarding_completed, subscription_plan")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If user doesn't exist in profiles table yet, they need onboarding
        if (error.code === 'PGRST116') return true;  
        throw error;
      }
      
      // User needs onboarding if they haven't completed it yet
      return !data?.onboarding_completed;
    },
    enabled: !!user?.id,
  });

  return {
    needsOnboarding,
    isLoading,
  };
}
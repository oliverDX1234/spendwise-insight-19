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
        .select("subscription_plan")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      // User needs onboarding if they don't have a subscription plan set yet
      // (subscription_plan is null or empty for new users)
      return !data?.subscription_plan;
    },
    enabled: !!user?.id,
  });

  return {
    needsOnboarding,
    isLoading,
  };
}
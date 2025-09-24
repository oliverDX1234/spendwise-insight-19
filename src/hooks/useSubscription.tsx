import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("users")
        .select("subscription_plan, subscription_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isPremium = subscription?.subscription_plan === "premium";
  const isTrial = !subscription?.subscription_plan || subscription?.subscription_plan === "trial";
  
  return {
    subscription,
    isPremium,
    isTrial,
    isLoading,
  };
}
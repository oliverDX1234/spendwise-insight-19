import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface Card {
  id: string;
  user_id: string;
  card_number: string;
  card_holder_name: string;
  expiry_month: number;
  expiry_year: number;
  cvc: string;
  card_type?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCardData {
  card_number: string;
  card_holder_name: string;
  expiry_month: number;
  expiry_year: number;
  cvc: string;
  card_type?: string;
  is_default?: boolean;
}

export function useCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: cards = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["cards", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Card[];
    },
    enabled: !!user?.id,
  });

  const createCard = useMutation({
    mutationFn: async (cardData: CreateCardData) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Format card number to remove spaces
      const formattedCardNumber = cardData.card_number.replace(/\s/g, '');
      
      // Detect card type based on card number
      const cardType = detectCardType(formattedCardNumber);

      const { data, error } = await supabase
        .from("cards")
        .insert({
          ...cardData,
          card_number: formattedCardNumber,
          card_type: cardType,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", user?.id] });
      toast({
        title: "Card added successfully",
        description: "Your payment card has been added to your account.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add card",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", user?.id] });
      toast({
        title: "Card deleted",
        description: "Your payment card has been removed from your account.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete card",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    cards,
    isLoading,
    error,
    createCard,
    deleteCard,
  };
}

// Helper function to detect card type
function detectCardType(cardNumber: string): string {
  const number = cardNumber.replace(/\D/g, '');
  
  if (/^4/.test(number)) return 'Visa';
  if (/^5[1-5]/.test(number)) return 'Mastercard';
  if (/^3[47]/.test(number)) return 'American Express';
  if (/^6/.test(number)) return 'Discover';
  
  return 'Unknown';
}

// Helper function to format card number for display
export function formatCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

// Helper function to mask card number
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  const last4 = cleaned.slice(-4);
  return `**** **** **** ${last4}`;
}
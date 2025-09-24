import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Limit {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  amount: number;
  period_type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

interface CreateLimitData {
  category_id: string;
  name: string;
  amount: number;
  period_type: 'weekly' | 'monthly';
  start_date?: string;
}

export const useLimits = () => {
  const [limits, setLimits] = useState<Limit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchLimits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('limits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching limits:', error);
        setError(error.message);
        toast({
          title: "Error",
          description: "Failed to fetch limits. Please try again.",
          variant: "destructive",
        });
      } else {
        setLimits((data || []) as Limit[]);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching limits:', error);
      setError('An unexpected error occurred');
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching limits.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createLimit = async (limitData: CreateLimitData): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('limits')
        .insert({
          user_id: user.id,
          category_id: limitData.category_id,
          name: limitData.name,
          amount: limitData.amount,
          period_type: limitData.period_type,
          start_date: limitData.start_date || new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0], // Will be overridden by trigger
        } as any);

      if (error) {
        console.error('Error creating limit:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Spending limit created successfully!",
      });

      fetchLimits();
    } catch (error) {
      console.error('Error creating limit:', error);
      toast({
        title: "Error", 
        description: "Failed to create spending limit. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateLimit = async (limitId: string, limitData: Partial<CreateLimitData>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('limits')
        .update(limitData)
        .eq('id', limitId);

      if (error) {
        console.error('Error updating limit:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Spending limit updated successfully!",
      });

      fetchLimits();
    } catch (error) {
      console.error('Error updating limit:', error);
      toast({
        title: "Error",
        description: "Failed to update spending limit. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteLimit = async (limitId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('limits')
        .delete()
        .eq('id', limitId);

      if (error) {
        console.error('Error deleting limit:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Spending limit deleted successfully!",
      });

      fetchLimits();
    } catch (error) {
      console.error('Error deleting limit:', error);
      toast({
        title: "Error",
        description: "Failed to delete spending limit. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchLimits();
    }
  }, [user]);

  return {
    limits,
    loading,
    error,
    createLimit,
    updateLimit,
    deleteLimit,
    refetch: fetchLimits
  };
};
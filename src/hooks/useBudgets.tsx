import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Budget {
  id: string;
  category_id: string;
  amount: number;
  period_type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  user_id: string;
  category?: {
    name: string;
    color: string;
  };
  spent_amount?: number;
  remaining_amount?: number;
}

export interface CreateBudgetData {
  category_id: string;
  amount: number;
  period_type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          *,
          categories:category_id (name, color)
        `)
        .order('created_at', { ascending: false });

      if (budgetsError) throw budgetsError;

      // Calculate spent amounts for each budget
      const budgetsWithSpending = await Promise.all(
        (budgetsData || []).map(async (budget: any) => {
          const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('category_id', budget.category_id)
            .gte('expense_date', budget.start_date)
            .lte('expense_date', budget.end_date);

          const spent_amount = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
          const remaining_amount = Number(budget.amount) - spent_amount;

          return {
            ...budget,
            category: budget.categories,
            spent_amount,
            remaining_amount
          };
        })
      );

      setBudgets(budgetsWithSpending);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch budgets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async (budgetData: CreateBudgetData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('budgets')
        .insert({
          user_id: user.id,
          ...budgetData
        })
        .select()
        .single();

      if (error) throw error;

      await fetchBudgets();
      toast({
        title: "Success",
        description: "Budget created successfully"
      });

      return data;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateBudget = async (budgetId: string, updates: Partial<CreateBudgetData>) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', budgetId);

      if (error) throw error;

      await fetchBudgets();
      toast({
        title: "Success",
        description: "Budget updated successfully"
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const deleteBudget = async (budgetId: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;

      await fetchBudgets();
      toast({
        title: "Success",
        description: "Budget deleted successfully"
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const getCurrentMonthBudget = (categoryId: string): Budget | undefined => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return budgets.find(budget => {
      const startDate = new Date(budget.start_date);
      return budget.category_id === categoryId && 
             budget.period_type === 'monthly' &&
             startDate.getMonth() === currentMonth &&
             startDate.getFullYear() === currentYear;
    });
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  return {
    budgets,
    loading,
    error,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    getCurrentMonthBudget
  };
}
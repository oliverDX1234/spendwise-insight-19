import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  name: string;
  quantity: number;
  price_per_unit: number;
}

export interface Expense {
  id: string;
  amount: number;
  category_id: string;
  category?: {
    name: string;
    color: string;
  };
  description: string | null;
  expense_date: string;
  is_recurring: boolean;
  recurring_interval: string | null;
  products: Product[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  amount: number;
  category_id: string;
  description?: string;
  expense_date: string;
  is_recurring?: boolean;
  recurring_interval?: string;
  products?: Array<{
    product_id?: string;
    name: string;
    quantity: number;
    price_per_unit: number;
  }>;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          categories:category_id (name, color),
          expense_products (
            id,
            quantity,
            price_per_unit,
            products:product_id (id, name)
          )
        `)
        .order('expense_date', { ascending: false });

      if (expensesError) throw expensesError;

      const formattedExpenses: Expense[] = expensesData?.map(expense => ({
        ...expense,
        category: expense.categories,
        products: expense.expense_products?.map(ep => ({
          id: ep.products?.id || '',
          name: ep.products?.name || '',
          quantity: ep.quantity,
          price_per_unit: ep.price_per_unit
        })) || []
      })) || [];

      setExpenses(formattedExpenses);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createExpense = async (expenseData: CreateExpenseData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create the expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          amount: expenseData.amount,
          category_id: expenseData.category_id,
          description: expenseData.description,
          expense_date: expenseData.expense_date,
          is_recurring: expenseData.is_recurring || false,
          recurring_interval: expenseData.recurring_interval
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create products if provided
      if (expenseData.products && expenseData.products.length > 0) {
        for (const product of expenseData.products) {
          let productId = product.product_id;

          // Create product if it doesn't exist
          if (!productId) {
            const { data: newProduct, error: productError } = await supabase
              .from('products')
              .insert({
                user_id: user.id,
                category_id: expenseData.category_id,
                name: product.name,
                default_price: product.price_per_unit
              })
              .select()
              .single();

            if (productError) throw productError;
            productId = newProduct.id;
          }

          // Create expense_product relationship
          const { error: epError } = await supabase
            .from('expense_products')
            .insert({
              expense_id: expense.id,
              product_id: productId,
              quantity: product.quantity,
              price_per_unit: product.price_per_unit
            });

          if (epError) throw epError;
        }
      }

      await fetchExpenses();
      toast({
        title: "Success",
        description: "Expense created successfully"
      });

      return expense;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      await fetchExpenses();
      toast({
        title: "Success",
        description: "Expense deleted successfully"
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

  const getExpensesByPeriod = (period: 'day' | 'week' | 'month' | 'year', date?: Date) => {
    const targetDate = date || new Date();
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      
      switch (period) {
        case 'day':
          return expenseDate.toDateString() === targetDate.toDateString();
        case 'week':
          const weekStart = new Date(targetDate);
          weekStart.setDate(targetDate.getDate() - targetDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return expenseDate >= weekStart && expenseDate <= weekEnd;
        case 'month':
          return expenseDate.getMonth() === targetDate.getMonth() && 
                 expenseDate.getFullYear() === targetDate.getFullYear();
        case 'year':
          return expenseDate.getFullYear() === targetDate.getFullYear();
        default:
          return false;
      }
    });
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return {
    expenses,
    loading,
    error,
    fetchExpenses,
    createExpense,
    deleteExpense,
    getExpensesByPeriod
  };
}
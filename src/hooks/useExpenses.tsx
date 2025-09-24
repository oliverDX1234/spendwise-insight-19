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
          recurring_interval: expenseData.recurring_interval,
          next_occurrence: expenseData.is_recurring ? calculateNextOccurrence(expenseData.expense_date, expenseData.recurring_interval) : null
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create products if provided
      if (expenseData.products && expenseData.products.length > 0) {
        for (const product of expenseData.products) {
          let productId = product.product_id;

          // Check if product exists first, then create if it doesn't
          if (!productId) {
            // Try to find existing product
            const { data: existingProduct } = await supabase
              .from('products')
              .select('id')
              .eq('name', product.name)
              .eq('category_id', expenseData.category_id)
              .eq('user_id', user.id)
              .maybeSingle();

            if (existingProduct) {
              productId = existingProduct.id;
            } else {
              // Create new product only if it doesn't exist
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

      // Check for spending limits after creating expense
      try {
        console.log('Checking limits for user:', user.id, 'category:', expenseData.category_id);
        const response = await supabase.functions.invoke('check-limits', {
          body: {
            user_id: user.id,
            category_id: expenseData.category_id
          }
        });
        console.log('Limit check response:', response);
        
        // Show toast notifications for exceeded limits with delay
        if (response.data?.limitExceeded && response.data?.notifications) {
          // Add a small delay to let the success toast appear first
          setTimeout(() => {
            for (const notification of response.data.notifications) {
              toast({
                title: "🚨 Spending Limit Exceeded!",
                description: `You've exceeded your "${notification.limitName}" limit for ${notification.categoryName}. Spent $${notification.totalSpent} out of $${notification.limitAmount} (${notification.percentage}%)`,
                variant: "destructive",
                duration: 8000, // Show longer for important alerts
              });
            }
          }, 1000);
        }
      } catch (limitError) {
        // Don't fail expense creation if limit check fails
        console.error('Error checking limits:', limitError);
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

  const updateExpense = async (expenseId: string, expenseData: any) => {
    try {
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          amount: expenseData.amount,
          category_id: expenseData.category_id,
          expense_date: expenseData.expense_date,
          description: expenseData.description,
          is_recurring: expenseData.is_recurring || false,
          recurring_interval: expenseData.recurring_interval,
          next_occurrence: expenseData.is_recurring ? calculateNextOccurrence(expenseData.expense_date, expenseData.recurring_interval) : null
        })
        .eq('id', expenseId);

      if (expenseError) throw expenseError;

      // Handle products if provided
      if (expenseData.products && expenseData.products.length > 0) {
        // Delete existing expense_products
        const { error: deleteError } = await supabase
          .from('expense_products')
          .delete()
          .eq('expense_id', expenseId);

        if (deleteError) throw deleteError;

        // Create new products and expense_products
        for (const productData of expenseData.products) {
          // Check if product exists
          let { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('name', productData.name)
            .eq('category_id', expenseData.category_id)
            .single();

          let productId = existingProduct?.id;

          // Create product if it doesn't exist
          if (!existingProduct) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data: newProduct, error: productError } = await supabase
              .from('products')
              .insert({
                name: productData.name,
                category_id: expenseData.category_id,
                user_id: user.id,
                default_price: productData.price_per_unit
              })
              .select('id')
              .single();

            if (productError) throw productError;
            productId = newProduct.id;
          }

          // Create expense_product relationship
          const { error: expenseProductError } = await supabase
            .from('expense_products')
            .insert({
              expense_id: expenseId,
              product_id: productId,
              quantity: productData.quantity,
              price_per_unit: productData.price_per_unit
            });

          if (expenseProductError) throw expenseProductError;
        }
      }

      await fetchExpenses();
      toast({
        title: "Success",
        description: "Expense updated successfully"
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
    updateExpense,
    deleteExpense,
    getExpensesByPeriod
  };
}

// Helper function to calculate next occurrence
function calculateNextOccurrence(currentDate: string, interval: string | null | undefined): string {
  const date = new Date(currentDate);
  
  switch (interval) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      // Default to monthly if interval is not recognized
      date.setMonth(date.getMonth() + 1);
  }
  
  return date.toISOString().split('T')[0];
}
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export function useExpensesAnalytics() {
  const { user } = useAuth();
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  return useQuery({
    queryKey: ["expenses-analytics", user?.id, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get all expenses for current month
      const { data: expenses, error } = await supabase
        .from("expenses")
        .select(
          `
          *,
          categories (name, color)
        `
        )
        .eq("user_id", user.id)
        .gte("expense_date", format(monthStart, "yyyy-MM-dd"))
        .lte("expense_date", format(monthEnd, "yyyy-MM-dd"))
        .order("expense_date", { ascending: true });

      if (error) throw error;

      // Daily expenses
      const dailyExpenses = eachDayOfInterval({
        start: monthStart,
        end: monthEnd,
      }).map((day) => {
        const dayString = format(day, "yyyy-MM-dd");
        const dayExpenses =
          expenses?.filter((exp) => exp.expense_date === dayString) || [];
        const total = dayExpenses.reduce(
          (sum, exp) => sum + Number(exp.amount),
          0
        );
        return {
          date: format(day, "MMM dd"),
          amount: total,
        };
      });

      // Recurring vs One-time
      const recurringTotal =
        expenses
          ?.filter((exp) => exp.is_recurring)
          .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      const oneTimeTotal =
        expenses
          ?.filter((exp) => !exp.is_recurring)
          .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      // By categories
      const categoryMap = new Map();
      expenses?.forEach((exp) => {
        const categoryName = exp.categories?.name || "Uncategorized";
        const categoryColor = exp.categories?.color || "#6B7280";
        const current = categoryMap.get(categoryName) || {
          amount: 0,
          color: categoryColor,
        };
        categoryMap.set(categoryName, {
          amount: current.amount + Number(exp.amount),
          color: categoryColor,
        });
      });

      const expensesByCategory = Array.from(categoryMap.entries()).map(
        ([name, data]) => ({
          name,
          amount: data.amount,
          fill: data.color,
        })
      );

      // Top 10 expenses
      const topExpenses =
        expenses
          ?.sort((a, b) => Number(b.amount) - Number(a.amount))
          .slice(0, 10)
          .map((exp) => ({
            description: exp.description || "No description",
            amount: Number(exp.amount),
            category: exp.categories?.name || "Uncategorized",
          })) || [];

      return {
        dailyExpenses,
        recurringVsOneTime: [
          { name: "Recurring", amount: recurringTotal, fill: "#8B5CF6" },
          { name: "One-time", amount: oneTimeTotal, fill: "#06B6D4" },
        ],
        expensesByCategory,
        topExpenses,
        totalExpenses: expenses?.length || 0,
        totalAmount:
          expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0,
      };
    },
    enabled: !!user?.id,
  });
}

export function useCategoriesAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["categories-analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get all categories with expense count and total amount (both user and predefined)
      const { data: categories, error } = await supabase
        .from("categories")
        .select(
          `
          *,
          expenses!inner (amount, expense_date, user_id)
        `
        )
        .or(`user_id.eq.${user.id},is_predefined.eq.true`)
        .eq("expenses.user_id", user.id);

      if (error) throw error;

      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const categoryStats =
        categories?.map((category) => {
          const allExpenses = category.expenses || [];
          const monthlyExpenses = allExpenses.filter((exp) => {
            const expDate = new Date(exp.expense_date);
            return expDate >= monthStart && expDate <= monthEnd;
          });

          return {
            name: category.name,
            color: category.color,
            totalExpenses: allExpenses.length,
            monthlyExpenses: monthlyExpenses.length,
            totalAmount: allExpenses.reduce(
              (sum, exp) => sum + Number(exp.amount),
              0
            ),
            monthlyAmount: monthlyExpenses.reduce(
              (sum, exp) => sum + Number(exp.amount),
              0
            ),
          };
        }) || [];

      // Most used categories (by expense count)
      const mostUsedCategories = categoryStats
        .sort((a, b) => b.totalExpenses - a.totalExpenses)
        .slice(0, 10)
        .map((cat) => ({
          name: cat.name,
          count: cat.totalExpenses,
          fill: cat.color,
        }));

      // Highest spending categories
      const highestSpendingCategories = categoryStats
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10)
        .map((cat) => ({
          name: cat.name,
          amount: cat.totalAmount,
          fill: cat.color,
        }));

      // Monthly vs All time comparison
      const monthlyVsAllTime = categoryStats.map((cat) => ({
        name: cat.name,
        monthly: cat.monthlyAmount,
        allTime: cat.totalAmount,
        fill: cat.color,
      }));

      return {
        mostUsedCategories,
        highestSpendingCategories,
        monthlyVsAllTime,
        categoryStats,
        totalCategories: categories?.length || 0,
      };
    },
    enabled: !!user?.id,
  });
}

export function useProductsAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["products-analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get all products with expense data
      const { data: products, error } = await supabase
        .from("products")
        .select(
          `
          *,
          expense_products (
            quantity,
            price_per_unit,
            expenses (expense_date, categories (name, color))
          )
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;

      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const productStats =
        products?.map((product) => {
          const allExpenseProducts = product.expense_products || [];
          const monthlyExpenseProducts = allExpenseProducts.filter((ep) => {
            const expDate = new Date(ep.expenses?.expense_date);
            return expDate >= monthStart && expDate <= monthEnd;
          });

          const totalQuantity = allExpenseProducts.reduce(
            (sum, ep) => sum + ep.quantity,
            0
          );
          const monthlyQuantity = monthlyExpenseProducts.reduce(
            (sum, ep) => sum + ep.quantity,
            0
          );
          const totalSpent = allExpenseProducts.reduce(
            (sum, ep) => sum + ep.quantity * Number(ep.price_per_unit),
            0
          );
          const monthlySpent = monthlyExpenseProducts.reduce(
            (sum, ep) => sum + ep.quantity * Number(ep.price_per_unit),
            0
          );

          return {
            name: product.name,
            defaultPrice: Number(product.default_price || 0),
            totalQuantity,
            monthlyQuantity,
            totalSpent,
            monthlySpent,
            timesUsed: allExpenseProducts.length,
            monthlyUsed: monthlyExpenseProducts.length,
          };
        }) || [];

      // Most purchased products (by quantity)
      const mostPurchasedProducts = productStats
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10)
        .map((prod) => ({
          name: prod.name,
          quantity: prod.totalQuantity,
          fill: "#8B5CF6",
        }));

      // Highest spending products
      const highestSpendingProducts = productStats
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .map((prod) => ({
          name: prod.name,
          amount: prod.totalSpent,
          fill: "#06B6D4",
        }));

      // Monthly vs All time purchases
      const monthlyVsAllTime = productStats
        .filter((prod) => prod.totalQuantity > 0)
        .slice(0, 10)
        .map((prod) => ({
          name: prod.name,
          monthly: prod.monthlyQuantity,
          allTime: prod.totalQuantity,
        }));

      // Product usage frequency
      const usageFrequency = productStats
        .sort((a, b) => b.timesUsed - a.timesUsed)
        .slice(0, 10)
        .map((prod) => ({
          name: prod.name,
          count: prod.timesUsed,
          fill: "#10B981",
        }));

      return {
        mostPurchasedProducts,
        highestSpendingProducts,
        monthlyVsAllTime,
        usageFrequency,
        productStats,
        totalProducts: products?.length || 0,
      };
    },
    enabled: !!user?.id,
  });
}

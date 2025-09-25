import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns";

type TimePeriod = "week" | "month" | "year";

function getDateRange(period: TimePeriod) {
  const now = new Date();
  switch (period) {
    case "week":
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function useExpensesAnalytics(period: TimePeriod = "month") {
  const { user } = useAuth();
  const { start: periodStart, end: periodEnd } = getDateRange(period);

  return useQuery({
    queryKey: ["expenses-analytics", user?.id, period, format(periodStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get all expenses for selected period
      const { data: expenses, error } = await supabase
        .from("expenses")
        .select(
          `
          *,
          categories (name, color)
        `
        )
        .eq("user_id", user.id)
        .gte("expense_date", format(periodStart, "yyyy-MM-dd"))
        .lte("expense_date", format(periodEnd, "yyyy-MM-dd"))
        .order("expense_date", { ascending: true });

      if (error) throw error;

      // Daily expenses
      const dailyExpenses = eachDayOfInterval({
        start: periodStart,
        end: periodEnd,
      }).map((day) => {
        const dayString = format(day, "yyyy-MM-dd");
        const dayExpenses =
          expenses?.filter((exp) => exp.expense_date === dayString) || [];
        const total = dayExpenses.reduce(
          (sum, exp) => sum + Number(exp.amount),
          0
        );
        return {
          date: format(day, period === "year" ? "MMM" : "MMM dd"),
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

export function useCategoriesAnalytics(period: TimePeriod = "month") {
  const { user } = useAuth();
  const { start: periodStart, end: periodEnd } = getDateRange(period);

  return useQuery({
    queryKey: ["categories-analytics", user?.id, period, format(periodStart, "yyyy-MM-dd")],
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

      const categoryStats =
        categories?.map((category) => {
          const allExpenses = category.expenses || [];
          const periodExpenses = allExpenses.filter((exp) => {
            const expDate = new Date(exp.expense_date);
            return expDate >= periodStart && expDate <= periodEnd;
          });

          return {
            name: category.name,
            color: category.color,
            totalExpenses: allExpenses.length,
            periodExpenses: periodExpenses.length,
            totalAmount: allExpenses.reduce(
              (sum, exp) => sum + Number(exp.amount),
              0
            ),
            periodAmount: periodExpenses.reduce(
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

      // Period vs All time comparison
      const periodVsAllTime = categoryStats.map((cat) => ({
        name: cat.name,
        period: cat.periodAmount,
        allTime: cat.totalAmount,
        fill: cat.color,
      }));

      return {
        mostUsedCategories,
        highestSpendingCategories,
        periodVsAllTime,
        categoryStats,
        totalCategories: categories?.length || 0,
      };
    },
    enabled: !!user?.id,
  });
}

export function useProductsAnalytics(period: TimePeriod = "month") {
  const { user } = useAuth();
  const { start: periodStart, end: periodEnd } = getDateRange(period);

  return useQuery({
    queryKey: ["products-analytics", user?.id, period, format(periodStart, "yyyy-MM-dd")],
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

      const productStats =
        products?.map((product) => {
          const allExpenseProducts = product.expense_products || [];
          const periodExpenseProducts = allExpenseProducts.filter((ep) => {
            const expDate = new Date(ep.expenses?.expense_date);
            return expDate >= periodStart && expDate <= periodEnd;
          });

          const totalQuantity = allExpenseProducts.reduce(
            (sum, ep) => sum + ep.quantity,
            0
          );
          const periodQuantity = periodExpenseProducts.reduce(
            (sum, ep) => sum + ep.quantity,
            0
          );
          const totalSpent = allExpenseProducts.reduce(
            (sum, ep) => sum + ep.quantity * Number(ep.price_per_unit),
            0
          );
          const periodSpent = periodExpenseProducts.reduce(
            (sum, ep) => sum + ep.quantity * Number(ep.price_per_unit),
            0
          );

          return {
            name: product.name,
            defaultPrice: Number(product.default_price || 0),
            totalQuantity,
            periodQuantity,
            totalSpent,
            periodSpent,
            timesUsed: allExpenseProducts.length,
            periodUsed: periodExpenseProducts.length,
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

      // Period vs All time purchases
      const periodVsAllTime = productStats
        .filter((prod) => prod.totalQuantity > 0)
        .slice(0, 10)
        .map((prod) => ({
          name: prod.name,
          period: prod.periodQuantity,
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
        periodVsAllTime,
        usageFrequency,
        productStats,
        totalProducts: products?.length || 0,
      };
    },
    enabled: !!user?.id,
  });
}

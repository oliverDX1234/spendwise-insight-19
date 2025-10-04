import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  TrendingUp,
  CreditCard,
  BarChart3,
  ShoppingCart,
  Lock,
} from "lucide-react";
import { ExpenseCard } from "@/components/ExpenseCard";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { QuickStats } from "@/components/QuickStats";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { useExpenses, Expense, CreateExpenseData } from "@/hooks/useExpenses";
import { useBudgets } from "@/hooks/useBudgets";
import { useLimits } from "@/hooks/useLimits";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import {
  useExpensesAnalytics,
  useCategoriesAnalytics,
  useProductsAnalytics,
} from "@/hooks/useAnalytics";
import { Navigate, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    expenses,
    loading: expensesLoading,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useExpenses();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const { limits, loading: limitsLoading } = useLimits();
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const {
    isPremium,
    isTrial,
    isLoading: subscriptionLoading,
  } = useSubscription();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  // Analytics hooks
  const { data: expensesAnalytics, isLoading: analyticsLoading } =
    useExpensesAnalytics("month");
  const { data: categoriesAnalytics } = useCategoriesAnalytics("month");
  const { data: productsAnalytics } = useProductsAnalytics("month");

  // If user needs onboarding, show onboarding dialog and block everything else
  if (!authLoading && !onboardingLoading && needsOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <OnboardingDialog
          isOpen={true}
          onComplete={() => {
            window.location.reload(); // Refresh to update user state
          }}
        />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleAddExpense = async (expenseData: CreateExpenseData) => {
    try {
      await createExpense(expenseData);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowEditExpense(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setDeletingExpenseId(expenseId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteExpense = async () => {
    if (deletingExpenseId) {
      try {
        await deleteExpense(deletingExpenseId);
        setShowDeleteDialog(false);
        setDeletingExpenseId(null);
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  // Calculate monthly stats
  const currentMonthExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.expense_date);
    const now = new Date();
    return (
      expenseDate.getMonth() === now.getMonth() &&
      expenseDate.getFullYear() === now.getFullYear()
    );
  });

  const monthlySpent = currentMonthExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );
  const expenseCount = currentMonthExpenses.length;
  const averageExpense = expenseCount > 0 ? monthlySpent / expenseCount : 0;

  // Calculate active limits
  const now = new Date();
  const activeLimits = limits.filter((limit) => {
    const endDate = new Date(limit.end_date);
    return endDate >= now;
  });

  // Check which limits are reached
  const limitsReached = activeLimits.filter((limit) => {
    const limitExpenses = currentMonthExpenses.filter(
      (exp) => exp.category_id === limit.category_id
    );
    const limitSpent = limitExpenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    );
    return limitSpent >= limit.amount;
  }).length;

  // Chart colors (matching Analytics page)
  const productColors = [
    "#06B6D4",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#10B981",
    "#F97316",
    "#3B82F6",
    "#EC4899",
    "#84CC16",
    "#6366F1",
    "#14B8A6",
    "#F43F5E",
    "#8B5A2B",
    "#7C3AED",
    "#059669",
    "#DC2626",
    "#2563EB",
    "#CA8A04",
    "#16A34A",
    "#DB2777",
    "#0891B2",
    "#9333EA",
    "#EA580C",
    "#4F46E5",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 py-20">
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold text-white">
              Welcome to{" "}
              <span className="text-primary-foreground">SpendWise</span>
            </h1>
            <p className="mb-8 text-xl text-white/90">
              Your smart expense tracker for better financial decisions
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setShowAddExpense(true)}
                className="shadow-lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Expense
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="lg"
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        disabled={isTrial}
                        onClick={() => !isTrial && navigate("/analytics")}
                      >
                        {isTrial && <Lock className="mr-2 h-5 w-5" />}
                        <TrendingUp className="mr-2 h-5 w-5" />
                        View Analytics
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isTrial && (
                    <TooltipContent>
                      <p>Upgrade to Premium to access Analytics</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Monthly Stats Label */}
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-foreground">
              This Month
            </h2>
          </div>

          {/* Quick Stats */}
          <QuickStats
            monthlySpent={monthlySpent}
            activeLimits={activeLimits.length}
            limitsReached={limitsReached}
            expenseCount={expenseCount}
            averageExpense={averageExpense}
            loading={expensesLoading || budgetsLoading || limitsLoading}
          />

          {/* Recent Expenses - Full Width */}
          <div className="mt-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>Your latest transactions</CardDescription>
                </div>
                <Button onClick={() => setShowAddExpense(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {expensesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="animate-pulse bg-muted h-24 rounded-lg"
                      ></div>
                    ))}
                  </div>
                ) : expenses.slice(0, 5).length > 0 ? (
                  expenses
                    .slice(0, 5)
                    .map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        onEdit={handleEditExpense}
                        onDelete={handleDeleteExpense}
                      />
                    ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      No expenses yet. Add your first expense to get started!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analytics Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              Analytics Overview
            </h2>

            <div className="grid gap-6">
              {/* Daily Expenses Chart - Full Width */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Daily Expenses This Month
                  </CardTitle>
                  <CardDescription>
                    Your spending pattern throughout the month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : expensesAnalytics?.dailyExpenses &&
                    expensesAnalytics.dailyExpenses.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={expensesAnalytics.dailyExpenses}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="date"
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: "12px" }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="amount"
                          fill="hsl(217 91% 60%)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <p>No expense data available for this month</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Categories and Products Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Used Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Most Used Categories
                    </CardTitle>
                    <CardDescription>
                      Top categories by frequency
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {categoriesAnalytics?.mostUsedCategories &&
                    categoriesAnalytics.mostUsedCategories.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={categoriesAnalytics.mostUsedCategories.slice(
                            0,
                            5
                          )}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: "12px" }}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="hsl(217 91% 60%)"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        <p>No category data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Most Purchased Products */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Most Purchased Products
                    </CardTitle>
                    <CardDescription>
                      Your top products by quantity purchased
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {productsAnalytics?.mostPurchasedProducts &&
                    productsAnalytics.mostPurchasedProducts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={productsAnalytics.mostPurchasedProducts.slice(
                            0,
                            8
                          )}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: "12px" }}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="quantity">
                            {productsAnalytics.mostPurchasedProducts
                              .slice(0, 8)
                              .map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    productColors[index % productColors.length]
                                  }
                                />
                              ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        <p>No product data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
        onAddExpense={handleAddExpense}
      />

      {/* Edit Expense Dialog */}
      <EditExpenseDialog
        expense={editingExpense}
        open={showEditExpense}
        onOpenChange={setShowEditExpense}
        onUpdateExpense={updateExpense}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        onConfirm={confirmDeleteExpense}
      />
    </div>
  );
}

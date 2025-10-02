import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, CreditCard, BarChart3, ShoppingCart, Lock } from "lucide-react";
import { ExpenseCard } from "@/components/ExpenseCard";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { QuickStats } from "@/components/QuickStats";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { useExpenses } from "@/hooks/useExpenses";
import { useBudgets } from "@/hooks/useBudgets";
import { useLimits } from "@/hooks/useLimits";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useExpensesAnalytics, useCategoriesAnalytics, useProductsAnalytics } from "@/hooks/useAnalytics";
import { Navigate, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { expenses, loading: expensesLoading, createExpense, deleteExpense } = useExpenses();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const { limits, loading: limitsLoading } = useLimits();
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const { isPremium, isTrial, isLoading: subscriptionLoading } = useSubscription();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { toast } = useToast();

  // Analytics hooks
  const { data: expensesAnalytics, isLoading: analyticsLoading } = useExpensesAnalytics("month");
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

  const handleAddExpense = async (expenseData: any) => {
    try {
      await createExpense(expenseData);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  // Calculate monthly stats
  const currentMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && 
           expenseDate.getFullYear() === now.getFullYear();
  });
  
  const monthlySpent = currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const expenseCount = currentMonthExpenses.length;
  const averageExpense = expenseCount > 0 ? monthlySpent / expenseCount : 0;

  // Calculate active limits
  const now = new Date();
  const activeLimits = limits.filter(limit => {
    const endDate = new Date(limit.end_date);
    return endDate >= now;
  });

  // Check which limits are reached
  const limitsReached = activeLimits.filter(limit => {
    const limitExpenses = currentMonthExpenses.filter(exp => exp.category_id === limit.category_id);
    const limitSpent = limitExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    return limitSpent >= limit.amount;
  }).length;

  // Chart colors
  const COLORS = ['hsl(217 91% 60%)', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(0 84% 60%)', 'hsl(270 60% 60%)', 'hsl(180 60% 50%)'];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 py-20">
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold text-white">
              Welcome to <span className="text-primary-foreground">SpendWise</span>
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
                        onClick={() => !isTrial && navigate('/analytics')}
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
            <h2 className="text-2xl font-semibold text-foreground">This Month</h2>
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
                      <div key={i} className="animate-pulse bg-muted h-24 rounded-lg"></div>
                    ))}
                  </div>
                ) : expenses.slice(0, 5).length > 0 ? (
                  expenses.slice(0, 5).map((expense) => (
                    <ExpenseCard 
                      key={expense.id} 
                      expense={expense}
                      onDelete={handleDeleteExpense}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No expenses yet. Add your first expense to get started!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analytics Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Analytics Overview</h2>
            
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Daily Expenses Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Daily Expenses This Month
                  </CardTitle>
                  <CardDescription>Your spending pattern throughout the month</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : expensesAnalytics?.dailyExpenses && expensesAnalytics.dailyExpenses.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={expensesAnalytics.dailyExpenses}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="amount" fill="hsl(217 91% 60%)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <p>No expense data available for this month</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Most Used Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Most Used Categories
                  </CardTitle>
                  <CardDescription>Top categories by frequency</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoriesAnalytics?.mostUsedCategories && categoriesAnalytics.mostUsedCategories.length > 0 ? (
                    <div className="space-y-4">
                      {categoriesAnalytics.mostUsedCategories.slice(0, 5).map((category, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.fill }}
                            />
                            <span className="text-sm font-medium">{category.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{category.count} times</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      <p>No category data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Most Purchased Products */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Most Purchased Products
                  </CardTitle>
                  <CardDescription>Your top products by quantity purchased</CardDescription>
                </CardHeader>
                <CardContent>
                  {productsAnalytics?.mostPurchasedProducts && productsAnalytics.mostPurchasedProducts.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {productsAnalytics.mostPurchasedProducts.slice(0, 6).map((product, index) => (
                        <div 
                          key={index} 
                          className="p-4 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{product.name}</h4>
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0 mt-1" 
                              style={{ backgroundColor: product.fill }}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Quantity: <span className="font-medium text-foreground">{product.quantity}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                      <p>No product data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
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

    </div>
  );
}
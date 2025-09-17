import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, Tag, Settings, TrendingUp, DollarSign, CreditCard, Target } from "lucide-react";
import { ExpenseCard } from "@/components/ExpenseCard";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { QuickStats } from "@/components/QuickStats";
import { useExpenses } from "@/hooks/useExpenses";
import { useBudgets } from "@/hooks/useBudgets";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { expenses, loading: expensesLoading, createExpense, deleteExpense } = useExpenses();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { toast } = useToast();

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

  // Calculate stats from real data
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const currentMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && 
           expenseDate.getFullYear() === now.getFullYear();
  });
  
  const monthlySpent = currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const totalBudget = budgets.reduce((sum, budget) => sum + Number(budget.amount), 0);
  const remainingBudget = totalBudget - monthlySpent;

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
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <TrendingUp className="mr-2 h-5 w-5" />
                View Analytics
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Quick Stats */}
          <QuickStats 
            totalSpent={totalSpent} 
            remainingBudget={remainingBudget} 
            expenseCount={expenses.length}
            loading={expensesLoading || budgetsLoading}
          />
          
          {/* Main Content Grid */}
          <div className="mt-8 grid lg:grid-cols-3 gap-6">
            {/* Recent Expenses */}
            <div className="lg:col-span-2 space-y-6">
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

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Budget Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="mr-2 h-5 w-5" />
                    Budget Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Spent</span>
                        <span>${monthlySpent.toFixed(2)}</span>
                      </div>
                      <Progress value={totalBudget > 0 ? (monthlySpent / totalBudget) * 100 : 0} className="h-2" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>${monthlySpent.toFixed(2)} of ${totalBudget.toFixed(2)}</span>
                        <span>{totalBudget > 0 ? Math.round((monthlySpent / totalBudget) * 100) : 0}%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Remaining</span>
                      <span className={`font-semibold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.abs(remainingBudget).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Manage your expenses efficiently</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    View Calendar
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Tag className="mr-2 h-4 w-4" />
                    Categories
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
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
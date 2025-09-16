import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, PieChart, Settings } from "lucide-react";
import heroImage from "@/assets/hero-dashboard.jpg";
import { ExpenseCard } from "@/components/ExpenseCard";
import { QuickStats } from "@/components/QuickStats";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";

// Mock data for demonstration
const mockExpenses = [
  {
    id: "1",
    amount: 45.99,
    category: "Food & Dining",
    description: "Lunch at Cafe Roma",
    date: new Date().toISOString().split('T')[0],
    products: [{ name: "Pasta", quantity: 1, price: 18.99 }, { name: "Coffee", quantity: 2, price: 13.50 }]
  },
  {
    id: "2", 
    amount: 120.00,
    category: "Utilities",
    description: "Monthly internet bill",
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    products: [{ name: "Internet Service", quantity: 1, price: 120.00 }]
  },
  {
    id: "3",
    amount: 85.50,
    category: "Transportation",
    description: "Gas station fill-up",
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    products: [{ name: "Gasoline", quantity: 12, price: 7.12 }]
  }
];

const Index = () => {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenses, setExpenses] = useState(mockExpenses);

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyBudget = 2000;
  const remainingBudget = monthlyBudget - totalSpent;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-primary py-20">
        <div className="absolute inset-0 opacity-10">
          <img src={heroImage} alt="Financial Dashboard" className="h-full w-full object-cover" />
        </div>
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold text-primary-foreground">
              Welcome to <span className="text-white">SpendWise</span>
            </h1>
            <p className="mb-8 text-xl text-primary-foreground/90">
              Your smart expense tracker for better financial decisions
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setShowAddExpense(true)}
                className="shadow-elevated"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Add First Expense
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <BarChart3 className="mr-2 h-5 w-5" />
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
            monthlyBudget={monthlyBudget}
            expenseCount={expenses.length}
          />

          {/* Main Content Grid */}
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            {/* Recent Expenses */}
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Recent Expenses</h2>
                <Button 
                  onClick={() => setShowAddExpense(true)}
                  className="bg-gradient-primary"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </div>
              
              {expenses.length > 0 ? (
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <ExpenseCard key={expense.id} expense={expense} />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No expenses yet</h3>
                    <p className="mb-4 text-center text-muted-foreground">
                      Start tracking your expenses to gain insights into your spending habits.
                    </p>
                    <Button onClick={() => setShowAddExpense(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Your First Expense
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Budget Overview */}
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-success" />
                    Budget Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Monthly Budget</span>
                        <span className="font-semibold">${monthlyBudget.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted">
                        <div 
                          className="h-2 rounded-full bg-gradient-success" 
                          style={{ width: `${Math.min((totalSpent / monthlyBudget) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Remaining</span>
                      <span className={`font-semibold ${remainingBudget >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ${Math.abs(remainingBudget).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="shadow-card">
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
                    <PieChart className="mr-2 h-4 w-4" />
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
        onAddExpense={(expense) => {
          const newExpense = {
            ...expense,
            id: Date.now().toString(),
          };
          setExpenses(prev => [newExpense, ...prev]);
          setShowAddExpense(false);
        }}
      />
    </div>
  );
};

export default Index;
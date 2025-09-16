import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Receipt } from "lucide-react";

interface QuickStatsProps {
  totalSpent: number;
  remainingBudget: number;
  monthlyBudget: number;
  expenseCount: number;
}

export function QuickStats({ totalSpent, remainingBudget, monthlyBudget, expenseCount }: QuickStatsProps) {
  const budgetUsedPercentage = (totalSpent / monthlyBudget) * 100;
  const isOverBudget = remainingBudget < 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Spent */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            {budgetUsedPercentage.toFixed(1)}% of monthly budget
          </p>
        </CardContent>
      </Card>

      {/* Remaining Budget */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isOverBudget ? "Over Budget" : "Remaining Budget"}
          </CardTitle>
          {isOverBudget ? (
            <TrendingDown className="h-4 w-4 text-destructive" />
          ) : (
            <TrendingUp className="h-4 w-4 text-success" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : 'text-success'}`}>
            ${Math.abs(remainingBudget).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Monthly budget: ${monthlyBudget.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Expense Count */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{expenseCount}</div>
          <p className="text-xs text-muted-foreground">
            This month
          </p>
        </CardContent>
      </Card>

      {/* Average Per Day */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(totalSpent / new Date().getDate()).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Based on current month
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
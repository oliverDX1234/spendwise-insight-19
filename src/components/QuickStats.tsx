import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, Target, TrendingUp, AlertTriangle } from "lucide-react";

interface QuickStatsProps {
  monthlySpent: number;
  activeLimits: number;
  limitsReached: number;
  expenseCount: number;
  averageExpense: number;
  loading?: boolean;
}

export function QuickStats({ 
  monthlySpent, 
  activeLimits, 
  limitsReached, 
  expenseCount, 
  averageExpense, 
  loading 
}: QuickStatsProps) {
  // Loading state
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Spent This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${monthlySpent.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      {/* Active Limits / Limits Reached */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Spending Limits</CardTitle>
          {limitsReached > 0 ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <Target className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {limitsReached > 0 ? (
              <span className="text-warning">{limitsReached}</span>
            ) : (
              <span className="text-success">{activeLimits}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {limitsReached > 0 ? `${limitsReached} limits reached` : `${activeLimits} active limits`}
          </p>
        </CardContent>
      </Card>

      {/* Total Expenses Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{expenseCount}</div>
          <p className="text-xs text-muted-foreground">Transactions this month</p>
        </CardContent>
      </Card>

      {/* Average Expense */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${averageExpense.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Per transaction</p>
        </CardContent>
      </Card>
    </div>
  );
}

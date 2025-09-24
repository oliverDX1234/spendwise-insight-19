import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AddLimitDialog } from "@/components/AddLimitDialog";
import { useLimits } from "@/hooks/useLimits";
import { useCategories } from "@/hooks/useCategories";
import { useExpenses } from "@/hooks/useExpenses";
import { format } from "date-fns";

export default function Limits() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { limits, loading } = useLimits();
  const { categories } = useCategories();
  const { expenses } = useExpenses();

  const calculateProgress = (limit: any) => {
    if (!expenses) return 0;
    
    // Filter expenses for this category within the limit period
    const categoryExpenses = expenses.filter(expense => 
      expense.category_id === limit.category_id &&
      new Date(expense.expense_date) >= new Date(limit.start_date) &&
      new Date(expense.expense_date) <= new Date(limit.end_date)
    );
    
    const totalSpent = categoryExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const percentage = Math.round((totalSpent / Number(limit.amount)) * 100);
    
    return Math.min(percentage, 100);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories?.find(cat => cat.id === categoryId);
    return category?.name || "Unknown Category";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-primary";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Spending Limits</h1>
          <p className="text-muted-foreground mt-2">
            Set and monitor spending limits for your categories
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Limit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Limits</CardTitle>
          <CardDescription>
            Monitor your spending against set limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {limits && limits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Active Until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {limits.map((limit) => {
                  const progress = calculateProgress(limit);
                  return (
                    <TableRow key={limit.id}>
                      <TableCell className="font-medium">{limit.name}</TableCell>
                      <TableCell>{getCategoryName(limit.category_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {limit.period_type}
                        </Badge>
                      </TableCell>
                      <TableCell>${Number(limit.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={progress} 
                            className="flex-1"
                          />
                          <span className="text-sm font-medium">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(limit.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(limit.end_date), "MMM dd, yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No limits set yet. Create your first spending limit!</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddLimitDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
}
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, Package, Repeat } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: string;
  name: string;
  quantity: number;
  price_per_unit: number;
}

interface Expense {
  id: string;
  amount: number;
  category?: {
    name: string;
    color: string;
  };
  description: string | null;
  expense_date: string;
  is_recurring: boolean;
  recurring_interval: string | null;
  products: Product[];
}

interface ExpenseCardProps {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getBadgeStyle = (color: string) => {
    return {
      backgroundColor: `${color}20`,
      borderColor: `${color}50`,
      color: color
    };
  };

  return (
    <Card className="shadow-card transition-all duration-300 hover:shadow-elevated">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg">${Number(expense.amount).toFixed(2)}</h3>
              <Badge
                variant="secondary"
                style={expense.category ? getBadgeStyle(expense.category.color) : undefined}
                className="border"
              >
                {expense.category?.name || 'Uncategorized'}
              </Badge>
              {expense.is_recurring && (
                <Badge variant="outline" className="text-xs">
                  <Repeat className="h-3 w-3 mr-1" />
                  {expense.recurring_interval}
                </Badge>
              )}
            </div>

            <p className="text-muted-foreground mb-3">{expense.description || 'No description'}</p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(expense.expense_date)}
              </div>
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {expense.products.length} item{expense.products.length !== 1 ? 's' : ''}
              </div>
            </div>

            {expense.products.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <h4 className="text-sm font-medium mb-2">Items:</h4>
                <div className="space-y-1">
                  {expense.products.map((product, index) => (
                    <div key={product.id || index} className="flex justify-between text-sm">
                      <span>{product.name} × {product.quantity}</span>
                      <span className="font-medium">${(Number(product.price_per_unit) * product.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(expense)}>
                Edit expense
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(expense.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
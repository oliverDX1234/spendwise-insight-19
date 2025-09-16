import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  name: string;
  quantity: number;
  price: number;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  products: Product[];
}

interface ExpenseCardProps {
  expense: Expense;
}

const categoryColors: Record<string, string> = {
  "Food & Dining": "bg-orange-100 text-orange-800 border-orange-200",
  "Utilities": "bg-blue-100 text-blue-800 border-blue-200", 
  "Transportation": "bg-green-100 text-green-800 border-green-200",
  "Entertainment": "bg-purple-100 text-purple-800 border-purple-200",
  "Shopping": "bg-pink-100 text-pink-800 border-pink-200",
  "Healthcare": "bg-red-100 text-red-800 border-red-200",
};

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="shadow-card transition-all duration-300 hover:shadow-elevated">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg">${expense.amount.toFixed(2)}</h3>
              <Badge 
                variant="secondary" 
                className={categoryColors[expense.category] || "bg-gray-100 text-gray-800 border-gray-200"}
              >
                {expense.category}
              </Badge>
            </div>
            
            <p className="text-muted-foreground mb-3">{expense.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(expense.date)}
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
                    <div key={index} className="flex justify-between text-sm">
                      <span>{product.name} × {product.quantity}</span>
                      <span className="font-medium">${(product.price * product.quantity).toFixed(2)}</span>
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
              <DropdownMenuItem>Edit expense</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  name: string;
  quantity: number;
  price: number;
}

interface Expense {
  amount: number;
  category: string;
  description: string;
  date: string;
  products: Product[];
}

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExpense: (expense: Expense) => void;
}

const categories = [
  "Food & Dining",
  "Utilities", 
  "Transportation",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Education",
  "Travel",
  "Insurance",
  "Other"
];

export function AddExpenseDialog({ open, onOpenChange, onAddExpense }: AddExpenseDialogProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [products, setProducts] = useState<Product[]>([
    { name: "", quantity: 1, price: 0 }
  ]);

  const addProduct = () => {
    setProducts([...products, { name: "", quantity: 1, price: 0 }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: keyof Product, value: string | number) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setProducts(updatedProducts);
  };

  const calculateTotal = () => {
    return products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !category || !description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const validProducts = products.filter(p => p.name.trim() !== "");
    const calculatedAmount = validProducts.length > 0 ? calculateTotal() : parseFloat(amount);

    onAddExpense({
      amount: calculatedAmount,
      category,
      description,
      date,
      products: validProducts,
    });

    // Reset form
    setAmount("");
    setCategory("");
    setDescription("");
    setDate(new Date().toISOString().split('T')[0]);
    setProducts([{ name: "", quantity: 1, price: 0 }]);

    toast({
      title: "Expense Added",
      description: "Your expense has been successfully recorded.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Record a new expense with detailed information and product breakdown.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Details (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {products.map((product, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label>Product Name</Label>
                    <Input
                      placeholder="Product name"
                      value={product.name}
                      onChange={(e) => updateProduct(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="w-32">
                    <Label>Price Each</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={product.price}
                      onChange={(e) => updateProduct(index, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeProduct(index)}
                    disabled={products.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <div className="flex justify-between items-center pt-4 border-t">
                <Button type="button" variant="outline" onClick={addProduct}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
                
                {products.some(p => p.name.trim() !== "") && (
                  <div className="text-lg font-semibold">
                    Total: ${calculateTotal().toFixed(2)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-primary">
              Add Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
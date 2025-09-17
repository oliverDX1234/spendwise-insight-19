import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { Expense } from '@/hooks/useExpenses';
import { cn } from '@/lib/utils';

interface Product {
  name: string;
  quantity: number;
  price_per_unit: number;
}

interface EditExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateExpense: (expenseId: string, data: any) => Promise<void>;
}

export function EditExpenseDialog({
  expense,
  open,
  onOpenChange,
  onUpdateExpense
}: EditExpenseDialogProps) {
  const { categories } = useCategories();
  const { getProductsByCategory } = useProducts();
  const { toast } = useToast();

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState<Date>();
  const [description, setDescription] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategoryId(expense.category_id);
      setDate(new Date(expense.expense_date));
      setDescription(expense.description || '');
      setProducts(expense.products.map(p => ({
        name: p.name,
        quantity: p.quantity,
        price_per_unit: p.price_per_unit
      })));
    }
  }, [expense]);

  const addProduct = () => {
    setProducts([...products, { name: '', quantity: 1, price_per_unit: 0 }]);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof Product, value: string | number) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  const calculateTotal = () => {
    return products.reduce((total, product) => {
      return total + (product.quantity * product.price_per_unit);
    }, 0);
  };

  const resetForm = () => {
    setAmount('');
    setCategoryId('');
    setDate(undefined);
    setDescription('');
    setProducts([]);
  };

  const handleSubmit = async () => {
    if (!expense) return;

    if (!amount || !categoryId || !date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      await onUpdateExpense(expense.id, {
        amount: parseFloat(amount),
        category_id: categoryId,
        expense_date: format(date, 'yyyy-MM-dd'),
        description: description || null,
        products: products.filter(p => p.name.trim() !== '')
      });

      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const existingProducts = categoryId ? getProductsByCategory(categoryId) : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {products.map((product, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label htmlFor={`product-name-${index}`}>Product Name</Label>
                    {existingProducts.length > 0 ? (
                      <Select
                        value={product.name}
                        onValueChange={(value) => {
                          const existingProduct = existingProducts.find(p => p.name === value);
                          updateProduct(index, 'name', value);
                          if (existingProduct && existingProduct.default_price) {
                            updateProduct(index, 'price_per_unit', existingProduct.default_price);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select or type product" />
                        </SelectTrigger>
                        <SelectContent>
                          {existingProducts.map((p) => (
                            <SelectItem key={p.id} value={p.name}>
                              {p.name} {p.default_price && `($${p.default_price})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`product-name-${index}`}
                        value={product.name}
                        onChange={(e) => updateProduct(index, 'name', e.target.value)}
                        placeholder="Product name"
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`product-quantity-${index}`}>Qty</Label>
                    <Input
                      id={`product-quantity-${index}`}
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-span-4">
                    <Label htmlFor={`product-price-${index}`}>Price per unit</Label>
                    <Input
                      id={`product-price-${index}`}
                      type="number"
                      step="0.01"
                      value={product.price_per_unit}
                      onChange={(e) => updateProduct(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeProduct(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {products.length > 0 && (
                <div className="text-right text-sm font-medium">
                  Product Total: ${calculateTotal().toFixed(2)}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Expense'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
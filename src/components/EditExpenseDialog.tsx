import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { Expense } from "@/hooks/useExpenses";
import { cn } from "@/lib/utils";

interface Product {
  name: string;
  quantity: number;
  price_per_unit: number;
  isExisting: boolean;
  existingProductId?: string;
}

interface UpdateExpenseData {
  amount: number;
  category_id: string;
  expense_date: string;
  description: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  products?: Array<{
    product_id?: string;
    name: string;
    quantity: number;
    price_per_unit: number;
  }>;
}

interface EditExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateExpense: (
    expenseId: string,
    data: UpdateExpenseData
  ) => Promise<void>;
}

export function EditExpenseDialog({
  expense,
  open,
  onOpenChange,
  onUpdateExpense,
}: EditExpenseDialogProps) {
  const { categories } = useCategories();
  const { getProductsByCategory } = useProducts();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState<Date>();
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategoryId(expense.category_id);
      setDate(new Date(expense.expense_date));
      setDescription(expense.description || "");
      setProducts(
        expense.products.map((p) => ({
          name: p.name,
          quantity: p.quantity,
          price_per_unit: p.price_per_unit,
          isExisting: false,
          existingProductId: undefined,
        }))
      );
      setIsRecurring(expense.is_recurring || false);
      setRecurringInterval(expense.recurring_interval || "");
    }
  }, [expense]);

  // Auto-calculate amount when products change
  useEffect(() => {
    if (products.length > 0) {
      const total = products.reduce(
        (sum, product) => sum + product.quantity * product.price_per_unit,
        0
      );
      setAmount(total.toFixed(2));
    }
  }, [products]);

  const addProduct = () => {
    setProducts([
      ...products,
      { name: "", quantity: 1, price_per_unit: 0, isExisting: false },
    ]);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (
    index: number,
    field: keyof Product,
    value: string | number | boolean
  ) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  const toggleProductType = (index: number, isExisting: boolean) => {
    const updatedProducts = [...products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      isExisting,
      name: "",
      price_per_unit: 0,
      existingProductId: undefined,
    };
    setProducts(updatedProducts);
  };

  const selectExistingProduct = (index: number, productId: string) => {
    const existingProduct = existingProducts.find((p) => p.id === productId);
    if (existingProduct) {
      const updatedProducts = [...products];
      updatedProducts[index] = {
        ...updatedProducts[index],
        name: existingProduct.name,
        price_per_unit: existingProduct.default_price || 0,
        existingProductId: productId,
      };
      setProducts(updatedProducts);
    }
  };

  const calculateTotal = () => {
    return products.reduce((total, product) => {
      return total + product.quantity * product.price_per_unit;
    }, 0);
  };

  const resetForm = () => {
    setAmount("");
    setCategoryId("");
    setDate(undefined);
    setDescription("");
    setProducts([]);
    setIsRecurring(false);
    setRecurringInterval("");
  };

  const handleSubmit = async () => {
    if (!expense) return;

    if (!amount || !categoryId || !date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await onUpdateExpense(expense.id, {
        amount: parseFloat(amount),
        category_id: categoryId,
        expense_date: format(date, "yyyy-MM-dd"),
        description: description || null,
        is_recurring: isRecurring,
        recurring_interval: isRecurring ? recurringInterval : null,
        products:
          products.length > 0
            ? products
                .filter((p) => p.name.trim() !== "")
                .map((p) => ({
                  product_id: p.existingProductId,
                  name: p.name,
                  quantity: p.quantity,
                  price_per_unit: p.price_per_unit,
                }))
            : undefined,
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
              <Label htmlFor="amount">
                Amount *
                {products.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Auto-calculated from products)
                  </span>
                )}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={products.length > 0 ? "bg-muted/50" : ""}
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

          {/* Recurring Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
                disabled={isSubmitting}
              />
              <Label htmlFor="recurring">Make this a recurring expense</Label>
            </div>

            {isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="interval">Recurring Interval</Label>
                <Select
                  value={recurringInterval}
                  onValueChange={setRecurringInterval}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Products Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Products (Optional)</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProduct}
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Product
              </Button>
            </div>

            {products.map((product, index) => (
              <Card key={index} className="p-4">
                <CardContent className="p-0 space-y-4">
                  {/* Toggle between New/Existing */}
                  <div className="flex items-center space-x-4">
                    <Button
                      type="button"
                      variant={!product.isExisting ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleProductType(index, false)}
                      disabled={isSubmitting}
                    >
                      New Product
                    </Button>
                    <Button
                      type="button"
                      variant={product.isExisting ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleProductType(index, true)}
                      disabled={isSubmitting || existingProducts.length === 0}
                    >
                      Existing Product
                    </Button>
                  </div>

                  <div className="flex gap-3 items-end">
                    {product.isExisting ? (
                      // Existing Product Selection
                      <>
                        <div className="flex-1 space-y-2">
                          <Label>Select Product</Label>
                          <Select
                            value={product.existingProductId || ""}
                            onValueChange={(value) =>
                              selectExistingProduct(index, value)
                            }
                            disabled={isSubmitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select existing product" />
                            </SelectTrigger>
                            <SelectContent>
                              {existingProducts.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}{" "}
                                  {p.default_price && `($${p.default_price})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24 space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) =>
                              updateProduct(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="w-32 space-y-2">
                          <Label>Price Each</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={product.price_per_unit}
                            disabled={true}
                            className="bg-muted"
                          />
                        </div>
                      </>
                    ) : (
                      // New Product Creation
                      <>
                        <div className="flex-1 space-y-2">
                          <Label>Product Name</Label>
                          <Input
                            placeholder="Enter product name"
                            value={product.name}
                            onChange={(e) =>
                              updateProduct(index, "name", e.target.value)
                            }
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="w-24 space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) =>
                              updateProduct(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="w-32 space-y-2">
                          <Label>Price Each</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={product.price_per_unit || ""}
                            onChange={(e) =>
                              updateProduct(
                                index,
                                "price_per_unit",
                                e.target.value === ""
                                  ? 0
                                  : parseFloat(e.target.value)
                              )
                            }
                            disabled={isSubmitting}
                          />
                        </div>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeProduct(index)}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {products.length > 0 && (
              <div className="text-right">
                <div className="text-lg font-semibold">
                  Product Total: ${calculateTotal().toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Expense"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

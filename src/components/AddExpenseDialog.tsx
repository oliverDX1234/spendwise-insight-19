import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { CreateExpenseData } from "@/hooks/useExpenses";

interface Product {
  name: string;
  quantity: number;
  price_per_unit: number;
  isExisting: boolean;
  existingProductId?: string;
}

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExpense: (expense: CreateExpenseData) => Promise<void>;
}

export function AddExpenseDialog({ open, onOpenChange, onAddExpense }: AddExpenseDialogProps) {
  const { toast } = useToast();
  const { categories, loading: categoriesLoading } = useCategories();
  const { getProductsByCategory } = useProducts();

  // Form state
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product management functions
  const addProduct = () => {
    setProducts([...products, { name: "", quantity: 1, price_per_unit: 0, isExisting: false }]);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof Product, value: string | number | boolean) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setProducts(updatedProducts);
  };

  const toggleProductType = (index: number, isExisting: boolean) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { 
      ...updatedProducts[index], 
      isExisting,
      name: "",
      price_per_unit: 0,
      existingProductId: undefined
    };
    setProducts(updatedProducts);
  };

  const selectExistingProduct = (index: number, productId: string) => {
    const existingProduct = existingProducts.find(p => p.id === productId);
    if (existingProduct) {
      const updatedProducts = [...products];
      updatedProducts[index] = {
        ...updatedProducts[index],
        name: existingProduct.name,
        price_per_unit: existingProduct.default_price || 0,
        existingProductId: productId
      };
      setProducts(updatedProducts);
    }
  };

  const calculateTotal = () => {
    return products.reduce((total, product) => total + (product.quantity * product.price_per_unit), 0);
  };

  const resetForm = () => {
    setAmount("");
    setCategoryId("");
    setDescription("");
    setDate(new Date().toISOString().split('T')[0]);
    setProducts([]);
    setIsRecurring(false);
    setRecurringInterval("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !categoryId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (isRecurring && !recurringInterval) {
      toast({
        title: "Error",
        description: "Please select a recurring interval",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const expenseData: CreateExpenseData = {
        amount: parseFloat(amount),
        category_id: categoryId,
        description: description || undefined,
        expense_date: date,
        is_recurring: isRecurring,
        recurring_interval: isRecurring ? recurringInterval : undefined,
        products: products.length > 0 ? products.map(p => ({
          product_id: p.existingProductId,
          name: p.name,
          quantity: p.quantity,
          price_per_unit: p.price_per_unit
        })) : undefined
      };

      await onAddExpense(expenseData);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const existingProducts = categoryId ? getProductsByCategory(categoryId) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
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
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={categoriesLoading || isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
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
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Recurring Options */}
            <div className="space-y-4 md:col-span-2">
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
                  <Select value={recurringInterval} onValueChange={setRecurringInterval} disabled={isSubmitting}>
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
          </div>

          {/* Products Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Products (Optional)</h4>
              <Button type="button" variant="outline" size="sm" onClick={addProduct} disabled={isSubmitting}>
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
                            onValueChange={(value) => selectExistingProduct(index, value)}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select existing product" />
                            </SelectTrigger>
                            <SelectContent>
                              {existingProducts.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} {p.default_price && `($${p.default_price})`}
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
                            onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
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
                            onChange={(e) => updateProduct(index, 'name', e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="w-24 space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="w-32 space-y-2">
                          <Label>Price Each</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={product.price_per_unit}
                            onChange={(e) => updateProduct(index, "price_per_unit", parseFloat(e.target.value) || 0)}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
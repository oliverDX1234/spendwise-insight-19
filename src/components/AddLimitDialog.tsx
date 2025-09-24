import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLimits } from "@/hooks/useLimits";
import { useCategories } from "@/hooks/useCategories";

const limitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category_id: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  period_type: z.enum(["weekly", "monthly"], {
    required_error: "Period type is required",
  }),
});

type LimitFormValues = z.infer<typeof limitSchema>;

interface AddLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLimitCreated?: () => void;
}

export function AddLimitDialog({ open, onOpenChange, onLimitCreated }: AddLimitDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createLimit } = useLimits();
  const { categories } = useCategories();

  const form = useForm<LimitFormValues>({
    resolver: zodResolver(limitSchema),
    defaultValues: {
      name: "",
      category_id: "",
      amount: "",
      period_type: "monthly",
    },
  });

  const onSubmit = async (data: LimitFormValues) => {
    try {
      setIsSubmitting(true);
      await createLimit({
        name: data.name,
        category_id: data.category_id,
        amount: Number(data.amount),
        period_type: data.period_type,
      });
      form.reset();
      onOpenChange(false);
      onLimitCreated?.();
    } catch (error) {
      console.error('Error creating limit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allCategories = categories || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Spending Limit</DialogTitle>
          <DialogDescription>
            Set a spending limit for a specific category
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limit Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Monthly Groceries Limit" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limit Amount ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="period_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Limit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
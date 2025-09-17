import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/hooks/useCategories';

interface EditCategoryDialogProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCategory: (categoryId: string, data: { name: string; color: string }) => Promise<void>;
}

export function EditCategoryDialog({
  category,
  open,
  onOpenChange,
  onUpdateCategory
}: EditCategoryDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
    }
  }, [category]);

  const handleSubmit = async () => {
    if (!category) return;

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdateCategory(category.id, {
        name: name.trim(),
        color
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the parent hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setColor('#6B7280');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="editCategoryName">Category Name</Label>
            <Input
              id="editCategoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
            />
          </div>
          <div>
            <Label htmlFor="editCategoryColor">Color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="editCategoryColor"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#6B7280"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Category'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
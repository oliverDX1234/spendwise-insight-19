import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Category {
  id: string;
  name: string;
  color: string;
  is_predefined: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface CreateCategoryData {
  name: string;
  color?: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Fetch product counts for each category
      const { data: productCounts, error: countError } = await supabase
        .from('products')
        .select('category_id');

      if (countError) throw countError;

      // Count products per category
      const countMap = (productCounts || []).reduce((acc: Record<string, number>, product) => {
        acc[product.category_id] = (acc[product.category_id] || 0) + 1;
        return acc;
      }, {});

      // Add product counts to categories
      const categoriesWithCounts = (categoriesData || []).map(cat => ({
        ...cat,
        product_count: countMap[cat.id] || 0
      }));

      setCategories(categoriesWithCounts);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (categoryData: CreateCategoryData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: categoryData.name,
          color: categoryData.color || '#6B7280'
        })
        .select()
        .single();

      if (error) throw error;

      await fetchCategories();
      toast({
        title: "Success",
        description: "Category created successfully"
      });

      return data;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateCategory = async (categoryId: string, categoryData: { name: string; color: string }) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', categoryId);

      if (error) throw error;

      await fetchCategories();
      toast({
        title: "Success",
        description: "Category updated successfully"
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      await fetchCategories();
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory
  };
}
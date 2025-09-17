import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  name: string;
  category_id: string;
  default_price: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  category_id: string;
  default_price?: number;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (productData: CreateProductData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: productData.name,
          category_id: productData.category_id,
          default_price: productData.default_price
        })
        .select()
        .single();

      if (error) throw error;

      await fetchProducts();
      toast({
        title: "Success",
        description: "Product created successfully"
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

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(product => product.category_id === categoryId);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    getProductsByCategory
  };
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const PREDEFINED_PRODUCT_CATEGORIES = [
  'Rings',
  'Necklaces',
  'Earrings',
  'Bracelets',
  'Watches',
  'Pendants',
  'Brooches',
  'Chains',
  'Charms',
  'Cufflinks'
] as const;

export const useCustomProductCategories = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['custom-product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('values')
        .single();
      
      if (error) throw error;
      
      const customCategories = (data?.values as any)?.product_categories || [];
      return customCategories as string[];
    },
    enabled: !!user && !!session,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useAddCustomProductCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: string) => {
      const trimmedCategory = category.trim();
      
      // Validate category name
      if (!trimmedCategory) {
        throw new Error('Category name cannot be empty');
      }
      
      // Check if it's a predefined category (case-insensitive)
      const isPredefined = PREDEFINED_PRODUCT_CATEGORIES.some(
        c => c.toLowerCase() === trimmedCategory.toLowerCase()
      );
      if (isPredefined) {
        throw new Error('This category already exists');
      }
      
      // Get existing categories
      const { data: settings } = await supabase
        .from('app_settings')
        .select('values')
        .single();
      
      const existingCategories = (settings?.values as any)?.product_categories || [];
      
      // Check if already exists in custom categories (case-insensitive)
      const alreadyExists = existingCategories.some(
        (c: string) => c.toLowerCase() === trimmedCategory.toLowerCase()
      );
      if (alreadyExists) {
        throw new Error('Category already exists');
      }
      
      // Add new category
      const updatedCategories = [...existingCategories, trimmedCategory];
      
      const { error } = await supabase
        .from('app_settings')
        .update({
          values: {
            ...((settings?.values as any) || {}),
            product_categories: updatedCategories
          }
        })
        .eq('id', 1);
      
      if (error) throw error;
      
      return trimmedCategory;
    },
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ['custom-product-categories'] });
      queryClient.invalidateQueries({ queryKey: ['filter-options'] });
      toast({
        title: "Category added",
        description: `"${category}" has been added to your categories`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add category",
        variant: "destructive"
      });
    }
  });
};

export const useAllProductCategories = () => {
  const { data: customCategories = [], isLoading } = useCustomProductCategories();
  
  // Combine predefined + custom, remove duplicates, and sort
  const allCategories = [...new Set([
    ...PREDEFINED_PRODUCT_CATEGORIES,
    ...customCategories
  ])].sort();
  
  return {
    predefined: [...PREDEFINED_PRODUCT_CATEGORIES],
    custom: customCategories,
    all: allCategories,
    isLoading
  };
};

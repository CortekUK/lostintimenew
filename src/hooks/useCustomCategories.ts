import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const PREDEFINED_CATEGORIES = [
  'Rent',
  'Utilities',
  'Marketing',
  'Insurance',
  'Shipping',
  'Repairs',
  'Packaging',
  'Other'
] as const;

// Helper to format category for display (capitalize first letter)
export const formatCategoryDisplay = (category: string): string => {
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase().replace(/_/g, ' ');
};

export const useCustomCategories = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['custom-expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('values')
        .single();
      
      if (error) throw error;
      
      const customCategories = (data?.values as any)?.expense_categories || [];
      return customCategories as string[];
    },
    enabled: !!user && !!session,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useAddCustomCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: string) => {
      const trimmedCategory = category.trim().toLowerCase().replace(/\s+/g, '_');
      
      // Get existing categories
      const { data: settings } = await supabase
        .from('app_settings')
        .select('values')
        .single();
      
      const existingCategories = (settings?.values as any)?.expense_categories || [];
      
      // Check if already exists
      if (existingCategories.includes(trimmedCategory)) {
        throw new Error('Category already exists');
      }
      
      // Add new category
      const updatedCategories = [...existingCategories, trimmedCategory];
      
      const { error } = await supabase
        .from('app_settings')
        .update({
          values: {
            ...((settings?.values as any) || {}),
            expense_categories: updatedCategories
          }
        })
        .eq('id', 1);
      
      if (error) throw error;
      
      return trimmedCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-expense-categories'] });
      toast({
        title: "Success",
        description: "Custom category added successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add custom category",
        variant: "destructive"
      });
    }
  });
};

export const useAllExpenseCategories = () => {
  const { data: customCategories = [] } = useCustomCategories();
  
  return {
    predefined: [...PREDEFINED_CATEGORIES],
    custom: customCategories,
    all: [...PREDEFINED_CATEGORIES, ...customCategories]
  };
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Default tags that ship with the app
export const DEFAULT_SUPPLIER_TAGS = [
  'Luxury Watches',
  'Diamonds', 
  'Gold',
  'Silver',
  'Vintage'
] as const;

export const useSupplierTags = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['supplier-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('values')
        .single();
      
      if (error) throw error;
      
      // Get custom tags from settings, or use defaults if none set
      const customTags = (data?.values as any)?.supplier_tags;
      
      // If supplier_tags is explicitly set (even if empty), use it
      // Otherwise use defaults
      if (customTags !== undefined) {
        return customTags as string[];
      }
      
      return [...DEFAULT_SUPPLIER_TAGS] as string[];
    },
    enabled: !!user && !!session,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useAddSupplierTag = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tag: string) => {
      const trimmedTag = tag.trim();
      
      if (!trimmedTag) {
        throw new Error('Tag cannot be empty');
      }
      
      // Get existing settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('values')
        .single();
      
      const existingTags = (settings?.values as any)?.supplier_tags ?? [...DEFAULT_SUPPLIER_TAGS];
      
      // Check if already exists (case-insensitive)
      if (existingTags.some((t: string) => t.toLowerCase() === trimmedTag.toLowerCase())) {
        throw new Error('Tag already exists');
      }
      
      // Add new tag
      const updatedTags = [...existingTags, trimmedTag];
      
      const { error } = await supabase
        .from('app_settings')
        .update({
          values: {
            ...((settings?.values as any) || {}),
            supplier_tags: updatedTags
          }
        })
        .eq('id', 1);
      
      if (error) throw error;
      
      return trimmedTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-tags'] });
      toast({
        title: "Tag added",
        description: "Supplier tag added successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add tag",
        variant: "destructive"
      });
    }
  });
};

export const useRemoveSupplierTag = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tag: string) => {
      // Get existing settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('values')
        .single();
      
      const existingTags = (settings?.values as any)?.supplier_tags ?? [...DEFAULT_SUPPLIER_TAGS];
      
      // Remove the tag
      const updatedTags = existingTags.filter((t: string) => t !== tag);
      
      const { error } = await supabase
        .from('app_settings')
        .update({
          values: {
            ...((settings?.values as any) || {}),
            supplier_tags: updatedTags
          }
        })
        .eq('id', 1);
      
      if (error) throw error;
      
      return tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-tags'] });
      toast({
        title: "Tag removed",
        description: "Supplier tag removed successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove tag",
        variant: "destructive"
      });
    }
  });
};

export const useResetSupplierTags = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Get existing settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('values')
        .single();
      
      const { error } = await supabase
        .from('app_settings')
        .update({
          values: {
            ...((settings?.values as any) || {}),
            supplier_tags: [...DEFAULT_SUPPLIER_TAGS]
          }
        })
        .eq('id', 1);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-tags'] });
      toast({
        title: "Tags reset",
        description: "Supplier tags reset to defaults"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset tags",
        variant: "destructive"
      });
    }
  });
};


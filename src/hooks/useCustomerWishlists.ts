import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CustomerWishlist {
  id: number;
  customer_id: number;
  brand_id: number | null;
  category: string | null;
  size: string | null;
  notes: string | null;
  notify_by: 'email' | 'sms' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand?: {
    id: number;
    name: string;
    tier: string | null;
  } | null;
}

export interface WishlistMatch {
  wishlist_id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  brand_id: number | null;
  brand_name: string | null;
  category: string | null;
  size: string | null;
  notes: string | null;
  notify_by: string;
  is_active: boolean;
}

export function useCustomerWishlists(customerId: number) {
  return useQuery({
    queryKey: ['customer-wishlists', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_wishlists')
        .select(`
          *,
          brand:brands!brand_id(id, name, tier)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerWishlist[];
    },
    enabled: !!customerId,
  });
}

export function useAddCustomerWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wishlist: {
      customer_id: number;
      brand_id?: number | null;
      category?: string | null;
      size?: string | null;
      notes?: string | null;
      notify_by?: 'email' | 'sms' | 'both';
    }) => {
      const { data, error } = await supabase
        .from('customer_wishlists')
        .insert([{
          customer_id: wishlist.customer_id,
          brand_id: wishlist.brand_id || null,
          category: wishlist.category || null,
          size: wishlist.size || null,
          notes: wishlist.notes || null,
          notify_by: wishlist.notify_by || 'email',
          is_active: true,
        }])
        .select(`
          *,
          brand:brands!brand_id(id, name, tier)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-wishlists', data.customer_id], refetchType: 'all' });
      toast({
        title: 'Wishlist item added',
        description: 'You\'ll see an alert when adding matching products.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding wishlist item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCustomerWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomerWishlist> & { id: number }) => {
      const { data, error } = await supabase
        .from('customer_wishlists')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          brand:brands!brand_id(id, name, tier)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-wishlists', data.customer_id], refetchType: 'all' });
      toast({
        title: 'Wishlist updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating wishlist',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCustomerWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, customerId }: { id: number; customerId: number }) => {
      const { error } = await supabase
        .from('customer_wishlists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, customerId };
    },
    onSuccess: ({ customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-wishlists', customerId], refetchType: 'all' });
      toast({
        title: 'Wishlist item removed',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing wishlist item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook to find customers looking for specific brand/category/size
export function useWishlistMatches(brandId?: number | null, category?: string | null, size?: string | null) {
  return useQuery({
    queryKey: ['wishlist-matches', brandId, category, size],
    queryFn: async () => {
      let query = supabase
        .from('v_wishlist_matches')
        .select('*')
        .eq('is_active', true);

      // Match by brand if provided
      if (brandId) {
        query = query.or(`brand_id.eq.${brandId},brand_id.is.null`);
      }

      // Match by category if provided
      if (category) {
        query = query.or(`category.eq.${category},category.is.null`);
      }

      // Match by size if provided
      if (size) {
        query = query.or(`size.eq.${size},size.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('Wishlist query results:', {
        brandId,
        category,
        size,
        rawResults: data?.length || 0,
        data: data
      });
      
      // Filter to only return matches where at least one criteria matches
      const matches = (data as WishlistMatch[]).filter(match => {
        const brandMatch = !brandId || !match.brand_id || match.brand_id === brandId;
        const categoryMatch = !category || !match.category || match.category === category;
        const sizeMatch = !size || !match.size || match.size === size;
        
        // At least one specific match required
        const hasSpecificMatch = 
          (brandId && match.brand_id === brandId) ||
          (category && match.category === category) ||
          (size && match.size === size);
        
        return brandMatch && categoryMatch && sizeMatch && hasSpecificMatch;
      });

      console.log('Filtered matches:', matches.length, matches);

      return matches;
    },
    enabled: !!(brandId || category || size),
  });
}

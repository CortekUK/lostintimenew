import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Brand {
  id: number;
  name: string;
  tier: 'luxury' | 'premium' | 'contemporary' | 'high_street' | null;
  logo_url: string | null;
  average_markup: number | null;
  created_at: string;
  updated_at: string;
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('tier', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Brand[];
    },
  });
}

export function useBrandsByTier() {
  const { data: brands, ...rest } = useBrands();
  
  const grouped = brands?.reduce((acc, brand) => {
    const tier = brand.tier || 'other';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(brand);
    return acc;
  }, {} as Record<string, Brand[]>);

  return { grouped, brands, ...rest };
}

export function useAddBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brand: { name: string; tier?: string | null }) => {
      const { data, error } = await supabase
        .from('brands')
        .insert([brand])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['filter-options'], refetchType: 'all' });
      toast({
        title: 'Brand added',
        description: 'The new brand has been added successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding brand',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Constants for condition grades
export const CONDITION_GRADES = [
  { value: 'new_with_tags', label: 'New with Tags (NWT)', description: 'Unworn, original tags attached' },
  { value: 'excellent', label: 'Excellent', description: 'Worn 1-2 times, no visible signs of wear' },
  { value: 'very_good', label: 'Very Good', description: 'Light wear, minor signs of use' },
  { value: 'good', label: 'Good', description: 'Moderate wear, visible but not distracting' },
  { value: 'fair', label: 'Fair', description: 'Significant wear, priced accordingly' },
] as const;

export const AUTHENTICATION_STATUSES = [
  { value: 'not_required', label: 'Not Required', description: 'Authentication not needed for this item' },
  { value: 'pending', label: 'Pending', description: 'Awaiting authentication' },
  { value: 'authenticated', label: 'Authenticated', description: 'Item has been authenticated' },
  { value: 'failed', label: 'Failed', description: 'Authentication failed' },
] as const;

export const BRAND_TIERS = [
  { value: 'luxury', label: 'Luxury', description: 'Top-tier designer brands' },
  { value: 'premium', label: 'Premium', description: 'High-quality designer brands' },
  { value: 'contemporary', label: 'Contemporary', description: 'Modern fashion brands' },
  { value: 'high_street', label: 'High Street', description: 'Mainstream fashion brands' },
] as const;

export type ConditionGrade = typeof CONDITION_GRADES[number]['value'];
export type AuthenticationStatus = typeof AUTHENTICATION_STATUSES[number]['value'];
export type BrandTier = typeof BRAND_TIERS[number]['value'];

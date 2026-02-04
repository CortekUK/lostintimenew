import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StaffCommissionRateHistory {
  id: number;
  staff_id: string;
  commission_rate: number;
  commission_basis: 'revenue' | 'profit';
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export function useStaffCommissionRateHistory(staffId?: string) {
  return useQuery({
    queryKey: ['staff-commission-rate-history', staffId],
    queryFn: async () => {
      let query = supabase
        .from('staff_commission_rate_history')
        .select('*')
        .order('effective_from', { ascending: false });

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StaffCommissionRateHistory[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useAllStaffRateHistory() {
  return useQuery({
    queryKey: ['all-staff-commission-rate-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_commission_rate_history')
        .select('*')
        .order('effective_from', { ascending: false });

      if (error) throw error;
      return data as StaffCommissionRateHistory[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

// Helper function to get the rate that was active for a specific sale date
export function getRateForSaleDate(
  rateHistory: StaffCommissionRateHistory[],
  staffId: string,
  saleDate: Date
): { rate: number; basis: 'revenue' | 'profit' } | null {
  // Filter to this staff member's history
  const staffHistory = rateHistory.filter(h => h.staff_id === staffId);
  
  if (staffHistory.length === 0) return null;

  // Find the rate that was active at the sale date
  // Rate is active if: effective_from <= saleDate AND (effective_to is null OR effective_to > saleDate)
  for (const history of staffHistory) {
    const effectiveFrom = new Date(history.effective_from);
    const effectiveTo = history.effective_to ? new Date(history.effective_to) : null;

    if (saleDate >= effectiveFrom && (effectiveTo === null || saleDate < effectiveTo)) {
      return {
        rate: Number(history.commission_rate),
        basis: history.commission_basis,
      };
    }
  }

  return null;
}

export function useCreateCommissionRateHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      staff_id: string;
      commission_rate: number;
      commission_basis: 'revenue' | 'profit';
      effective_from?: Date;
      notes?: string;
    }) => {
      // First, close any currently active rate for this staff member
      const { error: updateError } = await supabase
        .from('staff_commission_rate_history')
        .update({ effective_to: data.effective_from?.toISOString() || new Date().toISOString() })
        .eq('staff_id', data.staff_id)
        .is('effective_to', null);

      if (updateError) throw updateError;

      // Insert the new rate
      const { error: insertError } = await supabase
        .from('staff_commission_rate_history')
        .insert({
          staff_id: data.staff_id,
          commission_rate: data.commission_rate,
          commission_basis: data.commission_basis,
          effective_from: data.effective_from?.toISOString() || new Date().toISOString(),
          notes: data.notes || null,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-commission-rate-history'] });
      queryClient.invalidateQueries({ queryKey: ['all-staff-commission-rate-history'] });
      queryClient.invalidateQueries({ queryKey: ['staff-commission-overrides'] });
    },
    onError: (error) => {
      console.error('Error creating commission rate history:', error);
      toast.error('Failed to update commission rate');
    },
  });
}

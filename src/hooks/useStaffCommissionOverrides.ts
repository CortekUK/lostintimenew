import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StaffCommissionOverride {
  id: number;
  staff_id: string;
  commission_rate: number;
  commission_basis: 'revenue' | 'profit';
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useStaffCommissionOverrides() {
  return useQuery({
    queryKey: ['staff-commission-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_commission_overrides')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StaffCommissionOverride[];
    },
  });
}

export function useStaffCommissionOverride(staffId: string | undefined) {
  return useQuery({
    queryKey: ['staff-commission-override', staffId],
    queryFn: async () => {
      if (!staffId) return null;
      
      const { data, error } = await supabase
        .from('staff_commission_overrides')
        .select('*')
        .eq('staff_id', staffId)
        .maybeSingle();

      if (error) throw error;
      return data as StaffCommissionOverride | null;
    },
    enabled: !!staffId,
  });
}

export function useUpsertStaffCommissionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      staff_id: string;
      commission_rate: number;
      commission_basis: 'revenue' | 'profit';
      notes?: string;
    }) => {
      // First, close any currently active rate in history
      const { error: historyUpdateError } = await supabase
        .from('staff_commission_rate_history')
        .update({ effective_to: new Date().toISOString() })
        .eq('staff_id', data.staff_id)
        .is('effective_to', null);

      if (historyUpdateError) throw historyUpdateError;

      // Insert new rate into history
      const { error: historyInsertError } = await supabase
        .from('staff_commission_rate_history')
        .insert({
          staff_id: data.staff_id,
          commission_rate: data.commission_rate,
          commission_basis: data.commission_basis,
          effective_from: new Date().toISOString(),
          notes: data.notes || null,
        });

      if (historyInsertError) throw historyInsertError;

      // Update current override (for quick lookups of current rate)
      const { error } = await supabase
        .from('staff_commission_overrides')
        .upsert({
          staff_id: data.staff_id,
          commission_rate: data.commission_rate,
          commission_basis: data.commission_basis,
          notes: data.notes || null,
        }, {
          onConflict: 'staff_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-commission-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['staff-commission-override'] });
      queryClient.invalidateQueries({ queryKey: ['staff-commission-rate-history'] });
      queryClient.invalidateQueries({ queryKey: ['all-staff-commission-rate-history'] });
      toast.success('Commission rate updated (applies to new sales)');
    },
    onError: (error) => {
      console.error('Error updating commission override:', error);
      toast.error('Failed to update commission rate');
    },
  });
}

export function useDeleteStaffCommissionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from('staff_commission_overrides')
        .delete()
        .eq('staff_id', staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-commission-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['staff-commission-override'] });
      toast.success('Commission rate reset to global default');
    },
    onError: (error) => {
      console.error('Error deleting commission override:', error);
      toast.error('Failed to reset commission rate');
    },
  });
}

export function useUpdateSaleCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sale_id: number;
      commission_override: number | null;
      commission_override_reason: string | null;
    }) => {
      const { error } = await supabase
        .from('sales')
        .update({
          commission_override: data.commission_override,
          commission_override_reason: data.commission_override_reason,
        })
        .eq('id', data.sale_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sold-items'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-details'] });
      toast.success('Sale commission updated');
    },
    onError: (error) => {
      console.error('Error updating sale commission:', error);
      toast.error('Failed to update sale commission');
    },
  });
}

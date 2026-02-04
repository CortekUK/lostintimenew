import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

export interface CommissionPayment {
  id: number;
  staff_id: string;
  period_start: string;
  period_end: string;
  sales_count: number;
  revenue_total: number;
  profit_total: number;
  commission_rate: number;
  commission_basis: 'revenue' | 'profit';
  commission_amount: number;
  payment_method: string;
  notes: string | null;
  paid_by: string | null;
  paid_at: string;
  created_at: string;
  staff?: { full_name: string | null; email: string };
  paid_by_profile?: { full_name: string | null };
}

interface UseCommissionPaymentsParams {
  staffId?: string;
  periodStart?: string;
  periodEnd?: string;
}

export function useCommissionPayments(params: UseCommissionPaymentsParams = {}) {
  const { user } = useAuth();
  const { isOwner, isManager } = usePermissions();

  return useQuery({
    queryKey: ['commission-payments', params, user?.id, isOwner, isManager],
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    queryFn: async () => {
      let query = supabase
        .from('commission_payments')
        .select(`
          *,
          staff:profiles!commission_payments_staff_id_fkey(full_name, email),
          paid_by_profile:profiles!commission_payments_paid_by_fkey(full_name)
        `)
        .order('paid_at', { ascending: false });

      // Staff can only see their own commission payments
      if (!isOwner && !isManager) {
        query = query.eq('staff_id', user?.id);
      } else if (params.staffId) {
        query = query.eq('staff_id', params.staffId);
      }

      if (params.periodStart && params.periodEnd) {
        // Find payments that overlap with the requested period
        query = query
          .lte('period_start', params.periodEnd)
          .gte('period_end', params.periodStart);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CommissionPayment[];
    },
    enabled: !!user
  });
}

export function usePeriodPaymentTotal(staffId: string, periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: ['commission-payment-total', staffId, periodStart, periodEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_payments')
        .select('commission_amount')
        .eq('staff_id', staffId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd);

      if (error) throw error;

      const total = (data || []).reduce((sum, p) => sum + Number(p.commission_amount), 0);
      return total;
    },
    enabled: !!staffId && !!periodStart && !!periodEnd
  });
}

interface RecordPaymentParams {
  staffId: string;
  staffName: string;
  periodStart: string;
  periodEnd: string;
  salesCount: number;
  revenueTotal: number;
  profitTotal: number;
  commissionRate: number;
  commissionBasis: 'revenue' | 'profit';
  commissionAmount: number;
  paymentMethod: string;
  notes?: string;
}

export function useRecordCommissionPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordPaymentParams) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // 1. Record the commission payment
      const { data, error } = await supabase
        .from('commission_payments')
        .insert({
          staff_id: params.staffId,
          period_start: params.periodStart,
          period_end: params.periodEnd,
          sales_count: params.salesCount,
          revenue_total: params.revenueTotal,
          profit_total: params.profitTotal,
          commission_rate: params.commissionRate,
          commission_basis: params.commissionBasis,
          commission_amount: params.commissionAmount,
          payment_method: params.paymentMethod,
          notes: params.notes || null,
          paid_by: userData.user.id
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Also create an expense entry for P&L tracking
      // Map commission payment methods to expenses payment_method enum
      const expensePaymentMethod = params.paymentMethod === 'bank_transfer' ? 'transfer' 
        : params.paymentMethod === 'cheque' ? 'other'
        : params.paymentMethod === 'cash' ? 'cash'
        : 'other';
      
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: `Commission payment: ${params.staffName} (${params.periodStart} to ${params.periodEnd})`,
          category: 'commission',
          amount: params.commissionAmount,
          amount_inc_vat: params.commissionAmount,
          is_cogs: false,
          payment_method: expensePaymentMethod,
          incurred_at: new Date().toISOString(),
          staff_id: userData.user.id
        });

      if (expenseError) {
        console.error('Failed to create expense for commission:', expenseError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-payments'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['commission-payment-total'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['sold-items-report'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['staff-commission-overrides'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['consolidated-pnl'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['expenses'], refetchType: 'all' });
    }
  });
}

export function useDeleteCommissionPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: number) => {
      // Get the payment details first to find the matching expense
      const { data: payment } = await supabase
        .from('commission_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      // Delete the commission payment
      const { error } = await supabase
        .from('commission_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      // Try to delete the matching expense (best effort)
      if (payment) {
        await supabase
          .from('expenses')
          .delete()
          .eq('category', 'commission')
          .eq('amount', payment.commission_amount)
          .ilike('description', `%${payment.period_start}%`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-payments'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['commission-payment-total'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['sold-items-report'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['staff-commission-overrides'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['consolidated-pnl'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['expenses'], refetchType: 'all' });
    }
  });
}

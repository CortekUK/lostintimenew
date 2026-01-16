import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface DateRange {
  from?: Date;
  to?: Date;
}

export function useConsolidatedPnL(dateRange: DateRange) {
  return useQuery({
    queryKey: ['consolidated-pnl', dateRange],
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) {
        return null;
      }

      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd 23:59:59');

      // Get P&L daily data
      const { data: pnlDaily, error: pnlError } = await supabase
        .from('v_pnl_daily')
        .select('*')
        .gte('day', fromDate)
        .lte('day', toDate)
        .order('day', { ascending: true });

      if (pnlError) throw pnlError;

      // Get expenses by category (use amount_inc_vat if available, otherwise amount)
      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('category, amount, amount_inc_vat')
        .eq('is_cogs', false)
        .gte('incurred_at', fromDate)
        .lte('incurred_at', toDate);

      if (expenseError) throw expenseError;

      // Get unsettled consignments
      const { data: unsettled, error: unsettledError } = await supabase
        .from('v_consign_unsettled')
        .select('*');

      if (unsettledError) throw unsettledError;

      // Get transaction counts (exclude voided)
      const { data: salesCount, error: salesError } = await supabase
        .from('sales')
        .select('id, sold_at')
        .eq('is_voided', false)
        .gte('sold_at', fromDate)
        .lte('sold_at', toDate);

      if (salesError) throw salesError;

      // Get total items sold (exclude voided)
      const { data: itemsCount, error: itemsError } = await supabase
        .from('sale_items')
        .select('quantity, sales!inner(sold_at, is_voided)')
        .eq('sales.is_voided', false)
        .gte('sales.sold_at', fromDate)
        .lte('sales.sold_at', toDate);

      if (itemsError) throw itemsError;

      // Calculate totals
      const revenue = pnlDaily?.reduce((sum, day) => sum + Number(day.revenue || 0), 0) || 0;
      const cogs = pnlDaily?.reduce((sum, day) => sum + Number(day.cogs || 0), 0) || 0;
      const grossProfit = revenue - cogs;

      // Group expenses by category (use amount_inc_vat if available)
      const expensesByCategory = expenses?.reduce((acc: any[], expense) => {
        const expenseAmount = Number(expense.amount_inc_vat || expense.amount);
        const existing = acc.find(e => e.category === expense.category);
        if (existing) {
          existing.amount += expenseAmount;
        } else {
          acc.push({
            category: expense.category,
            amount: expenseAmount
          });
        }
        return acc;
      }, []) || [];

      const operatingExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.amount, 0);
      const netProfit = grossProfit - operatingExpenses;

      // Prepare chart data
      const chartData = pnlDaily?.map(day => ({
        name: format(new Date(day.day), 'MMM dd'),
        revenue: Number(day.revenue || 0),
        grossProfit: Number(day.gross_profit || 0)
      })) || [];

      const totalItems = itemsCount?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;

      return {
        revenue,
        cogs,
        grossProfit,
        operatingExpenses,
        netProfit,
        chartData,
        expensesByCategory,
        unsettledConsignments: unsettled || [],
        transactionCount: salesCount?.length || 0,
        totalItems
      };
    },
    enabled: !!dateRange.from && !!dateRange.to
  });
}
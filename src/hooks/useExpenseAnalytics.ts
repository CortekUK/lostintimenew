import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, startOfYear, subYears, format, eachMonthOfInterval, subMonths } from 'date-fns';

export interface ExpenseFilters {
  dateRange?: { from: Date; to: Date };
  categories?: string[];
  suppliers?: number[];
  staffMembers?: string[];
  paymentMethods?: string[];
  minAmount?: number;
  maxAmount?: number;
  isCogs?: boolean;
}

export const useFilteredExpenses = (filters?: ExpenseFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expenses', 'filtered', filters],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          staff:profiles(full_name, email),
          supplier:suppliers(name),
          template:expense_templates(id, frequency, next_due_date)
        `)
        .order('incurred_at', { ascending: false });

      if (filters?.dateRange) {
        query = query
          .gte('incurred_at', filters.dateRange.from.toISOString())
          .lte('incurred_at', filters.dateRange.to.toISOString());
      }

      if (filters?.categories && filters.categories.length > 0) {
        query = query.in('category', filters.categories as any);
      }

      if (filters?.suppliers && filters.suppliers.length > 0) {
        query = query.in('supplier_id', filters.suppliers);
      }

      if (filters?.staffMembers && filters.staffMembers.length > 0) {
        query = query.in('staff_id', filters.staffMembers);
      }

      if (filters?.paymentMethods && filters.paymentMethods.length > 0) {
        query = query.in('payment_method', filters.paymentMethods);
      }

      if (filters?.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }

      if (filters?.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }

      if (filters?.isCogs !== undefined) {
        query = query.eq('is_cogs', filters.isCogs);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

export const useCategoryBreakdown = (filters?: ExpenseFilters) => {
  const { data: expenses = [] } = useFilteredExpenses(filters);

  return useMemo(() => {
    const breakdown = expenses.reduce((acc, expense) => {
      const category = expense.category || 'other';
      if (!acc[category]) {
        acc[category] = { category, total: 0, count: 0 };
      }
      acc[category].total += Number(expense.amount);
      acc[category].count += 1;
      return acc;
    }, {} as Record<string, { category: string; total: number; count: number }>);

    const totalAmount = Object.values(breakdown).reduce((sum, item) => sum + item.total, 0);

    const data = Object.values(breakdown).map(item => ({
      ...item,
      percentage: totalAmount > 0 ? (item.total / totalAmount) * 100 : 0,
    }));

    return data.sort((a, b) => b.total - a.total);
  }, [expenses]);
};

export const useMonthlyTrends = (filters?: ExpenseFilters) => {
  const { data: expenses = [] } = useFilteredExpenses(filters);

  return useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now,
    });

    const trends = months.map(month => {
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.incurred_at);
        return (
          expenseDate.getMonth() === month.getMonth() &&
          expenseDate.getFullYear() === month.getFullYear()
        );
      });

      const operating = monthExpenses
        .filter(e => !e.is_cogs)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const cogs = monthExpenses
        .filter(e => e.is_cogs)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        month: format(month, 'MMM yyyy'),
        operating,
        cogs,
        total: operating + cogs,
      };
    });

    return trends;
  }, [expenses]);
};

export const useLargestExpense = (period: 'month' | 'year' = 'month') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expenses', 'largest', period],
    queryFn: async () => {
      const now = new Date();
      const startDate = period === 'month' ? startOfMonth(now) : startOfYear(now);

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .gte('incurred_at', startDate.toISOString())
        .order('amount', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

export const useYearOverYearComparison = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expenses', 'yoy-comparison'],
    queryFn: async () => {
      const now = new Date();
      const thisYearStart = startOfYear(now);
      const lastYearStart = startOfYear(subYears(now, 1));
      const lastYearEnd = subYears(thisYearStart, 1);

      const { data: thisYearData, error: thisYearError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('incurred_at', thisYearStart.toISOString());

      if (thisYearError) throw thisYearError;

      const { data: lastYearData, error: lastYearError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('incurred_at', lastYearStart.toISOString())
        .lt('incurred_at', lastYearEnd.toISOString());

      if (lastYearError) throw lastYearError;

      const thisYearTotal = thisYearData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const lastYearTotal = lastYearData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const percentageChange =
        lastYearTotal > 0 ? ((thisYearTotal - lastYearTotal) / lastYearTotal) * 100 : 0;

      return {
        thisYear: thisYearTotal,
        lastYear: lastYearTotal,
        percentageChange,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

export const useExpenseStats = (filters?: ExpenseFilters) => {
  const { data: expenses = [] } = useFilteredExpenses(filters);

  return useMemo(() => {
    const now = new Date();

    const thisMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.incurred_at);
      return (
        expenseDate.getMonth() === now.getMonth() &&
        expenseDate.getFullYear() === now.getFullYear()
      );
    });

    const thisYearExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.incurred_at);
      return expenseDate.getFullYear() === now.getFullYear();
    });

    const monthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const yearTotal = thisYearExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const avgMonthly = yearTotal / Math.max(1, now.getMonth() + 1);

    return {
      thisMonthTotal: monthTotal,
      thisYearTotal: yearTotal,
      averageMonthly: avgMonthly,
      totalRecords: expenses.length,
      thisMonthCount: thisMonthExpenses.length,
      thisYearCount: thisYearExpenses.length,
    };
  }, [expenses]);
};

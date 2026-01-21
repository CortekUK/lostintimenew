import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useCommissionPayments } from '@/hooks/useCommissionPayments';
import { useStaffCommissionOverrides } from '@/hooks/useStaffCommissionOverrides';
import { useSoldItemsReport } from '@/hooks/useDatabase';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

export interface StaffMonthlyData {
  staffId: string;
  staffName: string;
  salesCount: number;
  revenue: number;
  profit: number;
  commissionOwed: number;
  commissionPaid: number;
  outstanding: number;
  status: 'paid' | 'partial' | 'unpaid';
  effectiveRate: number;
  effectiveBasis: 'revenue' | 'profit';
}

export interface MonthlyCommission {
  month: string; // "2026-01"
  monthLabel: string; // "January 2026"
  periodStart: string; // "2026-01-01"
  periodEnd: string; // "2026-01-31"
  staffData: StaffMonthlyData[];
  totals: {
    salesCount: number;
    revenue: number;
    profit: number;
    owed: number;
    paid: number;
    outstanding: number;
  };
}

interface UseMonthlyCommissionOptions {
  staffId?: string; // Filter to specific staff member
  monthsBack?: number; // How many months to look back (default 12)
}

export function useMonthlyCommission(options: UseMonthlyCommissionOptions = {}) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { data: soldItemsData = [], isLoading: soldItemsLoading } = useSoldItemsReport();
  const { data: allPayments = [], isLoading: paymentsLoading } = useCommissionPayments({
    staffId: options.staffId
  });
  const { data: overrides = [] } = useStaffCommissionOverrides();

  const commissionRate = settings.commissionSettings?.defaultRate ?? 5;
  const commissionBasis = settings.commissionSettings?.calculationBasis ?? 'revenue';
  const commissionEnabled = settings.commissionSettings?.enabled ?? true;

  const monthsBack = options.monthsBack ?? 12;

  // Generate list of months to display
  const months = useMemo(() => {
    const result: { month: string; label: string; start: string; end: string }[] = [];
    const now = new Date();
    
    for (let i = 0; i < monthsBack; i++) {
      const date = subMonths(now, i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      result.push({
        month: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
        start: format(monthStart, 'yyyy-MM-dd'),
        end: format(monthEnd, 'yyyy-MM-dd'),
      });
    }
    
    return result;
  }, [monthsBack]);

  // Get override for a specific staff member
  const getStaffOverride = (staffId: string) => {
    return overrides.find(o => o.staff_id === staffId);
  };

  // Calculate monthly commission data
  const monthlyData = useMemo((): MonthlyCommission[] => {
    if (!soldItemsData || !Array.isArray(soldItemsData)) return [];

    return months.map(monthInfo => {
      // Filter items for this month
      const monthItems = soldItemsData.filter((item: any) => {
        if (!item || typeof item !== 'object') return false;
        if (item?.products?.is_trade_in === true) return false;
        
        const saleDate = new Date(item.sold_at);
        if (isNaN(saleDate.getTime())) return false;
        
        const monthStart = new Date(monthInfo.start);
        const monthEnd = new Date(monthInfo.end);
        monthEnd.setHours(23, 59, 59, 999);
        
        // Filter by staffId if provided
        if (options.staffId) {
          const itemStaffId = item.sales?.staff_id;
          if (itemStaffId !== options.staffId) return false;
        }
        
        return saleDate >= monthStart && saleDate <= monthEnd;
      });

      // Aggregate by staff
      const byStaff = new Map<string, {
        staffId: string;
        staffName: string;
        salesCount: number;
        saleIds: Set<number>;
        revenue: number;
        profit: number;
      }>();

      monthItems.forEach((item: any) => {
        const staffId = item.sales?.staff_id || 'unknown';
        const staffName = item.sales?.staff_member_name || item.sales?.profiles?.full_name || 'Unknown';
        
        if (!byStaff.has(staffId)) {
          byStaff.set(staffId, {
            staffId,
            staffName,
            salesCount: 0,
            saleIds: new Set(),
            revenue: 0,
            profit: 0
          });
        }
        
        const entry = byStaff.get(staffId)!;
        entry.saleIds.add(item.sale_id);
        entry.revenue += item.line_revenue || 0;
        entry.profit += item.line_gross_profit || 0;
      });

      // Get payments for this month
      const monthPayments = allPayments.filter(p => 
        p.period_start === monthInfo.start && p.period_end === monthInfo.end
      );

      // Calculate commission and payment status for each staff
      const staffData: StaffMonthlyData[] = Array.from(byStaff.values()).map(staff => {
        const override = getStaffOverride(staff.staffId);
        const effectiveRate = override?.commission_rate ?? commissionRate;
        const effectiveBasis = (override?.commission_basis ?? commissionBasis) as 'revenue' | 'profit';
        
        const commissionOwed = commissionEnabled 
          ? (effectiveBasis === 'profit' 
              ? staff.profit * (effectiveRate / 100)
              : staff.revenue * (effectiveRate / 100))
          : 0;
        
        // Sum payments for this staff in this month
        const staffPayments = monthPayments.filter(p => p.staff_id === staff.staffId);
        const commissionPaid = staffPayments.reduce((sum, p) => sum + Number(p.commission_amount), 0);
        const outstanding = Math.max(0, commissionOwed - commissionPaid);
        
        let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        if (commissionPaid >= commissionOwed && commissionOwed > 0) {
          status = 'paid';
        } else if (commissionPaid > 0) {
          status = 'partial';
        }
        
        return {
          staffId: staff.staffId,
          staffName: staff.staffName,
          salesCount: staff.saleIds.size,
          revenue: staff.revenue,
          profit: staff.profit,
          commissionOwed,
          commissionPaid,
          outstanding,
          status,
          effectiveRate,
          effectiveBasis,
        };
      }).sort((a, b) => b.commissionOwed - a.commissionOwed);

      // Calculate totals
      const totals = staffData.reduce((acc, staff) => ({
        salesCount: acc.salesCount + staff.salesCount,
        revenue: acc.revenue + staff.revenue,
        profit: acc.profit + staff.profit,
        owed: acc.owed + staff.commissionOwed,
        paid: acc.paid + staff.commissionPaid,
        outstanding: acc.outstanding + staff.outstanding,
      }), { salesCount: 0, revenue: 0, profit: 0, owed: 0, paid: 0, outstanding: 0 });

      return {
        month: monthInfo.month,
        monthLabel: monthInfo.label,
        periodStart: monthInfo.start,
        periodEnd: monthInfo.end,
        staffData,
        totals,
      };
    });
  }, [soldItemsData, months, allPayments, commissionRate, commissionBasis, commissionEnabled, overrides, options.staffId]);

  // Calculate grand totals across all months
  const grandTotals = useMemo(() => {
    return monthlyData.reduce((acc, month) => ({
      salesCount: acc.salesCount + month.totals.salesCount,
      revenue: acc.revenue + month.totals.revenue,
      profit: acc.profit + month.totals.profit,
      owed: acc.owed + month.totals.owed,
      paid: acc.paid + month.totals.paid,
      outstanding: acc.outstanding + month.totals.outstanding,
    }), { salesCount: 0, revenue: 0, profit: 0, owed: 0, paid: 0, outstanding: 0 });
  }, [monthlyData]);

  // Get current month summary (first item since months are ordered newest first)
  const currentMonth = monthlyData[0] || null;

  return {
    monthlyData,
    grandTotals,
    currentMonth,
    isLoading: soldItemsLoading || paymentsLoading,
    commissionEnabled,
    commissionRate,
    commissionBasis,
  };
}

// Helper to get a single staff member's monthly data
export function useStaffMonthlyCommission(staffId: string) {
  return useMonthlyCommission({ staffId });
}

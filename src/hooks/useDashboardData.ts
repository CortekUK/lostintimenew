import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface TodayStats {
  sales: number;
  transactions: number;
  itemsSold: number;
  totalProducts: number;
  totalInventoryValue: number;
  restockAlerts: number;
  grossProfit: number;
  yesterdayComparison: {
    sales: number;
    transactions: number;
    itemsSold: number;
    grossProfit: number;
  };
}

export interface RecentSale {
  id: number;
  sold_at: string;
  total: number;
  payment: string;
  staff_name: string | null;
  products: Array<{
    name: string;
    quantity: number;
  }>;
}

export interface TrendsPeriod {
  period: '7d' | '30d' | '90d';
  label: string;
}

export interface TrendsData {
  day: string;
  revenue: number;
  gross_profit: number;
}

export interface ExpenseSnapshot {
  weeklyTotal: number;
  topCategory: string | null;
  categoryAmount: number;
}

export interface StaffActivity {
  lastSale: {
    staff_name: string | null;
    sold_at: string;
    sale_id: number;
  } | null;
  recentSales: Array<{
    id: number;
    sold_at: string;
    total: number;
    staff_name: string | null;
    staff_initials: string;
  }>;
}

export interface BusinessInsight {
  type: 'top_seller' | 'avg_margin' | 'best_category' | 'conversion_rate' | 'avg_transaction' | 'units_sold';
  label: string;
  value: string;
  link: string;
  trend?: number;
}

// Today's Overview Hook
export const useTodayStats = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['today-stats'],
    queryFn: async (): Promise<TodayStats> => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const yesterdayStart = startOfDay(subDays(now, 1));
      const yesterdayEnd = endOfDay(subDays(now, 1));
      
      // Today's sales (exclude voided)
      const { data: todaySales } = await supabase
        .from('sales')
        .select('total')
        .eq('is_voided', false)
        .gte('sold_at', todayStart.toISOString())
        .lte('sold_at', todayEnd.toISOString());
      
      // Yesterday's sales (exclude voided)
      const { data: yesterdaySales } = await supabase
        .from('sales')
        .select('total')
        .eq('is_voided', false)
        .gte('sold_at', yesterdayStart.toISOString())
        .lte('sold_at', yesterdayEnd.toISOString());
      
      // Today's items sold (exclude voided)
      const { data: todayItems } = await supabase
        .from('sale_items')
        .select('quantity, sales!inner(sold_at, is_voided)')
        .eq('sales.is_voided', false)
        .gte('sales.sold_at', todayStart.toISOString())
        .lte('sales.sold_at', todayEnd.toISOString());
      
      // Yesterday's items sold (exclude voided)
      const { data: yesterdayItems } = await supabase
        .from('sale_items')
        .select('quantity, sales!inner(sold_at, is_voided)')
        .eq('sales.is_voided', false)
        .gte('sales.sold_at', yesterdayStart.toISOString())
        .lte('sales.sold_at', yesterdayEnd.toISOString());

      // Today's gross profit
      const { data: todayProfit } = await supabase
        .from('v_sales_with_profit')
        .select('line_gross_profit')
        .gte('sold_at', todayStart.toISOString())
        .lte('sold_at', todayEnd.toISOString());

      // Yesterday's gross profit
      const { data: yesterdayProfit } = await supabase
        .from('v_sales_with_profit')
        .select('line_gross_profit')
        .gte('sold_at', yesterdayStart.toISOString())
        .lte('sold_at', yesterdayEnd.toISOString());
      
      const todayTotal = todaySales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
      const yesterdayTotal = yesterdaySales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
      const todayItemsTotal = todayItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const yesterdayItemsTotal = yesterdayItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const todayGrossProfit = todayProfit?.reduce((sum, item) => sum + Number(item.line_gross_profit), 0) || 0;
      const yesterdayGrossProfit = yesterdayProfit?.reduce((sum, item) => sum + Number(item.line_gross_profit), 0) || 0;
      
      // Get additional dashboard stats
      const [productsCount, inventoryValue, restockAlertCount] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('v_inventory_value').select('inventory_value'),
        supabase.from('v_stock_status').select('product_id', { count: 'exact', head: true })
          .or('is_out_of_stock.eq.true,is_at_risk.eq.true')
      ]);
      
      const totalInventoryValue = inventoryValue.data?.reduce((sum, item) => sum + Number(item.inventory_value || 0), 0) || 0;
      
      return {
        sales: todayTotal,
        transactions: todaySales?.length || 0,
        itemsSold: todayItemsTotal,
        totalProducts: productsCount.count || 0,
        totalInventoryValue,
        restockAlerts: restockAlertCount.count || 0,
        grossProfit: todayGrossProfit,
        yesterdayComparison: {
          sales: yesterdayTotal,
          transactions: yesterdaySales?.length || 0,
          itemsSold: yesterdayItemsTotal,
          grossProfit: yesterdayGrossProfit,
        },
      };
    },
    enabled: !!user && !!session,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};

// Recent Sales Hook
export const useRecentSales = (limit: number = 5) => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['recent-sales', limit],
    queryFn: async (): Promise<RecentSale[]> => {
      const { data: sales, error } = await supabase
        .from('sales')
        .select(`
          id, sold_at, total, payment, staff_member_name,
          profiles!fk_sales_staff_id(full_name)
        `)
        .eq('is_voided', false)
        .order('sold_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // Get sale items for each sale
      const salesWithProducts = await Promise.all(
        (sales || []).map(async (sale) => {
          const { data: items } = await supabase
            .from('sale_items')
            .select(`
              quantity,
              products:product_id(name)
            `)
            .eq('sale_id', sale.id);
          
          return {
            ...sale,
            staff_name: (sale as any).staff_member_name || (sale.profiles as any)?.full_name || null,
            products: items?.map(item => ({
              name: item.products?.name || 'Unknown',
              quantity: item.quantity,
            })) || [],
          };
        })
      );
      
      return salesWithProducts;
    },
    enabled: !!user && !!session,
    staleTime: 1000 * 60, // 1 minute cache
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
};

// Trends Data Hook
export const useTrendsData = (period: '7d' | '30d' | '90d' = '30d') => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['trends-data', period],
    queryFn: async (): Promise<TrendsData[]> => {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const fromDate = subDays(new Date(), days);
      
      const { data, error } = await supabase
        .from('v_pnl_daily')
        .select('day, revenue, gross_profit')
        .gte('day', fromDate.toISOString())
        .order('day', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        day: format(new Date(item.day), 'MMM dd'),
        revenue: Number(item.revenue) || 0,
        gross_profit: Number(item.gross_profit) || 0,
      }));
    },
    enabled: !!user && !!session,
  });
};

// Expense Snapshot Hook
export const useExpenseSnapshot = (period: 'week' | 'month' | 'quarter' | 'year' = 'week') => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['expense-snapshot', period],
    queryFn: async (): Promise<ExpenseSnapshot> => {
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      switch (period) {
        case 'month':
          periodStart = startOfMonth(now);
          periodEnd = endOfMonth(now);
          break;
        case 'quarter':
          periodStart = subMonths(now, 3);
          periodEnd = now;
          break;
        case 'year':
          periodStart = subMonths(now, 12);
          periodEnd = now;
          break;
        case 'week':
        default:
          periodStart = startOfWeek(now);
          periodEnd = endOfWeek(now);
      }
      
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('amount, category')
        .eq('is_cogs', false)
        .gte('incurred_at', periodStart.toISOString())
        .lte('incurred_at', periodEnd.toISOString());
      
      if (error) throw error;
      
      const weeklyTotal = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      
      // Calculate top category
      const categoryTotals = expenses?.reduce((acc, exp) => {
        const category = exp.category || 'other';
        acc[category] = (acc[category] || 0) + Number(exp.amount);
        return acc;
      }, {} as Record<string, number>) || {};
      
      const topCategory = Object.entries(categoryTotals).reduce(
        (max, [category, amount]) => amount > max.amount ? { category, amount } : max,
        { category: null as string | null, amount: 0 }
      );
      
      return {
        weeklyTotal,
        topCategory: topCategory.category,
        categoryAmount: topCategory.amount,
      };
    },
    enabled: !!user && !!session,
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });
};

// Staff Activity Hook
export const useStaffActivity = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['staff-activity'],
    queryFn: async (): Promise<StaffActivity> => {
      // Get last sale (exclude voided)
      const { data: lastSale } = await supabase
        .from('sales')
        .select(`
          id, sold_at, staff_member_name,
          profiles:staff_id(full_name)
        `)
        .eq('is_voided', false)
        .order('sold_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Get recent sales with staff info (exclude voided)
      const { data: recentSales } = await supabase
        .from('sales')
        .select(`
          id, sold_at, total, staff_member_name,
          profiles!fk_sales_staff_id(full_name)
        `)
        .eq('is_voided', false)
        .order('sold_at', { ascending: false })
        .limit(5);
      
      return {
        lastSale: lastSale ? {
          staff_name: (lastSale as any).staff_member_name || (lastSale.profiles as any)?.full_name || null,
          sold_at: lastSale.sold_at,
          sale_id: lastSale.id,
        } : null,
        recentSales: (recentSales || []).map(sale => {
          const staffName = (sale as any).staff_member_name || (sale.profiles as any)?.full_name || null;
          return {
            id: sale.id,
            sold_at: sale.sold_at,
            total: Number(sale.total),
            staff_name: staffName,
            staff_initials: staffName
              ? staffName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
              : 'U',
          };
        }),
      };
    },
    enabled: !!user && !!session,
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes
  });
};

// Business Insights Hook
export const useBusinessInsights = (period: '7d' | '30d' | '90d' = '30d') => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['business-insights', period],
    queryFn: async (): Promise<BusinessInsight[]> => {
      const insights: BusinessInsight[] = [];
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const fromDate = subDays(new Date(), days);
      
      // Top seller - Get product sales data
      const { data: topSellerData } = await supabase
        .from('v_sales_with_profit')
        .select('product_id, line_revenue')
        .gte('sold_at', fromDate.toISOString())
        .order('line_revenue', { ascending: false })
        .limit(1);
      
      if (topSellerData && topSellerData.length > 0) {
        const topSeller = topSellerData[0];
        
        // Get product name
        const { data: productData } = await supabase
          .from('products')
          .select('name, internal_sku')
          .eq('id', topSeller.product_id)
          .single();
        
        const productName = productData?.name || 'Unknown Product';
        
        insights.push({
          type: 'top_seller',
          label: `Top Selling Product`,
          value: productName,
          link: `/products?id=${topSeller.product_id}`,
        });
      }
      
      // Average margin
      const { data: marginData } = await supabase
        .from('v_sales_with_profit')
        .select('line_revenue, line_cogs')
        .gte('sold_at', fromDate.toISOString());
      
      if (marginData && marginData.length > 0) {
        const totalRevenue = marginData.reduce((sum, item) => sum + Number(item.line_revenue), 0);
        const totalCogs = marginData.reduce((sum, item) => sum + Number(item.line_cogs), 0);
        const avgMargin = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;
        
        insights.push({
          type: 'avg_margin',
          label: `Average Profit Margin`,
          value: `${avgMargin.toFixed(1)}%`,
          link: '/reports',
        });
      }

      // Best performing category
      const { data: categoryData } = await supabase
        .from('v_sales_with_profit')
        .select('product_id, line_revenue')
        .gte('sold_at', fromDate.toISOString());

      if (categoryData && categoryData.length > 0) {
        const productIds = [...new Set(categoryData.map(item => item.product_id))];
        const { data: products } = await supabase
          .from('products')
          .select('id, category')
          .in('id', productIds);

        const categoryRevenue: Record<string, number> = {};
        categoryData.forEach(sale => {
          const product = products?.find(p => p.id === sale.product_id);
          const category = product?.category || 'Uncategorised';
          categoryRevenue[category] = (categoryRevenue[category] || 0) + Number(sale.line_revenue);
        });

        const topCategory = Object.entries(categoryRevenue).sort(([, a], [, b]) => b - a)[0];
        if (topCategory) {
          insights.push({
            type: 'best_category',
            label: 'Top Category',
            value: topCategory[0],
            link: '/products?category=' + encodeURIComponent(topCategory[0]),
          });
        }
      }

      // Average transaction value (exclude voided)
      const { data: salesData } = await supabase
        .from('sales')
        .select('total')
        .eq('is_voided', false)
        .gte('sold_at', fromDate.toISOString());

      if (salesData && salesData.length > 0) {
        const avgTransaction = salesData.reduce((sum, sale) => sum + Number(sale.total), 0) / salesData.length;
        insights.push({
          type: 'avg_transaction',
          label: 'Avg Transaction Value',
          value: `£${avgTransaction.toFixed(2)}`,
          link: '/sales',
        });
      }

      // Total units sold (exclude voided)
      const { data: itemsData } = await supabase
        .from('sale_items')
        .select('quantity, sales!inner(sold_at, is_voided)')
        .eq('sales.is_voided', false)
        .gte('sales.sold_at', fromDate.toISOString());

      if (itemsData) {
        const totalUnits = itemsData.reduce((sum, item) => sum + item.quantity, 0);
        insights.push({
          type: 'units_sold',
          label: 'Total Units Sold',
          value: totalUnits.toString(),
          link: '/sales',
        });
      }
      
      return insights;
    },
    enabled: !!user && !!session,
    refetchInterval: 15 * 60 * 1000, // Refresh every 15 minutes
  });
};
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, TrendingUp, Package, PoundSterling, Target, Star, BarChart3, Search, Clock, ShieldCheck } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import { SimpleBarChart, SimplePieChart } from './SimpleChart';
import { PageLoadingState } from '@/components/ui/loading-states';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useBrands, BRAND_TIERS } from '@/hooks/useBrands';

interface BrandAnalyticsData {
  brand_id: number | null;
  brand_name: string;
  brand_tier: string | null;
  units_sold: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
  avg_days_to_sell: number;
  authenticated_count: number;
}

interface BrandAnalyticsReportProps {
  className?: string;
}

export function BrandAnalyticsReport({ className }: BrandAnalyticsReportProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { data: brands } = useBrands();

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['brand-analytics', dateRange],
    queryFn: async () => {
      // Get sales data with product info within date range
      let salesQuery = supabase
        .from('v_pnl_px_consign')
        .select('*');

      if (dateRange?.from) {
        salesQuery = salesQuery.gte('sold_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        salesQuery = salesQuery.lte('sold_at', dateRange.to.toISOString());
      }

      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      // Get product details with brand info
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id, 
          brand_id,
          authentication_status,
          created_at,
          brand:brands!brand_id(id, name, tier)
        `);
      
      if (productsError) throw productsError;

      // Create a map of product details
      const productMap = new Map(products?.map(p => [p.id, p]));

      // Aggregate by brand
      const brandAgg = new Map<number | null, BrandAnalyticsData>();
      
      salesData?.forEach(sale => {
        const product = productMap.get(sale.product_id);
        const brandId = product?.brand_id || null;
        const brand = product?.brand as any;
        const brandName = brand?.name || 'Unbranded';
        const brandTier = brand?.tier || null;
        
        // Calculate days to sell
        const createdAt = product?.created_at ? new Date(product.created_at) : null;
        const soldAt = sale.sold_at ? new Date(sale.sold_at) : null;
        const daysToSell = createdAt && soldAt ? differenceInDays(soldAt, createdAt) : 0;
        
        if (!brandAgg.has(brandId)) {
          brandAgg.set(brandId, {
            brand_id: brandId,
            brand_name: brandName,
            brand_tier: brandTier,
            units_sold: 0,
            revenue: 0,
            cogs: 0,
            gross_profit: 0,
            margin_pct: 0,
            avg_days_to_sell: 0,
            authenticated_count: 0,
          });
        }
        
        const agg = brandAgg.get(brandId)!;
        const quantity = Number(sale.quantity) || 0;
        const revenue = Number(sale.revenue) || 0;
        const cogs = Number(sale.cogs) || 0;
        
        agg.units_sold += quantity;
        agg.revenue += revenue;
        agg.cogs += cogs;
        agg.gross_profit += revenue - cogs;
        
        // Rolling average for days to sell
        if (daysToSell > 0) {
          const prevTotal = agg.avg_days_to_sell * (agg.units_sold - quantity);
          agg.avg_days_to_sell = (prevTotal + daysToSell * quantity) / agg.units_sold;
        }
        
        // Count authenticated items
        if (product?.authentication_status === 'authenticated') {
          agg.authenticated_count += quantity;
        }
      });

      // Calculate margin percentages
      brandAgg.forEach(agg => {
        agg.margin_pct = agg.revenue > 0 ? (agg.gross_profit / agg.revenue) * 100 : 0;
      });

      return Array.from(brandAgg.values());
    },
    enabled: true
  });

  const filteredData = useMemo(() => {
    if (!rawData) return [];

    return rawData.filter(item => {
      const matchesTier = tierFilter === 'all' || 
        (tierFilter === 'unbranded' && !item.brand_tier) ||
        item.brand_tier === tierFilter;
      const matchesSearch = !searchTerm || 
        item.brand_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesTier && matchesSearch;
    });
  }, [rawData, tierFilter, searchTerm]);

  // Summary metrics
  const totals = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return {
      units_sold: 0,
      revenue: 0,
      gross_profit: 0,
      avg_margin: 0,
      avg_days_to_sell: 0,
    };

    const total = filteredData.reduce((acc, item) => ({
      units_sold: acc.units_sold + item.units_sold,
      revenue: acc.revenue + item.revenue,
      gross_profit: acc.gross_profit + item.gross_profit,
      total_days: acc.total_days + (item.avg_days_to_sell * item.units_sold),
    }), { units_sold: 0, revenue: 0, gross_profit: 0, total_days: 0 });

    return {
      ...total,
      avg_margin: total.revenue > 0 ? (total.gross_profit / total.revenue) * 100 : 0,
      avg_days_to_sell: total.units_sold > 0 ? total.total_days / total.units_sold : 0,
    };
  }, [filteredData]);

  // Chart data - revenue by brand
  const barChartData = useMemo(() => {
    return filteredData
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(item => ({
        category: item.brand_name.length > 15 ? item.brand_name.substring(0, 15) + '...' : item.brand_name,
        amount: item.revenue
      }));
  }, [filteredData]);

  // Chart data - revenue by tier
  const tierChartData = useMemo(() => {
    const tierTotals = new Map<string, number>();
    filteredData.forEach(item => {
      const tier = item.brand_tier || 'Unbranded';
      const tierLabel = BRAND_TIERS.find(t => t.value === tier)?.label || tier;
      const current = tierTotals.get(tierLabel) || 0;
      tierTotals.set(tierLabel, current + item.revenue);
    });

    return Array.from(tierTotals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredData]);

  const handleExportCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    const headers = ['Brand', 'Tier', 'Units Sold', 'Revenue', 'COGS', 'Gross Profit', 'Margin %', 'Avg Days to Sell', 'Authenticated'];
    const rows = filteredData.map(item => [
      item.brand_name,
      item.brand_tier || 'Unbranded',
      item.units_sold,
      item.revenue.toFixed(2),
      item.cogs.toFixed(2),
      item.gross_profit.toFixed(2),
      item.margin_pct.toFixed(1),
      Math.round(item.avg_days_to_sell),
      item.authenticated_count,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Export complete', description: 'Brand analytics exported to CSV' });
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading brand analytics: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>
              Brand Performance Analytics
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <SimpleDatePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              className="w-full sm:w-auto"
            />
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {BRAND_TIERS.map(tier => (
                  <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                ))}
                <SelectItem value="unbranded">Unbranded</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Units Sold</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{totals.units_sold}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">£{totals.revenue.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Gross Profit</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-green-600">£{totals.gross_profit.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Margin</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{totals.avg_margin.toFixed(1)}%</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Days to Sell</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{Math.round(totals.avg_days_to_sell)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Top Brands by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <PageLoadingState message="Loading chart data..." />
              </div>
            ) : barChartData.length > 0 ? (
              <SimpleBarChart data={barChartData} height={300} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-amber-500" />
              Revenue by Brand Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <PageLoadingState message="Loading chart data..." />
              </div>
            ) : tierChartData.length > 0 ? (
              <SimplePieChart data={tierChartData} height={300} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Brand</th>
                    <th className="text-left py-3 px-2 font-medium">Tier</th>
                    <th className="text-right py-3 px-2 font-medium">Units</th>
                    <th className="text-right py-3 px-2 font-medium">Revenue</th>
                    <th className="text-right py-3 px-2 font-medium">Profit</th>
                    <th className="text-right py-3 px-2 font-medium">Margin</th>
                    <th className="text-right py-3 px-2 font-medium">Avg Days</th>
                    <th className="text-right py-3 px-2 font-medium">Auth</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((item, idx) => (
                      <tr key={item.brand_id || 'unbranded'} className={cn("border-b", idx % 2 === 0 && "bg-muted/30")}>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-500" />
                            <span className="font-medium">{item.brand_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {item.brand_tier ? (
                            <Badge variant="outline" className="text-xs">
                              {BRAND_TIERS.find(t => t.value === item.brand_tier)?.label || item.brand_tier}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="text-right py-3 px-2">{item.units_sold}</td>
                        <td className="text-right py-3 px-2 font-medium">£{item.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="text-right py-3 px-2 text-green-600">£{item.gross_profit.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="text-right py-3 px-2">
                          <span className={cn(
                            item.margin_pct >= 40 ? "text-green-600" : 
                            item.margin_pct >= 25 ? "text-foreground" : "text-amber-600"
                          )}>
                            {item.margin_pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-2">{Math.round(item.avg_days_to_sell)}</td>
                        <td className="text-right py-3 px-2">
                          {item.authenticated_count > 0 ? (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {item.authenticated_count}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No brand data available for the selected filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

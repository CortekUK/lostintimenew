import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, TrendingUp, Package, PoundSterling, Target, PieChart as PieChartIcon, BarChart3, Search } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import { SimpleBarChart, SimplePieChart } from './SimpleChart';
import { PageLoadingState } from '@/components/ui/loading-states';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProductMixData {
  product_id: number;
  sku: string;
  name: string;
  category: string;
  metal: string;
  karat: string;
  units_sold: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
}

interface ProductMixReportProps {
  className?: string;
}

export function ProductMixReport({ className }: ProductMixReportProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['product-mix', dateRange],
    queryFn: async () => {
      // Get sales data with product info within date range
      let query = supabase
        .from('v_pnl_px_consign')
        .select('*');

      if (dateRange?.from) {
        query = query.gte('sold_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('sold_at', dateRange.to.toISOString());
      }

      const { data: salesData, error: salesError } = await query;
      if (salesError) throw salesError;

      // Get product details for category info
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, category, is_trade_in, is_consignment');
      
      if (productsError) throw productsError;

      // Create a map of product details
      const productMap = new Map(products?.map(p => [p.id, p]));

      // Aggregate by product
      const productAgg = new Map();
      salesData?.forEach(sale => {
        const productDetails = productMap.get(sale.product_id);
        const key = sale.product_id;
        
        if (!productAgg.has(key)) {
          productAgg.set(key, {
            product_id: sale.product_id,
            name: sale.product_name,
            sku: sale.internal_sku,
            category: productDetails?.category || 'Uncategorized',
            is_trade_in: sale.is_trade_in || false,
            is_consignment: sale.is_consignment || false,
            units_sold: 0,
            revenue: 0,
            cogs: 0,
            gross_profit: 0
          });
        }
        
        const agg = productAgg.get(key);
        agg.units_sold += Number(sale.quantity) || 0;
        agg.revenue += Number(sale.revenue) || 0;
        agg.cogs += Number(sale.cogs) || 0;
        agg.gross_profit += (Number(sale.revenue) || 0) - (Number(sale.cogs) || 0);
      });

      return Array.from(productAgg.values());
    },
    enabled: true
  });

  const filteredData = useMemo(() => {
    if (!rawData) return [];

    return rawData.filter(item => {
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesSearch = !searchTerm || 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || 
        (typeFilter === 'owned' && !item.is_trade_in && !item.is_consignment) ||
        (typeFilter === 'px' && item.is_trade_in) ||
        (typeFilter === 'consignment' && item.is_consignment);
      
      return matchesCategory && matchesSearch && matchesType;
    });
  }, [rawData, categoryFilter, typeFilter, searchTerm]);

  const categories = useMemo(() => {
    if (!rawData) return [];
    return [...new Set(rawData.map(item => item.category).filter(Boolean))];
  }, [rawData]);

  const categoryChartData = useMemo(() => {
    if (!filteredData) return [];
    
    const categoryTotals = new Map();
    filteredData.forEach(item => {
      const cat = item.category || 'Uncategorized';
      const current = categoryTotals.get(cat) || 0;
      categoryTotals.set(cat, current + item.revenue);
    });

    return Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6); // Top 6 categories for pie chart
  }, [filteredData]);

  const barChartData = useMemo(() => {
    return filteredData
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(item => ({
        category: item.name && item.name.length > 20 ? item.name.substring(0, 20) + '...' : (item.name || 'Unknown'),
        amount: item.revenue
      }));
  }, [filteredData]);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => ({
      units: acc.units + item.units_sold,
      revenue: acc.revenue + item.revenue,
      cogs: acc.cogs + item.cogs,
      grossProfit: acc.grossProfit + item.gross_profit
    }), { units: 0, revenue: 0, cogs: 0, grossProfit: 0 });
  }, [filteredData]);

  const handleExportCSV = () => {
    try {
      const csvContent = [
        ['Product', 'SKU', 'Category', 'Type', 'Units Sold', 'Revenue', 'COGS', 'Gross Profit', 'Margin %'],
        ...filteredData.map(item => [
          item.name,
          item.sku || '',
          item.category || '',
          item.is_trade_in ? 'PX' : item.is_consignment ? 'Consignment' : 'Owned',
          item.units_sold,
          item.revenue.toFixed(2),
          item.cogs.toFixed(2),
          item.gross_profit.toFixed(2),
          item.revenue > 0 ? ((item.gross_profit / item.revenue) * 100).toFixed(1) + '%' : '0%'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product-mix-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Product mix report exported successfully'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export product mix report',
        variant: 'destructive'
      });
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 10) return 'text-success';
    if (margin >= 5) return 'text-warning';
    return 'text-destructive';
  };

  const getMarginBadgeVariant = (margin: number): "default" | "secondary" | "destructive" => {
    if (margin >= 10) return 'default';
    if (margin >= 5) return 'secondary';
    return 'destructive';
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Error loading product mix data: {(error as Error).message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              Product Mix Analysis
            </CardTitle>
            <Button variant="outline" onClick={handleExportCSV} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <SimpleDatePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="owned">Owned</SelectItem>
                <SelectItem value="consignment">Consignment</SelectItem>
                <SelectItem value="px">Part Exchange</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span className="text-sm font-medium">Total Units</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight">{totals.units.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PoundSterling className="h-4 w-4" />
                <span className="text-sm font-medium">Total Revenue</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight">
                £{totals.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Total COGS</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight">
                £{totals.cogs.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Gross Margin</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={cn(
                "text-3xl font-bold tracking-tight",
                getMarginColor(totals.revenue > 0 ? (totals.grossProfit / totals.revenue) * 100 : 0)
              )}>
                {totals.revenue > 0 ? ((totals.grossProfit / totals.revenue) * 100).toFixed(1) : '0.0'}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-muted-foreground" />
              Sales by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-[250px] w-[250px] rounded-full" />
              </div>
            ) : categoryChartData.length > 0 ? (
              <SimplePieChart data={categoryChartData} className="h-[300px]" />
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <PieChartIcon className="h-12 w-12 mb-3 opacity-20" />
                <p>No category data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Top 10 Products by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : barChartData.length > 0 ? (
              <SimpleBarChart data={barChartData} className="h-[300px]" />
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
                <p>No product data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Performance Table</CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of product sales and profitability
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold text-muted-foreground">Product</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">SKU</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Category</th>
                      <th className="text-center p-3 font-semibold text-muted-foreground">Type</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Units</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Revenue</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">COGS</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Profit</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12">
                          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                          <p className="text-muted-foreground font-medium">No products found</p>
                          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredData
                        .sort((a, b) => b.revenue - a.revenue)
                        .map((item) => {
                          const margin = item.revenue > 0 ? (item.gross_profit / item.revenue) * 100 : 0;
                          return (
                            <tr key={item.product_id} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3">
                                <div className="font-medium">{item.name || 'Unknown Product'}</div>
                              </td>
                              <td className="p-3 text-muted-foreground font-mono text-xs">
                                {item.sku || '-'}
                              </td>
                              <td className="p-3">
                                {item.category ? (
                                  <Badge variant="outline" className="text-xs">
                                    {item.category}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <Badge 
                                  variant={item.is_trade_in ? "secondary" : item.is_consignment ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {item.is_trade_in ? 'PX' : item.is_consignment ? 'Consignment' : 'Owned'}
                                </Badge>
                              </td>
                              <td className="p-3 text-right font-medium">
                                {item.units_sold.toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-semibold">
                                £{item.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right text-muted-foreground">
                                £{item.cogs.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={cn(
                                "p-3 text-right font-semibold",
                                item.gross_profit >= 0 ? 'text-success' : 'text-destructive'
                              )}>
                                £{item.gross_profit.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right">
                                <Badge 
                                  variant={getMarginBadgeVariant(margin)}
                                  className="font-mono"
                                >
                                  {margin.toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
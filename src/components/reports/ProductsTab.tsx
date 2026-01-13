import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { SimpleBarChart } from '@/components/reports/SimpleChart';
import { StatsCardSkeleton, ChartLoadingState, TableLoadingState } from '@/components/ui/loading-states';
import { QueryErrorHandler } from '@/components/ui/error-states';
import { useProductMixReport } from '@/hooks/useProductMixReport';
import { exportProductMixToCSV, exportProductMixToPDF } from '@/utils/productMixExport';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { startOfMonth, endOfDay, format } from 'date-fns';
import { Download, Search, Package, TrendingUp, PoundSterling, Percent, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

interface DateRangeInput {
  from?: Date;
  to?: Date;
}

export function ProductsTab() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date())
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const { data: productData, isLoading, error, refetch } = useProductMixReport(dateRange, {
    searchTerm,
    categoryFilter,
    typeFilter
  });

  // Memoize chart data conversion
  const convertedChartData = useMemo(() => 
    productData?.chartData?.map(item => ({
      category: item.name,
      amount: item.revenue
    })) || [],
    [productData?.chartData]
  );

  // Handle export
  const handleExport = async (type: 'csv' | 'pdf') => {
    if (!productData) return;
    
    setIsExporting(true);
    try {
      const exportData = {
        ...productData,
        dateRange,
        filters: { searchTerm, categoryFilter, typeFilter },
      };
      
      if (type === 'csv') {
        exportProductMixToCSV(exportData);
        toast.success('Product report exported to CSV');
      } else {
        exportProductMixToPDF(exportData);
        toast.success('Product report exported to PDF');
      }
    } catch (error) {
      toast.error(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-10 flex-1 min-w-64 bg-muted animate-pulse rounded" />
          <div className="h-10 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
        <ChartLoadingState height="h-[300px]" />
        <TableLoadingState rows={10} columns={8} />
      </div>
    );
  }

  // Error state
  if (error) {
    return <QueryErrorHandler error={error} onRetry={() => refetch()} />;
  }

  const {
    products = [],
    totals = { units: 0, revenue: 0, cogs: 0, grossProfit: 0 },
    chartData = [],
    categories = []
  } = productData || {};

  const avgMargin = totals.revenue > 0 ? ((totals.grossProfit / totals.revenue) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            aria-label="Search products"
          />
        </div>
        
        <DateRangePicker
          dateRange={{ 
            from: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
            to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
          }}
          onDateRangeChange={(range) => setDateRange({ 
            from: range.from ? new Date(range.from) : undefined, 
            to: range.to ? new Date(range.to) : undefined 
          })}
        />
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="owned">Owned Inventory</SelectItem>
            <SelectItem value="px">Part Exchange</SelectItem>
            <SelectItem value="consignment">Consignment</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            onClick={() => handleExport('csv')}
            disabled={isExporting || !productData?.products.length}
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            onClick={() => handleExport('pdf')}
            disabled={isExporting || !productData?.products.length}
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Units Sold">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Units Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{totals.units.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total items sold
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Total Revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(totals.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {products.length} products
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Gross Profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${totals.grossProfit > 0 ? 'text-success' : totals.grossProfit < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatCurrency(totals.grossProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total profit earned
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Average Margin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Margin</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatPercentage(avgMargin)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average profit margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top 10 Products by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {convertedChartData.length > 0 ? (
            <SimpleBarChart data={convertedChartData} className="h-[300px]" />
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12 h-[300px]">
              <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">No product data available</p>
              <p className="text-sm mt-1">Try adjusting your filters or date range</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {products.length} product{products.length !== 1 ? 's' : ''} sorted by revenue
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-semibold">Product</th>
                  <th className="text-left py-3 px-2 font-semibold">SKU</th>
                  <th className="text-right py-3 px-2 font-semibold">Units</th>
                  <th className="text-right py-3 px-2 font-semibold">Revenue</th>
                  <th className="text-right py-3 px-2 font-semibold">COGS</th>
                  <th className="text-right py-3 px-2 font-semibold">Profit</th>
                  <th className="text-right py-3 px-2 font-semibold">Margin %</th>
                  <th className="text-center py-3 px-2 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
                  products.map((product: any, index: number) => {
                    const margin = product.revenue > 0 ? ((product.gross_profit / product.revenue) * 100) : 0;
                    const isHighMargin = margin >= 10;
                    const isMediumMargin = margin >= 5 && margin < 10;
                    const isLowMargin = margin < 5;
                    
                    return (
                      <tr 
                        key={product.product_id} 
                        className={cn(
                          "border-b border-border transition-colors hover:bg-muted/50",
                          index < 3 && "bg-accent/5" // Highlight top 3
                        )}
                      >
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                {index + 1}
                              </span>
                            )}
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground font-mono text-xs">
                          {product.sku || product.internal_sku}
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums">
                          {product.units_sold.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-semibold tabular-nums">
                          {formatCurrency(Number(product.revenue || 0))}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-muted-foreground tabular-nums">
                          {formatCurrency(Number(product.cogs || 0))}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono tabular-nums ${Number(product.gross_profit || 0) > 0 ? 'text-success' : Number(product.gross_profit || 0) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                          {formatCurrency(Number(product.gross_profit || 0))}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span 
                            className={cn(
                              "inline-flex items-center justify-center px-2 py-1 rounded font-mono font-semibold text-xs tabular-nums",
                              isHighMargin && "bg-success/10 text-success",
                              isMediumMargin && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                              isLowMargin && "bg-destructive/10 text-destructive"
                            )}
                            aria-label={`Margin: ${margin.toFixed(1)}%`}
                          >
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {product.is_trade_in && (
                            <Badge variant="secondary" className="text-xs">PX</Badge>
                          )}
                          {product.is_consignment && (
                            <Badge variant="outline" className="text-xs">Consignment</Badge>
                          )}
                          {!product.is_trade_in && !product.is_consignment && (
                            <Badge variant="default" className="text-xs">Owned</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Package className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-medium">No products found</p>
                        <p className="text-sm mt-1">
                          {searchTerm ? 'Try a different search term' : 'Try adjusting your filters'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
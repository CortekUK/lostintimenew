import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { SimpleBarChart } from '@/components/reports/SimpleChart';
import { StatsCardSkeleton, ChartLoadingState, TableLoadingState } from '@/components/ui/loading-states';
import { QueryErrorHandler } from '@/components/ui/error-states';
import { useSupplierPerformanceReport } from '@/hooks/useSupplierPerformanceReport';
import { exportSupplierPerformanceToCSV, exportSupplierPerformanceToPDF } from '@/utils/supplierPerformanceExport';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { startOfMonth, endOfDay, format } from 'date-fns';
import { Download, Building2, Users, TrendingUp, PoundSterling, BarChart3, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface DateRangeInput {
  from?: Date;
  to?: Date;
}

export function SuppliersTab() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRangeInput>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date())
  });
  const [supplierTypeFilter, setSupplierTypeFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const { data: supplierData, isLoading, error, refetch } = useSupplierPerformanceReport(dateRange, {
    supplierType: supplierTypeFilter
  });

  // Memoize chart data conversion
  const convertedChartData = useMemo(() => 
    supplierData?.chartData?.map(item => ({
      category: item.name,
      amount: item.revenue
    })) || [],
    [supplierData?.chartData]
  );

  // Handle export
  const handleExport = async (type: 'csv' | 'pdf') => {
    if (!supplierData) return;
    
    setIsExporting(true);
    try {
      const exportData = {
        ...supplierData,
        dateRange,
        filters: { supplierType: supplierTypeFilter },
      };
      
      if (type === 'csv') {
        exportSupplierPerformanceToCSV(exportData);
        toast.success('Supplier report exported to CSV');
      } else {
        exportSupplierPerformanceToPDF(exportData);
        toast.success('Supplier report exported to PDF');
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
    totalSuppliers = 0,
    activeSuppliers = 0,
    suppliers = [],
    totals = { products_sold: 0, revenue: 0, cogs: 0, gross_profit: 0 }
  } = supplierData || {};

  const avgMargin = totals.revenue > 0 ? (totals.gross_profit / totals.revenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
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
        
        <Select value={supplierTypeFilter} onValueChange={setSupplierTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="customer">Individual</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2 ml-auto">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            onClick={() => handleExport('csv')}
            disabled={isExporting || !suppliers.length}
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            onClick={() => handleExport('pdf')}
            disabled={isExporting || !suppliers.length}
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Total Suppliers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{totalSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeSuppliers} active
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Active Suppliers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{activeSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Contributing to sales
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Period Revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Period Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(totals.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Gross Profit Contribution">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${totals.gross_profit > 0 ? 'text-success' : totals.gross_profit < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatCurrency(totals.gross_profit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(avgMargin)} avg margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top 10 Suppliers by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {convertedChartData.length > 0 ? (
            <SimpleBarChart data={convertedChartData} className="h-[300px]" />
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12 h-[300px]">
              <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">No supplier data available</p>
              <p className="text-sm mt-1">Try adjusting your filters or date range</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Performance</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} sorted by revenue
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-semibold">Supplier</th>
                  <th className="text-right py-3 px-2 font-semibold">Products</th>
                  <th className="text-right py-3 px-2 font-semibold">Revenue</th>
                  <th className="text-right py-3 px-2 font-semibold">COGS</th>
                  <th className="text-right py-3 px-2 font-semibold">Profit</th>
                  <th className="text-right py-3 px-2 font-semibold">Margin %</th>
                  <th className="text-center py-3 px-2 font-semibold">Settlement</th>
                  <th className="text-center py-3 px-2 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length > 0 ? (
                  suppliers.map((supplier: any, index: number) => {
                    const margin = supplier.revenue > 0 ? ((supplier.gross_profit / supplier.revenue) * 100) : 0;
                    const isHighMargin = margin >= 10;
                    const isMediumMargin = margin >= 5 && margin < 10;
                    const isLowMargin = margin < 5 && margin > 0;
                    const hasOutstanding = supplier.outstanding_settlements > 0;
                    
                    return (
                      <tr 
                        key={supplier.supplier_id} 
                        className={cn(
                          "border-b border-border transition-colors hover:bg-muted/50",
                          index < 3 && "bg-accent/5"
                        )}
                      >
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                {index + 1}
                              </span>
                            )}
                            <button
                              onClick={() => navigate(`/suppliers/${supplier.supplier_id}`)}
                              className="font-medium hover:text-primary transition-colors flex items-center gap-1 group"
                            >
                              {supplier.name}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums">
                          {supplier.products_sold.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-semibold tabular-nums">
                          {formatCurrency(Number(supplier.revenue || 0))}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-muted-foreground tabular-nums">
                          {formatCurrency(Number(supplier.cogs || 0))}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono tabular-nums ${Number(supplier.gross_profit || 0) > 0 ? 'text-success' : Number(supplier.gross_profit || 0) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                          {formatCurrency(Number(supplier.gross_profit || 0))}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {margin > 0 ? (
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
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {hasOutstanding ? (
                            <Badge variant="destructive" className="text-xs">
                              {formatCurrency(supplier.outstanding_settlements)} Due
                            </Badge>
                          ) : supplier.settled_amount > 0 ? (
                            <Badge variant="outline" className="text-xs text-success border-success">
                              Settled
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {supplier.supplier_type === 'customer' ? (
                            <Badge variant="secondary" className="text-xs">Individual</Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">Registered</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Building2 className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-medium">No suppliers found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or date range</p>
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
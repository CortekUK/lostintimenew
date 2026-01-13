import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { SimpleLineChart } from '@/components/reports/SimpleChart';
import { PnlFormulaTooltip } from '@/components/reports/PnlFormulaTooltip';
import { UnsettledConsignmentAlert } from '@/components/reports/UnsettledConsignmentAlert';
import { StatsCardSkeleton, ChartLoadingState } from '@/components/ui/loading-states';
import { QueryErrorHandler } from '@/components/ui/error-states';
import { useConsolidatedPnL } from '@/hooks/useConsolidatedPnL';
import { exportPnLToCSV, exportPnLToPDF } from '@/utils/pnlExport';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { startOfMonth, endOfDay, format } from 'date-fns';
import { Download, TrendingUp, ShoppingCart, PoundSterling, Receipt, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface DateRangeInput {
  from?: Date;
  to?: Date;
}

export function FinancialTab() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date())
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(false);

  const { data: pnlData, isLoading, error, refetch } = useConsolidatedPnL(dateRange);

  // Memoize chart data transformation
  const convertedChartData = useMemo(() => 
    pnlData?.chartData?.map(item => ({
      day: format(new Date(item.name), 'yyyy-MM-dd'),
      revenue: item.revenue,
      gross_profit: item.grossProfit
    })) || [],
    [pnlData?.chartData]
  );

  // Handle export
  const handleExport = async (type: 'csv' | 'pdf') => {
    if (!pnlData) return;
    
    setIsExporting(true);
    try {
      const exportData = {
        ...pnlData,
        dateRange,
      };
      
      if (type === 'csv') {
        exportPnLToCSV(exportData);
        toast.success('P&L exported to CSV');
      } else {
        exportPnLToPDF(exportData);
        toast.success('P&L exported to PDF');
      }
    } catch (error) {
      toast.error(`Failed to export P&L: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
        <ChartLoadingState height="h-[400px]" />
      </div>
    );
  }

  // Error state
  if (error) {
    return <QueryErrorHandler error={error} onRetry={() => refetch()} />;
  }

  const {
    revenue = 0,
    cogs = 0,
    grossProfit = 0,
    operatingExpenses = 0,
    netProfit = 0,
    chartData = [],
    expensesByCategory = [],
    unsettledConsignments = [],
    transactionCount = 0,
    totalItems = 0
  } = pnlData || {};

  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
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
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total sales for period
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Cost of Goods Sold">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">COGS</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(cogs)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cost of goods sold
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Gross Profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
            <PoundSterling className="h-4 w-4 text-success" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-success">{formatCurrency(grossProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(grossMargin)} margin
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Operating Expenses">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Operating Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(operatingExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total expenses
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Net Profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
            <Wallet className={`h-4 w-4 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`} aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(netMargin)} net margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Profit & Loss Statement
            <PnlFormulaTooltip />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-semibold">Total Sales Revenue</span>
              <span className="font-mono font-semibold">{formatCurrency(revenue)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-medium">Cost of Goods Sold (COGS)</span>
              <span className="font-mono text-muted-foreground">-{formatCurrency(cogs)}</span>
            </div>
            
            <div className="border-t pt-3 border-border">
              <div className="flex justify-between items-center font-semibold text-success">
                <span>Gross Profit</span>
                <span className="font-mono">{formatCurrency(grossProfit)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatPercentage(grossMargin)} margin
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <button
                onClick={() => setShowExpenseBreakdown(!showExpenseBreakdown)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                aria-expanded={showExpenseBreakdown}
              >
                {showExpenseBreakdown ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Operating Expenses by Category
              </button>
              
              {showExpenseBreakdown && (
                <div className="space-y-1 pl-6 animate-in slide-in-from-top-2">
                  {expensesByCategory.length > 0 ? (
                    expensesByCategory.map((category: any) => (
                      <div key={category.category} className="flex justify-between items-center text-sm py-1">
                        <span className="capitalize text-muted-foreground">
                          {category.category.replace('_', ' ')}
                        </span>
                        <span className="font-mono">{formatCurrency(category.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground italic">No expenses in this period</div>
                  )}
                </div>
              )}
              
              <div className="flex justify-between items-center font-semibold pt-1 border-t">
                <span>Total Operating Expenses</span>
                <span className="font-mono text-muted-foreground">-{formatCurrency(operatingExpenses)}</span>
              </div>
            </div>
            
            <div className="border-t-2 pt-3 border-border">
              <div className={`flex justify-between items-center text-lg font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                <span>Net Profit</span>
                <span className="font-mono">{formatCurrency(netProfit)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatPercentage(netMargin)} net margin
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Gross Profit Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {convertedChartData.length > 0 ? (
            <SimpleLineChart data={convertedChartData} className="h-[300px]" />
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12 h-[300px]">
              <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">No data available for the selected period</p>
              <p className="text-sm mt-1">Try selecting a different date range with sales activity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconciliation Footer */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Transactions:</span>
              <span className="font-mono font-semibold">{transactionCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Items Sold:</span>
              <span className="font-mono font-semibold">{totalItems.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-muted-foreground">Avg Transaction Value:</span>
              <span className="font-mono font-semibold">
                {formatCurrency(transactionCount > 0 ? revenue / transactionCount : 0)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {unsettledConsignments.length > 0 && (
          <UnsettledConsignmentAlert unsettledConsignments={unsettledConsignments} />
        )}
      </div>
    </div>
  );
}
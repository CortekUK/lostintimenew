import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { StatsCardSkeleton, TableLoadingState, ChartLoadingState } from '@/components/ui/loading-states';
import { QueryErrorHandler } from '@/components/ui/error-states';
import { usePxConsignmentReport } from '@/hooks/usePxConsignmentReport';
import { exportPxConsignmentToCSV, exportPxConsignmentToPDF } from '@/utils/pxConsignmentExport';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, PoundSterling, Package, TrendingUp, Download, ArrowUpDown, Info } from 'lucide-react';
import { startOfMonth, endOfDay, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface DateRangeInput {
  from?: Date;
  to?: Date;
}

export function PxConsignmentTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  
  const [dateRange, setDateRange] = useState<DateRangeInput>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date())
  });
  const [isExporting, setIsExporting] = useState(false);

  const { data: pxConsignmentData, isLoading, error, refetch } = usePxConsignmentReport(dateRange);

  // Handle export
  const handleExport = async (type: 'csv' | 'pdf') => {
    if (!pxConsignmentData) return;
    
    setIsExporting(true);
    try {
      const exportData = {
        ...pxConsignmentData,
        dateRange,
      };
      
      if (type === 'csv') {
        exportPxConsignmentToCSV(exportData);
        toast.success('PX & Consignment report exported to CSV');
      } else {
        exportPxConsignmentToPDF(exportData);
        toast.success('PX & Consignment report exported to PDF');
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
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
        <TableLoadingState rows={5} columns={6} />
        <TableLoadingState rows={5} columns={8} />
      </div>
    );
  }

  // Error state
  if (error) {
    return <QueryErrorHandler error={error} onRetry={() => refetch()} />;
  }

  const {
    pxSummary = { items: 0, totalAllowances: 0, grossProfit: 0 },
    consignmentSummary = { items: 0, totalPayouts: 0, grossProfit: 0 },
    unsettledConsignments = [],
    pxItems = [],
    consignmentItems = []
  } = pxConsignmentData || {};

  const unsettledAmount = unsettledConsignments.reduce((sum: number, item: any) => 
    sum + (item.payout_amount || 0), 0
  );

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
        
        <div className="flex items-center gap-2 ml-auto">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Explanatory Note */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Cost Basis:</strong> PX cost = allowance paid to customer. Consignment cost = agreed payout to consigner. 
          Consignment GP only includes settled items.
        </AlertDescription>
      </Alert>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Part Exchange Items">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PX Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{pxSummary.items}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(pxSummary.totalAllowances)} allowances
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Part Exchange Gross Profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PX Gross Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(pxSummary.grossProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {pxSummary.items} items sold
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Consignment Items">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consignment Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{consignmentSummary.items}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(consignmentSummary.totalPayouts)} payouts
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300" role="article" aria-label="Consignment Gross Profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consignment GP</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(consignmentSummary.grossProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Settled items only
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unsettled Consignments Alert */}
      {unsettledConsignments.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Unsettled Consignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Outstanding Amount:</span>
                <span className="text-lg font-bold text-destructive">{formatCurrency(unsettledAmount)}</span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                These amounts are not included in Gross Profit calculations until settlements are recorded.
              </div>
              
              {isOwner && unsettledConsignments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Pending Settlements:</div>
                  {unsettledConsignments.slice(0, 3).map((item: any) => (
                    <div key={item.settlement_id} className="flex justify-between items-center bg-background p-3 rounded-lg border">
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.supplier_name} • Sold {format(new Date(item.sold_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold">{formatCurrency(item.payout_amount)}</div>
                      </div>
                    </div>
                  ))}
                  {unsettledConsignments.length > 3 && (
                    <div className="text-sm text-muted-foreground">
                      + {unsettledConsignments.length - 3} more pending...
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Part Exchange Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Part Exchange Summary
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {pxItems.length} part exchange item{pxItems.length !== 1 ? 's' : ''}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-semibold">Product</th>
                  <th className="text-center py-3 px-2 font-semibold">Sale ID</th>
                  <th className="text-right py-3 px-2 font-semibold">Allowance</th>
                  <th className="text-right py-3 px-2 font-semibold">Sale Price</th>
                  <th className="text-right py-3 px-2 font-semibold">Gross Profit</th>
                  <th className="text-left py-3 px-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {pxItems.length > 0 ? (
                  pxItems.map((item: any) => {
                    const profit = Number(item.revenue || 0) - Number(item.cogs || 0);
                    const isProfit = profit > 0;
                    
                    return (
                      <tr key={`${item.sale_id}-${item.product_id}`} className="border-b border-border transition-colors hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.internal_sku}</div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => navigate(`/sales/${item.sale_id}`)}
                            className="inline-flex"
                          >
                            <Badge variant="outline" className="hover:bg-muted transition-colors cursor-pointer">
                              #{item.sale_id}
                            </Badge>
                          </button>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-muted-foreground tabular-nums">
                          {formatCurrency(Number(item.cogs || 0))}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-semibold tabular-nums">
                          {formatCurrency(Number(item.revenue || 0))}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={cn(
                            "font-mono font-semibold tabular-nums",
                            isProfit ? "text-success" : "text-destructive"
                          )}>
                            {formatCurrency(profit)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {format(new Date(item.sold_at), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Package className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-medium">No part exchange items</p>
                        <p className="text-sm mt-1">No PX items sold in this period</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Consignment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Consignment Summary
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {consignmentItems.length} consignment item{consignmentItems.length !== 1 ? 's' : ''}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-semibold">Product</th>
                  <th className="text-left py-3 px-2 font-semibold">Consigner</th>
                  <th className="text-center py-3 px-2 font-semibold">Sale ID</th>
                  <th className="text-right py-3 px-2 font-semibold">Payout</th>
                  <th className="text-right py-3 px-2 font-semibold">Sale Price</th>
                  <th className="text-right py-3 px-2 font-semibold">Gross Profit</th>
                  <th className="text-center py-3 px-2 font-semibold">Status</th>
                  <th className="text-left py-3 px-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {consignmentItems.length > 0 ? (
                  consignmentItems.map((item: any) => {
                    const profit = Number(item.revenue || 0) - Number(item.cogs || 0);
                    const isProfit = profit > 0;
                    
                    return (
                      <tr key={`${item.sale_id}-${item.product_id}`} className="border-b border-border transition-colors hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.internal_sku}</div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {item.supplier_name || 'Unknown'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => navigate(`/sales/${item.sale_id}`)}
                            className="inline-flex"
                          >
                            <Badge variant="outline" className="hover:bg-muted transition-colors cursor-pointer">
                              #{item.sale_id}
                            </Badge>
                          </button>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-muted-foreground tabular-nums">
                          {formatCurrency(Number(item.cogs || 0))}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-semibold tabular-nums">
                          {formatCurrency(Number(item.revenue || 0))}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={cn(
                            "font-mono font-semibold tabular-nums",
                            isProfit ? "text-success" : "text-destructive"
                          )}>
                            {formatCurrency(profit)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge 
                            variant={item.is_paid ? 'outline' : 'destructive'}
                            className={cn(
                              item.is_paid && 'border-success text-success'
                            )}
                          >
                            {item.is_paid ? 'Settled' : 'Unsettled'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {format(new Date(item.sold_at), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Package className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-medium">No consignment items</p>
                        <p className="text-sm mt-1">No consignment items sold in this period</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals Footer */}
      <Card className="bg-accent/30">
        <CardHeader>
          <CardTitle className="text-base">Period Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-background border">
              <div className="text-sm text-muted-foreground mb-1">PX Gross Profit</div>
              <div className="text-2xl font-bold text-success">{formatCurrency(pxSummary.grossProfit)}</div>
              <div className="text-xs text-muted-foreground mt-1">From {pxSummary.items} items</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background border">
              <div className="text-sm text-muted-foreground mb-1">Consignment GP (Settled)</div>
              <div className="text-2xl font-bold text-success">{formatCurrency(consignmentSummary.grossProfit)}</div>
              <div className="text-xs text-muted-foreground mt-1">Paid settlements only</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background border">
              <div className="text-sm text-muted-foreground mb-1">Unsettled Amount</div>
              <div className={cn(
                "text-2xl font-bold",
                unsettledAmount > 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {formatCurrency(unsettledAmount)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {unsettledConsignments.length} pending
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
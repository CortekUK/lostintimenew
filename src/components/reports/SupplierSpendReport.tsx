import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Building2, PoundSterling, ShoppingCart, TrendingUp, Search, BarChart3, LineChartIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import { SimpleBarChart, SimpleLineChart } from './SimpleChart';
import { useSupplierSpendAnalytics } from '@/hooks/useSupplierSpendAnalytics';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SupplierSpendData {
  supplier_id: number;
  name: string;
  inventory_spend: number;
  expense_spend: number;
  total_spend: number;
}

interface SupplierSpendReportProps {
  className?: string;
}

export function SupplierSpendReport({ className }: SupplierSpendReportProps) {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error } = useSupplierSpendAnalytics(dateRange);

  const filteredData = useMemo(() => {
    if (!data?.suppliers) return [];

    return data.suppliers.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [data, searchTerm]);

  const totals = data?.totals || { inventory: 0, expenses: 0, total: 0 };
  const topSupplierPercentage = data?.topSupplierPercentage || 0;

  const handleExportCSV = () => {
    try {
      const csvContent = [
        ['Supplier', 'Inventory Spend', 'Other Expenses', 'Total Spend', '% of Total'],
        ...filteredData.map(item => [
          item.name,
          item.inventory_spend.toFixed(2),
          item.expense_spend.toFixed(2),
          item.total_spend.toFixed(2),
          totals.total > 0 ? ((item.total_spend / totals.total) * 100).toFixed(1) + '%' : '0%'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supplier-spend-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Supplier spend report exported successfully'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export supplier spend report',
        variant: 'destructive'
      });
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Error loading supplier spend data: {(error as Error).message}
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
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Supplier Spend Analysis
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

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
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
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm font-medium">Inventory Spend</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight">
                £{totals.inventory.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PoundSterling className="h-4 w-4" />
                <span className="text-sm font-medium">Other Expenses</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight">
                £{totals.expenses.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PoundSterling className="h-4 w-4" />
                <span className="text-sm font-medium">Total Spend</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight">
                £{totals.total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Top Supplier %</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">
                  {topSupplierPercentage.toFixed(1)}%
                </div>
              <p className="text-xs text-muted-foreground mt-1">
                of total spend
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Top 10 Suppliers by Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : data?.barChartData && data.barChartData.length > 0 ? (
              <SimpleBarChart data={data.barChartData} className="h-[300px]" />
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
                <p>No supplier data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-muted-foreground" />
              Supplier Spend Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : data?.timeSeriesData && data.timeSeriesData.length > 0 ? (
              <SimpleLineChart data={data.timeSeriesData} className="h-[300px]" />
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <LineChartIcon className="h-12 w-12 mb-3 opacity-20" />
                <p>No time series data available</p>
                <p className="text-xs mt-1">Select a date range to view trends</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Spend Table</CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of supplier spend by category
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
                      <th className="text-left p-3 font-semibold text-muted-foreground">Supplier</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Inventory Spend</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Other Expenses</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Total Spend</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12">
                          <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                          <p className="text-muted-foreground font-medium">No suppliers found</p>
                          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item) => (
                        <tr key={item.supplier_id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <button
                              onClick={() => navigate(`/suppliers/${item.supplier_id}`)}
                              className="font-medium text-primary hover:underline text-left"
                            >
                              {item.name}
                            </button>
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            £{item.inventory_spend.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            £{item.expense_spend.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-semibold">
                            £{item.total_spend.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right">
                            <Badge variant="outline" className="font-mono">
                              {totals.total > 0 ? ((item.total_spend / totals.total) * 100).toFixed(1) : '0'}%
                            </Badge>
                          </td>
                        </tr>
                      ))
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
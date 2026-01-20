import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnhancedTable } from '@/components/ui/enhanced-table';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/hooks/useDatabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { EmailService } from '@/components/integrations/EmailService';
import { SaleDetailModal } from '@/components/transactions/SaleDetailModal';
import { 
  ReceiptPoundSterling, 
  Eye, 
  Printer,
  Calendar,
  PoundSterling,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Package2,
  Mail,
  User,
  Percent,
  Coins
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import type { DateRange } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQueryClient } from '@tanstack/react-query';

interface MySalesFilters {
  dateRange: DateRange;
  paymentMethod: string;
  searchQuery: string;
}

export default function MySales() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  const { data: transactionsData = [], isLoading } = useTransactions();
  
  // Commission settings
  const commissionEnabled = settings.commissionSettings?.enabled ?? true;
  const commissionRate = settings.commissionSettings?.defaultRate ?? 5;
  
  const [filters, setFilters] = useState<MySalesFilters>({
    dateRange: { from: '', to: '' },
    paymentMethod: 'all',
    searchQuery: ''
  });

  const [expandedSales, setExpandedSales] = useState<Set<number>>(new Set());
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);

  // Filter transactions to only show current user's sales
  const mySales = useMemo(() => {
    if (!transactionsData || !Array.isArray(transactionsData) || !user?.id) {
      return [];
    }
    
    return transactionsData.filter((transaction: any) => {
      if (!transaction || typeof transaction !== 'object') return false;
      
      // Only include sales made by the current user
      if (transaction.staff_id !== user.id) return false;
      
      const saleDate = new Date(transaction.sold_at);
      const isValidDate = !isNaN(saleDate.getTime());
      
      if (!isValidDate) return false;
      
      const fromDate = filters.dateRange.from ? startOfDay(new Date(filters.dateRange.from)) : null;
      const toDate = filters.dateRange.to ? endOfDay(new Date(filters.dateRange.to)) : null;
      
      const matchesDateRange = (!fromDate || saleDate >= fromDate) &&
                               (!toDate || saleDate <= toDate);
      const matchesPayment = !filters.paymentMethod || filters.paymentMethod === 'all' || transaction.payment === filters.paymentMethod;
      
      // Search functionality
      const matchesSearch = !filters.searchQuery || 
        String(transaction.id).includes(filters.searchQuery) ||
        (transaction.customer_email && transaction.customer_email.toLowerCase().includes(filters.searchQuery.toLowerCase())) ||
        (transaction.customer_name && transaction.customer_name.toLowerCase().includes(filters.searchQuery.toLowerCase())) ||
        (transaction.sale_items && transaction.sale_items.some((item: any) => 
          item.products?.name?.toLowerCase().includes(filters.searchQuery.toLowerCase())
        ));
      
      return matchesDateRange && matchesPayment && matchesSearch;
    });
  }, [transactionsData, filters, user?.id]);

  // Get unique payment methods from my sales
  const paymentMethods = useMemo(() => {
    const methods = new Set<string>();
    mySales.forEach((transaction: any) => {
      if (transaction.payment) methods.add(transaction.payment);
    });
    return Array.from(methods);
  }, [mySales]);

  // Calculate totals
  const totalSales = mySales.length;
  const totalRevenue = mySales.reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0);
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;
  const totalCommission = totalRevenue * (commissionRate / 100);

  // Calculate this month's stats
  const thisMonthStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const thisMonthSales = mySales.filter((transaction: any) => {
      const saleDate = new Date(transaction.sold_at);
      return saleDate >= monthStart && saleDate <= monthEnd;
    });
    
    const revenue = thisMonthSales.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    return {
      count: thisMonthSales.length,
      revenue,
      commission: revenue * (commissionRate / 100)
    };
  }, [mySales, commissionRate]);

  // Calculate this week's stats
  const thisWeekStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    const thisWeekSales = mySales.filter((transaction: any) => {
      const saleDate = new Date(transaction.sold_at);
      return saleDate >= weekStart && saleDate <= weekEnd;
    });
    
    const revenue = thisWeekSales.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    return {
      count: thisWeekSales.length,
      revenue,
      commission: revenue * (commissionRate / 100)
    };
  }, [mySales, commissionRate]);

  const handleViewSale = (saleId: number) => {
    setSelectedSaleId(saleId);
  };

  const handleEmailReceipt = (transaction: any) => {
    EmailService.sendReceipt({
      saleId: transaction.id.toString(),
      customerName: transaction.customer_name || transaction.customer_email,
      items: transaction.sale_items || [],
      total: transaction.total,
      soldAt: transaction.sold_at,
      paymentMethod: transaction.payment,
      notes: transaction.notes
    });
  };

  const handlePrintReceipt = (transaction: any) => {
    navigate(`/receipt/${transaction.id}`);
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    await queryClient.refetchQueries({ queryKey: ['transactions'] });
    toast({
      title: "Data Refreshed",
      description: "Your sales data has been updated"
    });
  };

  const toggleExpanded = (saleId: number) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedSales(newExpanded);
  };

  // Quick date filters
  const setQuickFilter = (period: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    switch (period) {
      case 'today':
        setFilters(prev => ({
          ...prev,
          dateRange: {
            from: format(startOfDay(now), 'yyyy-MM-dd'),
            to: format(endOfDay(now), 'yyyy-MM-dd')
          }
        }));
        break;
      case 'week':
        setFilters(prev => ({
          ...prev,
          dateRange: {
            from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
            to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
          }
        }));
        break;
      case 'month':
        setFilters(prev => ({
          ...prev,
          dateRange: {
            from: format(startOfMonth(now), 'yyyy-MM-dd'),
            to: format(endOfMonth(now), 'yyyy-MM-dd')
          }
        }));
        break;
      case 'all':
        setFilters(prev => ({
          ...prev,
          dateRange: { from: '', to: '' }
        }));
        break;
    }
  };

  const columns = [
    {
      key: 'expand',
      title: '',
      render: (value: any, row: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (row?.id) {
              toggleExpanded(row.id);
            }
          }}
        >
          {row?.id && expandedSales.has(row.id) ? 
            <ChevronDown className="h-3 w-3" /> : 
            <ChevronRight className="h-3 w-3" />
          }
        </Button>
      )
    },
    {
      key: 'sold_at',
      title: 'Date/Time',
      sortable: true,
      render: (value: any, row: any) => {
        if (!row.sold_at) {
          return <div className="text-sm text-muted-foreground">No date</div>;
        }
        
        const date = new Date(row.sold_at);
        const isValidDate = !isNaN(date.getTime()) && date.getTime() > 0;
        
        if (!isValidDate) {
          return <div className="text-sm text-muted-foreground">Invalid date</div>;
        }
        
        return (
          <div>
            <div className="font-medium">{format(date, 'MMM dd, yyyy')}</div>
            <div className="text-xs text-muted-foreground">{format(date, 'HH:mm')}</div>
          </div>
        );
      }
    },
    {
      key: 'id',
      title: 'Sale ID',
      sortable: true,
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <Badge variant={row.is_voided ? "destructive" : "outline"} className={row.is_voided ? "line-through" : ""}>
            #{row.id}
          </Badge>
          {row.is_voided && (
            <Badge variant="destructive" className="text-xs">VOID</Badge>
          )}
        </div>
      )
    },
    {
      key: 'items',
      title: 'Items',
      render: (value: any, row: any) => (
        <div className="text-sm flex items-center gap-1">
          <Package2 className="h-3 w-3" />
          {(row.sale_items && Array.isArray(row.sale_items) ? row.sale_items.length : 0)}
        </div>
      )
    },
    {
      key: 'total',
      title: 'Total',
      sortable: true,
      render: (value: any, row: any) => (
        <span className={`font-mono font-bold text-base px-2 py-1 rounded ${row.is_voided ? 'bg-destructive/10 text-destructive line-through' : 'bg-primary/5'}`}>
          £{(Number(row.total) || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'payment',
      title: 'Payment',
      render: (value: any, row: any) => (
        <Badge variant={row.payment === 'cash' ? 'secondary' : 'default'}>
          {row.payment}
        </Badge>
      )
    },
    {
      key: 'customer',
      title: 'Customer',
      render: (value: any, row: any) => (
        <div className="text-sm truncate max-w-[150px]" title={row.customer_name || row.customer_email || ''}>
          {row.customer_name || row.customer_email || <span className="text-muted-foreground">Walk-in</span>}
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: any) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewSale(row.id);
            }}
            title="View Details"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handlePrintReceipt(row);
            }}
            title="Print Receipt"
          >
            <Printer className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEmailReceipt(row);
            }}
            title="Email Receipt"
          >
            <Mail className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  // Expandable row content
  const renderExpandedRow = (row: any) => {
    if (!expandedSales.has(row.id)) return null;
    
    return (
      <tr>
        <td colSpan={8} className="p-4 bg-muted/30">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Items Sold:</h4>
            <div className="grid gap-2">
              {row.sale_items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm bg-background p-2 rounded">
                  <span>{item.products?.name || 'Unknown Product'} × {item.quantity}</span>
                  <span className="font-mono">£{(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {row.notes && (
              <div className="text-sm text-muted-foreground mt-2">
                <strong>Notes:</strong> {row.notes}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <AppLayout 
      title="My Sales" 
      subtitle="Track your personal sales and commission"
      showSearch
    >
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 auto-rows-fr">
          {/* Revenue Cards */}
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-[3.5rem]">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-luxury">£{thisWeekStats.revenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{thisWeekStats.count} sales</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-[3.5rem]">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-luxury">£{thisMonthStats.revenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{thisMonthStats.count} sales</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-[3.5rem]">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
              <ReceiptPoundSterling className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-luxury">{totalSales}</div>
              <p className="text-xs text-muted-foreground mt-1">in selected period</p>
            </CardContent>
          </Card>

          {/* Commission Cards */}
          {commissionEnabled && (
            <>
              <Card className="shadow-card hover:shadow-elegant transition-all duration-300 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-[3.5rem]">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Week Commission</CardTitle>
                  <Coins className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-luxury text-green-700 dark:text-green-400">£{thisWeekStats.commission.toFixed(2)}</div>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">at {commissionRate}% rate</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-card hover:shadow-elegant transition-all duration-300 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-[3.5rem]">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Month Commission</CardTitle>
                  <Percent className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-luxury text-green-700 dark:text-green-400">£{thisMonthStats.commission.toFixed(2)}</div>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">at {commissionRate}% rate</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-card hover:shadow-elegant transition-all duration-300 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-[3.5rem]">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Est. Commission</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-luxury text-green-700 dark:text-green-400">£{totalCommission.toFixed(2)}</div>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">filtered period</p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Avg Sale Card - only show if commission is disabled to keep grid even */}
          {!commissionEnabled && (
            <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-[3.5rem]">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Sale</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-luxury">£{avgSale.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">per transaction</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-4">
              <span className="font-luxury flex items-center gap-2">
                <User className="h-5 w-5" />
                My Sales History
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              View and filter your personal sales transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick filters */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('today')}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('week')}
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('month')}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('all')}
              >
                All Time
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <DateRangePicker
                  dateRange={filters.dateRange}
                  onDateRangeChange={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select 
                  value={filters.paymentMethod} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Sale ID, customer, product..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <EnhancedTable
              data={mySales}
              columns={columns}
              loading={isLoading}
              emptyMessage="No sales found. Complete a sale in the POS to see it here."
              onRowClick={(row) => handleViewSale(row.id)}
            />
          </CardContent>
        </Card>

        {/* Sale Detail Modal */}
        <SaleDetailModal
          saleId={selectedSaleId}
          open={selectedSaleId !== null}
          onClose={() => setSelectedSaleId(null)}
        />
      </div>
    </AppLayout>
  );
}

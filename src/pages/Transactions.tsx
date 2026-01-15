import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { EnhancedTable } from '@/components/ui/enhanced-table';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { useToast } from '@/hooks/use-toast';
import { useTransactions, useTransactionDetails } from '@/hooks/useDatabase';
import { useAuth } from '@/contexts/AuthContext';
import { exportTransactionsCSV } from '@/utils/csvExport';
import { EmailService } from '@/components/integrations/EmailService';
import { 
  ReceiptPoundSterling, 
  Eye, 
  Printer,
  Download,
  Calendar,
  PoundSterling,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Package2,
  ArrowRight,
  Plus,
  FileText,
  Search,
  Mail,
  ExternalLink,
  Edit,
  Ban,
  X
} from 'lucide-react';
import { usePermissions, CRM_MODULES } from '@/hooks/usePermissions';
import { VoidSaleModal } from '@/components/transactions/VoidSaleModal';
import { EditSaleModal } from '@/components/transactions/EditSaleModal';
import { format, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SaleDetailModal } from '@/components/transactions/SaleDetailModal';

interface TransactionsFilters {
  dateRange: DateRange;
  paymentMethod: string;
  staffId: string;
  searchQuery: string;
}

export default function Transactions() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: transactionsData = [], isLoading } = useTransactions();
  const { canEdit, canDelete } = usePermissions();
  const canEditSales = canEdit(CRM_MODULES.SALES);
  const canVoidSales = canDelete(CRM_MODULES.SALES);
  
  const [filters, setFilters] = useState<TransactionsFilters>({
    dateRange: { from: '', to: '' },
    paymentMethod: 'all',
    staffId: 'all',
    searchQuery: ''
  });

  const [expandedSales, setExpandedSales] = useState<Set<number>>(new Set());
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [voidingSaleId, setVoidingSaleId] = useState<number | null>(null);

  // Handle opening modal from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) {
      const saleId = parseInt(idParam);
      if (!isNaN(saleId)) {
        setSelectedSaleId(saleId);
        // Clean up URL without reloading
        window.history.replaceState({}, '', '/sales/transactions');
      }
    }
  }, []);

  // Get unique staff and payment methods from data
  const staffOptions = useMemo(() => {
    const staff = new Set();
    transactionsData.forEach((transaction: any) => {
      const staffName = transaction.staff_member_name || transaction.profiles?.full_name;
      if (staffName) {
        staff.add(JSON.stringify({
          id: transaction.staff_id,
          name: staffName
        }));
      }
    });
    return Array.from(staff).map(s => JSON.parse(s as string));
  }, [transactionsData]);

  const paymentMethods = useMemo(() => {
    const methods = new Set();
    transactionsData.forEach((transaction: any) => {
      if (transaction.payment) methods.add(transaction.payment);
    });
    return Array.from(methods) as string[];
  }, [transactionsData]);

  const filteredTransactions = useMemo(() => {
    if (!transactionsData || !Array.isArray(transactionsData)) {
      return [];
    }
    
    return transactionsData.filter((transaction: any) => {
      if (!transaction || typeof transaction !== 'object') return false;
      
      const saleDate = new Date(transaction.sold_at);
      const isValidDate = !isNaN(saleDate.getTime());
      
      if (!isValidDate) return false;
      
      const fromDate = filters.dateRange.from ? startOfDay(new Date(filters.dateRange.from)) : null;
      const toDate = filters.dateRange.to ? endOfDay(new Date(filters.dateRange.to)) : null;
      
      const matchesDateRange = (!fromDate || saleDate >= fromDate) &&
                               (!toDate || saleDate <= toDate);
      const matchesPayment = !filters.paymentMethod || filters.paymentMethod === 'all' || transaction.payment === filters.paymentMethod;
      const matchesStaff = !filters.staffId || filters.staffId === 'all' || transaction.staff_id === filters.staffId;
      
      // Search functionality - search by sale ID, customer name, customer email, or product names/SKUs
      const searchLower = filters.searchQuery?.toLowerCase() || '';
      const matchesSearch = !filters.searchQuery || 
        String(transaction.id).includes(filters.searchQuery) ||
        (transaction.customer_name && transaction.customer_name.toLowerCase().includes(searchLower)) ||
        (transaction.customer_email && transaction.customer_email.toLowerCase().includes(searchLower)) ||
        (transaction.sale_items && transaction.sale_items.some((item: any) => 
          item.products?.name?.toLowerCase().includes(searchLower) ||
          item.products?.sku?.toLowerCase().includes(searchLower) ||
          item.products?.internal_sku?.toLowerCase().includes(searchLower)
        ));
      
      return matchesDateRange && matchesPayment && matchesStaff && matchesSearch;
    });
  }, [transactionsData, filters]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredTransactions.forEach((transaction: any) => {
      const method = transaction.payment || 'other';
      breakdown[method] = (breakdown[method] || 0) + 1;
    });
    return breakdown;
  }, [filteredTransactions]);

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
      description: "Transaction data has been updated"
    });
  };

  const handleExportCSV = () => {
    if (userRole !== 'owner') {
      toast({
        title: "Access Denied",
        description: "Only owners can export data",
        variant: "destructive"
      });
      return;
    }
    
    exportTransactionsCSV(filteredTransactions, `transactions-${new Date().toISOString().split('T')[0]}.csv`);
    toast({
      title: "Export Complete",
      description: "Transaction data has been exported to CSV"
    });
  };

  const handleViewSoldItems = () => {
    const params = new URLSearchParams();
    if (filters.dateRange.from) params.set('from', filters.dateRange.from);
    if (filters.dateRange.to) params.set('to', filters.dateRange.to);
    if (filters.staffId !== 'all') params.set('staff', filters.staffId);
    
    navigate(`/sales/items?${params.toString()}`);
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

  const columns = [
    {
      key: 'expand',
      title: '',
      width: 50,
      render: (value, row, index) => (
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
      width: 140,
      render: (value, row, index) => {
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
      width: 120,
      render: (value, row, index) => (
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
      width: 80,
      render: (value, row, index) => (
        <div className="text-sm flex items-center gap-1">
          <Package2 className="h-3 w-3" />
          {(row.sale_items && Array.isArray(row.sale_items) ? row.sale_items.length : 0)}
        </div>
      )
    },
    {
      key: 'subtotal',
      title: 'Subtotal',
      sortable: true,
      render: (value, row, index) => (
        <span className="font-mono">£{(Number(row.subtotal) || 0).toFixed(2)}</span>
      )
    },
    {
      key: 'discount_total',
      title: 'Discount',
      sortable: true,
      render: (value, row, index) => (
        <span className="font-mono text-success">
          {(Number(row.discount_total) || 0) > 0 ? `-£${(Number(row.discount_total) || 0).toFixed(2)}` : '-'}
        </span>
      )
    },
    {
      key: 'tax_total',
      title: 'Tax',
      sortable: true,
      render: (value, row, index) => (
        <span className="font-mono text-muted-foreground">
          £{(Number(row.tax_total) || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'total',
      title: 'Net Total',
      sortable: true,
      render: (value, row, index) => (
        <span className={`font-mono font-black text-base px-2 py-1 rounded ${row.is_voided ? 'bg-destructive/10 text-destructive line-through' : 'bg-primary/5'}`}>
          £{(Number(row.total) || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'payment',
      title: 'Payment',
      render: (value, row, index) => (
        <Badge variant={row.payment === 'cash' ? 'secondary' : 'default'}>
          {row.payment}
        </Badge>
      )
    },
    {
      key: 'staff',
      title: 'Staff',
      render: (value, row, index) => (
        <div className="text-sm">
          {(row as any).staff_member_name || row.profiles?.full_name || 'Unknown'}
        </div>
      )
    },
    {
      key: 'customer',
      title: 'Customer',
      render: (value, row, index) => (
        <div className="text-sm truncate max-w-[150px]" title={row.customer_name || row.customer_email || ''}>
          {row.customer_name || row.customer_email || <span className="text-muted-foreground">Walk-in</span>}
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      width: 160,
      render: (value, row, index) => (
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
          
          {/* Edit button - Owners and Managers, only for sales with items */}
          {canEditSales && !row.is_voided && row.sale_items?.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditingSaleId(row.id);
              }}
              title="Edit Sale"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          
          {/* Void button - Owners and Managers */}
          {canVoidSales && !row.is_voided && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setVoidingSaleId(row.id);
              }}
              title="Void Sale"
              className="text-destructive hover:text-destructive"
            >
              <Ban className="h-3 w-3" />
            </Button>
          )}
        </div>
      )
    }
  ];

  // Calculate totals
  const totalSales = filteredTransactions.length;
  const totalRevenue = filteredTransactions.reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0);
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;

  return (
    <AppLayout title="Transactions" subtitle="View and analyse sales history" showSearch>
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-card hover:shadow-elegant transition-all duration-300 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
                <ReceiptPoundSterling className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-luxury">{totalSales}</div>
                <p className="text-xs text-muted-foreground mt-1">transactions in selected period</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card hover:shadow-elegant transition-all duration-300 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <PoundSterling className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-luxury">£{totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">gross after discounts</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card hover:shadow-elegant transition-all duration-300 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Sale</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-luxury">£{avgSale.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">per transaction</p>
              </CardContent>
            </Card>
          </div>
          
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-4">
              <span className="font-luxury">Filters</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleViewSoldItems}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View Sold Items
                </Button>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  aria-label="Refresh transaction data"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Filter transactions by date range, payment method, staff, or search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-range-filter">Date Range</Label>
                <DateRangePicker
                  dateRange={filters.dateRange}
                  onDateRangeChange={(dateRange) => setFilters(prev => ({ ...prev, dateRange }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-filter">Payment Method</Label>
                <Select
                  value={filters.paymentMethod}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger id="payment-filter" aria-label="Filter by payment method">
                    <SelectValue placeholder="All payment methods" />
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
                <Label htmlFor="staff-filter">Staff Member</Label>
                <Select
                  value={filters.staffId}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, staffId: value }))}
                >
                  <SelectTrigger id="staff-filter" aria-label="Filter by staff member">
                    <SelectValue placeholder="All staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffOptions.map(staff => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="search-filter">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="search-filter"
                    placeholder="Sale ID, customer, or product..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="pl-9"
                    aria-label="Search transactions"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  dateRange: { from: new Date().toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
                  paymentMethod: 'all',
                  staffId: 'all',
                  searchQuery: ''
                })}
                aria-label="Show today's transactions"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  dateRange: { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
                  paymentMethod: 'all',
                  staffId: 'all',
                  searchQuery: ''
                })}
                aria-label="Show last 7 days transactions"
              >
                7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  dateRange: { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
                  paymentMethod: 'all',
                  staffId: 'all',
                  searchQuery: ''
                })}
                aria-label="Show last 30 days transactions"
              >
                30 Days
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({
                  dateRange: { from: '', to: '' },
                  paymentMethod: 'all',
                  staffId: 'all',
                  searchQuery: ''
                })}
                aria-label="Reset all filters"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
              
              {userRole === 'owner' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="ml-auto"
                  aria-label="Export transactions to CSV"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-luxury">Transaction List</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transactions found
              {filters.searchQuery && ` for "${filters.searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnhancedTable
              data={filteredTransactions}
              columns={columns}
              loading={isLoading}
              emptyMessage="No transactions found for the selected filters"
              showPageTotals={true}
              pageTotalsConfig={{
                subtotal: (row: any) => Number(row.subtotal) || 0,
                discount: (row: any) => Number(row.discount_total) || 0,
                tax: (row: any) => Number(row.tax_total) || 0,
                total: (row: any) => Number(row.total) || 0
              }}
              expandedRows={expandedSales}
              getRowId={(row: any) => row.id}
              renderExpandedContent={(row: any) => (
                <TransactionDetails saleId={row.id} />
              )}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Sale Detail Modal */}
      {selectedSaleId && (
        <SaleDetailModal
          saleId={selectedSaleId}
          open={!!selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
        />
      )}
      
      {/* Edit Sale Modal */}
      {editingSaleId && (
        <EditSaleModal
          open={!!editingSaleId}
          onOpenChange={(open) => !open && setEditingSaleId(null)}
          saleId={editingSaleId}
          onSuccess={async () => {
            setEditingSaleId(null);
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }}
        />
      )}
      
      {/* Void Sale Modal */}
      {voidingSaleId && (() => {
        const voidingSale = transactionsData.find((t: any) => t.id === voidingSaleId);
        return voidingSale ? (
          <VoidSaleModal
            open={!!voidingSaleId}
            onOpenChange={(open) => !open && setVoidingSaleId(null)}
            saleId={voidingSaleId}
            saleTotal={voidingSale.total}
            onSuccess={async () => {
              setVoidingSaleId(null);
              await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            }}
          />
        ) : null;
      })()}
    </AppLayout>
  );
}

// Transaction details component for expandable rows
function TransactionDetails({ saleId }: { saleId: number }) {
  const { data: details, isLoading } = useTransactionDetails(saleId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">Loading transaction details...</div>
      </div>
    );
  }

  if (!details || (details.items?.length === 0 && details.partExchanges?.length === 0)) {
    return (
      <div className="p-4 text-muted-foreground">
        No items found for this transaction
      </div>
    );
  }

  const { userRole } = useAuth();
  const items = details.items || [];
  const partExchanges = details.partExchanges || [];

  return (
    <div className="mt-4 p-6 bg-muted/20 rounded-lg space-y-4 border-l-4 border-primary">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-lg">Transaction Items</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/sales/items?sale=${saleId}`)}
        >
          <ExternalLink className="h-3 w-3 mr-2" />
          Open in Sold Items
        </Button>
      </div>
      
      <div className="space-y-3">
        {items.map((item: any) => {
          const lineRevenue = (item.quantity * item.unit_price) - (item.discount || 0);
          const lineCost = item.quantity * (item.unit_cost || 0);
          const grossProfit = lineRevenue - lineCost;
          const product = item.products;

          return (
            <div key={item.id} className="grid grid-cols-[1fr,auto,auto] gap-4 items-center p-4 bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-base">{product?.name || 'Unknown Product'}</div>
                    <div className="text-sm text-muted-foreground space-x-2">
                      {product?.sku && <span>SKU: {product.sku}</span>}
                      {product?.internal_sku && <span>• Internal: {product.internal_sku}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {product?.is_trade_in && (
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-300">
                      PX (Part Exchange)
                    </Badge>
                  )}
                  {product?.is_consignment && (
                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-300">
                      Consignment
                    </Badge>
                  )}
                  {product?.is_registered && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-300">
                      Registered
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/products?id=${item.product_id}`)}
                    aria-label="View product details"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Product
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/sales/sold-items?saleItemId=${item.id}`)}
                    aria-label="View sold item details"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    View Sold Item
                  </Button>
                </div>
              </div>
              
              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">Unit Price</div>
                <div className="font-mono text-base">£{item.unit_price?.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
                {(item.discount || 0) > 0 && (
                  <div className="text-sm text-success font-medium">Discount: -£{item.discount.toFixed(2)}</div>
                )}
              </div>
              
              <div className="text-right space-y-1 min-w-[140px]">
                <div className="text-sm text-muted-foreground">Line Total</div>
                <div className="font-mono font-bold text-lg">£{lineRevenue.toFixed(2)}</div>
                {userRole === 'owner' && (
                  <>
                    <div className="text-xs text-muted-foreground">
                      COGS: £{lineCost.toFixed(2)}
                    </div>
                    <div className={`text-sm font-semibold ${grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      GP: £{grossProfit.toFixed(2)}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Part Exchange Items */}
        {partExchanges.map((px: any) => (
          <div
            key={`px-${px.id}`}
            className="grid grid-cols-[1fr,auto,auto] gap-4 items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm"
          >
            <div className="space-y-2">
              <div>
                <div className="font-medium text-base text-blue-900 dark:text-blue-100">
                  Part Exchange: {px.title || px.description || 'Trade-In Item'}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-x-2">
                  {px.serial && <span>SKU: {px.serial}</span>}
                  {px.category && <span>• {px.category}</span>}
                </div>
              </div>
              
              {px.customer_name && (
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Customer: {px.customer_name}
                  {px.customer_contact && ` • ${px.customer_contact}`}
                </div>
              )}
              
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-300 w-fit">
                Part Exchange Allowance
              </Badge>
            </div>
            
            <div className="text-right space-y-1">
              <div className="text-sm text-blue-700 dark:text-blue-300">Allowance</div>
              <div className="font-mono text-base text-blue-900 dark:text-blue-100">-£{px.allowance?.toFixed(2)}</div>
            </div>
            
            <div className="text-right space-y-1 min-w-[140px]">
              <div className="text-sm text-blue-700 dark:text-blue-300">Line Total</div>
              <div className="font-mono font-bold text-lg text-blue-900 dark:text-blue-100">-£{px.allowance?.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Calculation Breakdown */}
      <div className="mt-4 p-4 bg-background rounded-lg border">
        <h5 className="text-sm font-semibold mb-2">Calculation Breakdown</h5>
        <div className="space-y-1 text-sm font-mono">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>£{items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}</span>
          </div>
          {items.reduce((sum, item) => sum + (item.discount || 0), 0) > 0 && (
            <div className="flex justify-between text-success">
              <span>- Discount:</span>
              <span>£{items.reduce((sum, item) => sum + (item.discount || 0), 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>+ Tax:</span>
            <span>£{items.reduce((sum, item) => {
              const lineTotal = (item.quantity * item.unit_price) - (item.discount || 0);
              return sum + (item.tax_rate ? lineTotal * (item.tax_rate / 100) : 0);
            }, 0).toFixed(2)}</span>
          </div>
          {partExchanges.length > 0 && (
            <div className="flex justify-between text-blue-700 dark:text-blue-300">
              <span>- Part Exchange:</span>
              <span>£{partExchanges.reduce((sum, px) => sum + (px.allowance || 0), 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>= Net Total:</span>
            <span>£{(
              items.reduce((sum, item) => {
                const lineTotal = (item.quantity * item.unit_price) - (item.discount || 0);
                const tax = item.tax_rate ? lineTotal * (item.tax_rate / 100) : 0;
                return sum + lineTotal + tax;
              }, 0) - partExchanges.reduce((sum, px) => sum + (px.allowance || 0), 0)
            ).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
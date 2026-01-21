import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EnhancedTable } from '@/components/ui/enhanced-table';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { useToast } from '@/hooks/use-toast';
import { useSoldItemsReport, useProducts } from '@/hooks/useDatabase';
import { useAuth } from '@/contexts/AuthContext';
import { exportSoldItemsCSV } from '@/utils/csvExport';
import { getDateRange } from '@/lib/utils';
import { 
  Package, 
  Search,
  Download,
  Calendar,
  PoundSterling,
  TrendingUp,
  Hash,
  Filter,
  RefreshCw,
  ArrowLeft,
  Eye,
  Printer,
  X,
  Ban
} from 'lucide-react';
import { SaleDetailModal } from '@/components/transactions/SaleDetailModal';
import { ProductDetailModal } from '@/components/modals/ProductDetailModal';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ConsignmentBadge } from '@/components/ui/consignment-badge';
import { TradeInBadge } from '@/components/ui/trade-in-badge';
import { MonthPicker } from '@/components/reports/MonthPicker';
import type { DateRange } from '@/types';

interface SoldItemsFilters {
  dateRange: DateRange;
  productSearch: string;
  category: string;
  metal: string;
  staffId: string;
  supplierId: string;
  flags: {
    consignment: boolean;
    partExchange: boolean;
    registered: boolean;
  };
  saleId?: string;
}

export default function SoldItemsReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: soldItemsData = [], isLoading } = useSoldItemsReport();
  const { data: products = [] } = useProducts();
  
  const [filters, setFilters] = useState<SoldItemsFilters>({
    dateRange: {
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || ''
    },
    productSearch: '',
    category: 'all',
    metal: 'all',
    staffId: searchParams.get('staff') || 'all',
    supplierId: 'all',
    flags: {
      consignment: false,
      partExchange: false,
      registered: false
    },
    saleId: searchParams.get('sale') || undefined
  });

  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [focusedLineItemId, setFocusedLineItemId] = useState<number | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productDetailOpen, setProductDetailOpen] = useState(false);

  // Update filters from URL params on mount
  useEffect(() => {
    const newFilters = { ...filters };
    if (searchParams.get('from')) newFilters.dateRange.from = searchParams.get('from')!;
    if (searchParams.get('to')) newFilters.dateRange.to = searchParams.get('to')!;
    if (searchParams.get('staff')) newFilters.staffId = searchParams.get('staff')!;
    if (searchParams.get('sale')) newFilters.saleId = searchParams.get('sale')!;
    setFilters(newFilters);
  }, [searchParams]);

  // Get unique options from data
  const filterOptions = useMemo(() => {
    const categories = new Set();
    const metals = new Set();
    const staff = new Set();
    const suppliers = new Map();

    soldItemsData.forEach((item: any) => {
      if (item?.products?.category) categories.add(item.products.category);
      if (item?.products?.metal) metals.add(item.products.metal);
      const staffName = (item?.sales as any)?.staff_member_name || item?.sales?.profiles?.full_name;
      if (staffName) {
        staff.add(JSON.stringify({
          id: item.sales.staff_id,
          name: staffName
        }));
      }
      
      // Collect all suppliers (regular and customer suppliers)
      if (item?.supplier) {
        suppliers.set(item.supplier.id, {
          id: item.supplier.id,
          name: item.supplier_name || item.supplier.name,
          type: item.supplier.supplier_type
        });
      }
    });

    return {
      categories: Array.from(categories) as string[],
      metals: Array.from(metals) as string[],
      staff: Array.from(staff).map(s => JSON.parse(s as string)),
      suppliers: Array.from(suppliers.values()).sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [soldItemsData]);

  const filteredItems = useMemo(() => {
    if (!soldItemsData || !Array.isArray(soldItemsData)) {
      return [];
    }
    
    return soldItemsData.filter((item: any) => {
      if (!item || typeof item !== 'object') return false;
      
      // Exclude trade-in products from sold items report
      if (item?.products?.is_trade_in === true) return false;
      
      const saleDate = new Date(item.sold_at);
      const isValidDate = !isNaN(saleDate.getTime());
      
      if (!isValidDate) return false;
      
      // Date range filter - handle empty strings properly
      const fromDate = filters.dateRange.from && filters.dateRange.from.trim() && filters.dateRange.from !== 'undefined'
        ? startOfDay(new Date(filters.dateRange.from)) 
        : null;
      const toDate = filters.dateRange.to && filters.dateRange.to.trim() && filters.dateRange.to !== 'undefined'
        ? endOfDay(new Date(filters.dateRange.to)) 
        : null;
      const matchesDateRange = (!fromDate || saleDate >= fromDate) && (!toDate || saleDate <= toDate);
      
      // Product search filter
      const matchesProductSearch = !filters.productSearch || filters.productSearch.trim() === '' ||
        (item?.products?.name && item.products.name.toLowerCase().includes(filters.productSearch.toLowerCase())) ||
        (item?.products?.internal_sku && item.products.internal_sku.toLowerCase().includes(filters.productSearch.toLowerCase())) ||
        (item?.products?.sku && item.products.sku.toLowerCase().includes(filters.productSearch.toLowerCase()));
      
      // Category and metal filters
      const matchesCategory = !filters.category || filters.category === 'all' || filters.category === '' || item?.products?.category === filters.category;
      const matchesMetal = !filters.metal || filters.metal === 'all' || filters.metal === '' || item?.products?.metal === filters.metal;
      
      // Staff filter
      const matchesStaff = !filters.staffId || filters.staffId === 'all' || filters.staffId === '' || item?.sales?.staff_id === filters.staffId;
      
      // Supplier filter
      const matchesSupplier = !filters.supplierId || filters.supplierId === 'all' || filters.supplierId === '' || 
        (item?.supplier && item.supplier.id?.toString() === filters.supplierId);
      
      // Sale ID filter (from URL params)
      const matchesSale = !filters.saleId || filters.saleId === '' || item.sale_id?.toString() === filters.saleId;
      
      // Flags filter
      const hasActiveFlags = filters.flags.consignment || filters.flags.partExchange || filters.flags.registered;
      const matchesFlags = !hasActiveFlags || (
        (!filters.flags.consignment || item?.products?.is_consignment) &&
        (!filters.flags.partExchange || item?.products?.is_trade_in) &&
        (!filters.flags.registered || item?.products?.is_registered)
      );
      
      return matchesDateRange && matchesProductSearch && matchesCategory && matchesMetal && matchesStaff && matchesSupplier && matchesSale && matchesFlags;
    });
  }, [soldItemsData, filters]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['sold-items-report'] });
    await queryClient.refetchQueries({ queryKey: ['sold-items-report'] });
    toast({
      title: "Data Refreshed",
      description: "Sold items data has been updated"
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
    
    exportSoldItemsCSV(filteredItems, `sold-items-${new Date().toISOString().split('T')[0]}.csv`);
    toast({
      title: "Export Complete",
      description: "Sold items data has been exported to CSV"
    });
  };

  const handleViewTransactions = () => {
    const params = new URLSearchParams();
    if (filters.dateRange.from) params.set('from', filters.dateRange.from);
    if (filters.dateRange.to) params.set('to', filters.dateRange.to);
    if (filters.staffId !== 'all') params.set('staff', filters.staffId);
    
    navigate(`/sales/transactions?${params.toString()}`);
  };

  const columns = [
    {
      key: 'sold_at',
      title: 'Date',
      sortable: true,
      width: 130,
      render: (value: any, row: any, index: number) => {
        const date = new Date(row.sold_at);
        const isValidDate = !isNaN(date.getTime());
        const isVoided = row?.sales?.is_voided;
        
        if (!isValidDate) {
          return <div className="text-sm text-muted-foreground">Invalid date</div>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <div>
              <div className={`font-medium ${isVoided ? 'line-through text-muted-foreground' : ''}`}>{format(date, 'MMM dd, yyyy')}</div>
              <div className="text-xs text-muted-foreground">{format(date, 'HH:mm')}</div>
            </div>
            {isVoided && (
              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                <Ban className="h-3 w-3" />
                VOID
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      key: 'product',
      title: 'Product',
      sortable: true,
      width: 280,
      render: (value: any, row: any, index: number) => (
        <div>
          <button
            onClick={() => {
              setSelectedProductId(row.product_id);
              setProductDetailOpen(true);
            }}
            className="font-medium text-left hover:text-primary hover:underline transition-colors"
          >
            {row?.products?.name || 'Unknown Product'}
          </button>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {row?.products?.internal_sku && (
              <div>INT: {row.products.internal_sku}</div>
            )}
            {row?.products?.sku && (
              <div>SKU: {row.products.sku}</div>
            )}
          </div>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {row?.products?.is_consignment && <ConsignmentBadge className="text-xs" />}
            {row?.products?.is_trade_in && <TradeInBadge className="text-xs" />}
            {row?.products?.is_registered && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                Reg
              </Badge>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'serial',
      title: 'Serial Number',
      width: 140,
      render: (value: any, row: any, index: number) => (
        <span className="font-mono text-sm">{row.serial || '-'}</span>
      )
    },
    {
      key: 'unit_cost',
      title: 'Unit Cost',
      sortable: true,
      width: 110,
      render: (value: any, row: any, index: number) => (
        <span className="font-mono">£{(row.unit_cost || 0).toFixed(2)}</span>
      )
    },
    {
      key: 'line_revenue',
      title: 'Revenue',
      sortable: true,
      width: 120,
      render: (value: any, row: any, index: number) => {
        const isVoided = row?.sales?.is_voided;
        return (
          <span className={`font-mono font-bold ${isVoided ? 'line-through text-muted-foreground' : ''}`}>
            £{(row.line_revenue || 0).toFixed(2)}
          </span>
        );
      }
    },
    {
      key: 'margin',
      title: 'Markup %',
      sortable: true,
      width: 110,
      render: (value: any, row: any, index: number) => {
        const markup = row.line_cogs > 0 ? (row.line_gross_profit / row.line_cogs) * 100 : 0;
        return (
          <span className={`font-mono font-bold ${markup >= 0 ? 'text-success' : 'text-destructive'}`}>
            {markup.toFixed(1)}%
          </span>
        );
      }
    },
    {
      key: 'staff',
      title: 'Staff',
      width: 130,
      render: (value: any, row: any, index: number) => (
        <div className="text-sm">
          {(row?.sales as any)?.staff_member_name || row?.sales?.profiles?.full_name || '-'}
        </div>
      )
    },
    {
      key: 'customer',
      title: 'Customer',
      width: 150,
      render: (value: any, row: any, index: number) => {
        const customerId = (row?.sales as any)?.customer_id;
        const customerName = (row?.sales as any)?.customer_name;
        
        if (!customerName) return <div className="text-sm text-muted-foreground">-</div>;
        
        if (customerId) {
          return (
            <button
              onClick={() => navigate(`/customers/${customerId}`)}
              className="text-sm text-primary hover:underline text-left"
            >
              {customerName}
            </button>
          );
        }
        
        return <div className="text-sm">{customerName}</div>;
      }
    },
    {
      key: 'location',
      title: 'Location',
      width: 120,
      render: (value: any, row: any, index: number) => {
        const locationName = (row?.sales as any)?.locations?.name;
        return (
          <div className="text-sm text-muted-foreground">
            {locationName || '-'}
          </div>
        );
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      width: 100,
      render: (value: any, row: any, index: number) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSaleId(row.sale_id)}
            title="View Transaction"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedProductId(row.product_id);
              setProductDetailOpen(true);
            }}
            title="Open Product"
          >
            <Package className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/receipt/${row.sale_id}`)}
            title="Print Receipt"
          >
            <Printer className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  // Calculate totals
  const totals = useMemo(() => {
    if (!filteredItems || !Array.isArray(filteredItems)) {
      return { revenue: 0, cogs: 0, profit: 0, items: 0, tradeInCount: 0 };
    }
    
    // Count how many trade-ins are excluded
    const tradeInCount = soldItemsData?.filter((item: any) => item?.products?.is_trade_in === true).length || 0;
    
    return filteredItems.reduce(
      (acc, item) => ({
        revenue: acc.revenue + (item.line_revenue || 0),
        cogs: acc.cogs + (item.line_cogs || 0),
        profit: acc.profit + (item.line_gross_profit || 0),
        items: acc.items + (item.quantity || 0),
        tradeInCount
      }),
      { revenue: 0, cogs: 0, profit: 0, items: 0, tradeInCount }
    );
  }, [filteredItems, soldItemsData]);

  return (
    <>
      {selectedSaleId && (
        <SaleDetailModal 
          saleId={selectedSaleId}
          open={selectedSaleId !== null}
          onClose={() => {
            setSelectedSaleId(null);
            setFocusedLineItemId(undefined);
          }}
          focusLineItemId={focusedLineItemId}
        />
      )}
      
      <ProductDetailModal
        product={selectedProductId ? products.find(p => p.id === selectedProductId) || null : null}
        open={productDetailOpen}
        onOpenChange={setProductDetailOpen}
        soldInfo={
          selectedProductId 
            ? filteredItems.find(item => item.product_id === selectedProductId) 
              ? {
                  soldAt: filteredItems.find(item => item.product_id === selectedProductId)!.sold_at,
                  salePrice: filteredItems.find(item => item.product_id === selectedProductId)!.unit_price,
                  saleId: filteredItems.find(item => item.product_id === selectedProductId)!.sale_id
                }
              : undefined
            : undefined
        }
        onEditClick={() => {
          setProductDetailOpen(false);
          navigate(`/products?id=${selectedProductId}`);
        }}
        onDuplicateClick={() => {
          setProductDetailOpen(false);
          navigate(`/products?duplicate=${selectedProductId}`);
        }}
      />
      
      <AppLayout 
        title="Sold Items" 
        subtitle="Detailed sales item analysis" 
        showSearch
      >
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6" role="region" aria-label="Summary statistics">
          {isLoading ? (
            // Loading skeletons
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 w-24 bg-muted/50 animate-pulse rounded" />
                    <div className="h-4 w-4 bg-muted/50 animate-pulse rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-20 bg-muted/50 animate-pulse rounded mb-2" />
                    <div className="h-3 w-32 bg-muted/50 animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items Sold</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-luxury">{totals.items}</div>
              <p className="text-xs text-muted-foreground mt-1">
                across {filteredItems.length} line items
                {totals.tradeInCount > 0 && (
                  <span className="ml-1">({totals.tradeInCount} PX excluded)</span>
                )}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-success">Total Revenue</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-luxury text-success">£{totals.revenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">gross revenue</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total COGS</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-luxury">£{totals.cogs.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">cost of goods sold</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-luxury ${totals.profit >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                £{totals.profit.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.revenue > 0 ? `${((totals.profit / totals.revenue) * 100).toFixed(1)}%` : '0%'} margin
              </p>
            </CardContent>
          </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-foreground text-base">Filters</CardTitle>
                {filters.saleId && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Filtered by Sale #{filters.saleId}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost" 
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                aria-label="Refresh data"
                className="h-8 px-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {/* Row 1: Month Picker - Primary Navigation */}
            <MonthPicker
              dateRange={filters.dateRange}
              onMonthSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
              monthsToShow={6}
              showCustom={true}
            />
            
            {/* Row 2: All filters in one compact row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {/* Search */}
              <div className="relative col-span-2 sm:col-span-1 lg:col-span-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.productSearch}
                  onChange={(e) => setFilters(prev => ({ ...prev, productSearch: e.target.value }))}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              
              {/* Staff */}
              <Select
                value={filters.staffId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, staffId: value }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {filterOptions.staff.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Supplier */}
              <Select
                value={filters.supplierId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, supplierId: value }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {filterOptions.suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name} {supplier.type === 'customer' && '(C)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Category */}
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {filterOptions.categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Metal */}
              <Select
                value={filters.metal}
                onValueChange={(value) => setFilters(prev => ({ ...prev, metal: value }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Metal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metals</SelectItem>
                  {filterOptions.metals.map(metal => (
                    <SelectItem key={metal} value={metal}>
                      {metal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Type Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-sm justify-between font-normal">
                    <span className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5" />
                      Type
                      {(filters.flags.consignment || filters.flags.partExchange || filters.flags.registered) && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] rounded-full">
                          {[filters.flags.consignment, filters.flags.partExchange, filters.flags.registered].filter(Boolean).length}
                        </Badge>
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 bg-popover" align="end">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={filters.flags.consignment}
                        onChange={() => setFilters(prev => ({
                          ...prev,
                          flags: { ...prev.flags, consignment: !prev.flags.consignment }
                        }))}
                        className="rounded border-input"
                      />
                      Consignment
                    </label>
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={filters.flags.partExchange}
                        onChange={() => setFilters(prev => ({
                          ...prev,
                          flags: { ...prev.flags, partExchange: !prev.flags.partExchange }
                        }))}
                        className="rounded border-input"
                      />
                      Part Exchange
                    </label>
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={filters.flags.registered}
                        onChange={() => setFilters(prev => ({
                          ...prev,
                          flags: { ...prev.flags, registered: !prev.flags.registered }
                        }))}
                        className="rounded border-input"
                      />
                      Registered
                    </label>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Row 3: Active Type Filters + Export (only show when filters active) */}
            {(filters.flags.consignment || filters.flags.partExchange || filters.flags.registered || userRole === 'owner') && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {filters.flags.consignment && (
                    <Badge variant="secondary" className="text-xs gap-1 pr-1">
                      Consignment
                      <button 
                        onClick={() => setFilters(prev => ({ ...prev, flags: { ...prev.flags, consignment: false } }))}
                        className="ml-0.5 hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.flags.partExchange && (
                    <Badge variant="secondary" className="text-xs gap-1 pr-1">
                      Part Exchange
                      <button 
                        onClick={() => setFilters(prev => ({ ...prev, flags: { ...prev.flags, partExchange: false } }))}
                        className="ml-0.5 hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.flags.registered && (
                    <Badge variant="secondary" className="text-xs gap-1 pr-1">
                      Registered
                      <button 
                        onClick={() => setFilters(prev => ({ ...prev, flags: { ...prev.flags, registered: false } }))}
                        className="ml-0.5 hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
                
                {userRole === 'owner' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Download className="h-3 w-3" />
                    Export
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Sold Items Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Sold Items Analysis</CardTitle>
            <CardDescription>
              {filteredItems.length} line items • {totals.items} total units
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-muted/20 animate-pulse rounded" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sold items found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters or date range to see more results
                </p>
              </div>
            ) : (
              <EnhancedTable
                data={filteredItems}
                columns={columns}
                loading={false}
                emptyMessage="No sold items found"
              />
            )}
            
            {/* Totals Bar */}
            {filteredItems.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg border border-primary/20">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <span className="font-semibold text-primary text-sm sm:text-base">Current Filter Totals:</span>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-6 text-xs sm:text-sm font-medium">
                    <div className="text-success">
                      <span className="block sm:inline text-muted-foreground text-xs">Revenue</span>
                      <strong className="text-base sm:text-lg block sm:inline sm:ml-1">£{totals.revenue.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="block sm:inline text-muted-foreground text-xs">COGS</span>
                      <strong className="text-base sm:text-lg block sm:inline sm:ml-1">£{totals.cogs.toFixed(2)}</strong>
                    </div>
                    <div className={totals.profit >= 0 ? 'text-primary' : 'text-destructive'}>
                      <span className="block sm:inline text-muted-foreground text-xs">GP</span>
                      <strong className="text-base sm:text-lg block sm:inline sm:ml-1">£{totals.profit.toFixed(2)}</strong>
                      <span className="text-xs ml-1 hidden sm:inline">({totals.revenue > 0 ? `${((totals.profit / totals.revenue) * 100).toFixed(1)}%` : '0%'})</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
    </>
  );
}
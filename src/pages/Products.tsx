import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, TrendingDown, Eye, Edit, Image as ImageIcon, AlertTriangle, PoundSterling, Award, Repeat, Copy, MapPin, Search, LayoutList, LayoutGrid } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSuppliers, useCreateProduct, useStockAdjustment } from '@/hooks/useDatabase';
import { useLocations } from '@/hooks/useLocations';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedProducts } from '@/hooks/useEnhancedProducts';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, CRM_MODULES, ACTIONS } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { EnhancedProductFilters } from '@/components/filters/EnhancedProductFilters';
import { QuickFilters } from '@/components/filters/QuickFilters';
import { ProductDetailModal } from '@/components/modals/ProductDetailModal';
import { EditProductModal } from '@/components/modals/EditProductModal';
import { ImageModal } from '@/components/ui/image-modal';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatDate } from '@/lib/utils';
import { ImageUpload } from '@/components/ui/image-upload';
import { DocumentUpload } from '@/components/ui/document-upload';
import { ProductCardSkeleton, StatsCardSkeleton } from '@/components/ui/loading-states';
import { QueryErrorHandler } from '@/components/ui/error-states';
import { getSupplierDisplayName } from '@/lib/utils';
import type { ProductInsert, ProductWithStock } from '@/types';
import type { EnhancedProductFilters as EnhancedProductFiltersType } from '@/hooks/useEnhancedProducts';
import { useStockStatus, getStockBadge } from '@/hooks/useStockStatus';
import { useConsignmentAgreements } from '@/hooks/useConsignmentAgreements';
import { ConsignmentBadge } from '@/components/ui/consignment-badge';
import { TradeInBadge } from '@/components/ui/trade-in-badge';
import { useProductTradeInStatus } from '@/hooks/useProductTradeInStatus';
import { DuplicateProductModal } from '@/components/modals/DuplicateProductModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProductTable } from '@/components/products/ProductTable';

const ProductCard = ({
  product,
  onView,
  onEdit,
  onDuplicate,
  onImageClick,
  stockStatus,
  partExchangeInfo
}: {
  product: any;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onImageClick?: () => void;
  stockStatus?: { variant: 'destructive' | 'secondary' | 'outline'; text: string };
  partExchangeInfo?: { customer_name?: string; allowance: number } | null;
}) => {
  const { user } = useAuth();
  const { canEdit } = usePermissions();
  const { hasAgreements } = useConsignmentAgreements(product.id);
  
  const stock = product.qty_on_hand || 0;
  const profit = (Number(product.unit_price) - Number(product.unit_cost)).toFixed(2);
  // Markup = (Profit / Cost) * 100 - standard jewellery industry metric
  const markup = Number(product.unit_cost) > 0 
    ? (((Number(product.unit_price) - Number(product.unit_cost)) / Number(product.unit_cost)) * 100).toFixed(1)
    : 0;
  
  // Calculate days in inventory
  const daysInInventory = Math.floor((new Date().getTime() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24));
  
  // Professional stock status with gold for in stock, neutral grey for out of stock
  const getStockStatusBadge = () => {
    if (stockStatus) {
      if (stockStatus.text.includes('Out of stock')) {
        return { variant: 'secondary' as const, text: 'Out of Stock', className: 'bg-muted text-muted-foreground' };
      } else if (stockStatus.text.includes('In Stock')) {
        return { variant: 'outline' as const, text: 'In Stock', className: 'bg-primary/10 border-primary text-primary' };
      } else if (stockStatus.text.includes('At Risk')) {
        return { variant: 'secondary' as const, text: `Low Stock • ${stock}`, className: 'bg-amber-50 text-amber-700 border-amber-200' };
      }
    }
    return stock === 0 
      ? { variant: 'secondary' as const, text: 'Out of Stock', className: 'bg-muted text-muted-foreground' }
      : { variant: 'outline' as const, text: 'In Stock', className: 'bg-primary/10 border-primary text-primary' };
  };

  const finalStockStatus = getStockStatusBadge();
  
  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Professional Thumbnail */}
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                onClick={onImageClick}
              />
            ) : (
              <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center border shadow-sm">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="font-luxury text-primary font-semibold">
                    {product.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              {/* Name, Category, Supplier */}
              <CardTitle className="font-luxury text-lg mb-1 leading-tight">{product.name}</CardTitle>
              <p className="text-sm text-muted-foreground mb-1">
                {product.category} • {getSupplierDisplayName(product)}
              </p>
              
              {/* SKU + Internal SKU + Purchase Date + Location */}
              <div className="text-xs text-muted-foreground space-y-0.5">
                {product.internal_sku && <p>SKU: {product.internal_sku}</p>}
                {(product as any).purchase_date && (
                  <p className="text-muted-foreground">
                    Purchased: {formatDate((product as any).purchase_date, 'short')}
                  </p>
                )}
                {product.location && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {product.location.name}
                  </p>
                )}
                {/* Trade-in origin info */}
                {partExchangeInfo && (
                  <p className="text-amber-600 font-medium flex items-center gap-1">
                    <Repeat className="h-3 w-3" />
                    From trade-in
                    {partExchangeInfo.customer_name && `: ${partExchangeInfo.customer_name}`}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Top-right badges */}
          <div className="flex flex-col items-end gap-1 ml-2">
            <Badge 
              variant={finalStockStatus.variant} 
              className={`whitespace-nowrap text-xs ${finalStockStatus.className}`}
            >
              {finalStockStatus.text}
            </Badge>
            
            {/* Smaller tags below stock badge */}
            <div className="flex flex-col gap-1">
              {product.is_consignment && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
                  Consignment
                </Badge>
              )}
              {product.is_trade_in && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
                  PX
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Price Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Sell Price</p>
            <p className="font-luxury text-xl font-bold text-primary">£{Number(product.unit_price).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Cost</p>
            <p className="text-lg text-muted-foreground">£{Number(product.unit_cost).toFixed(2)}</p>
          </div>
        </div>
        
        {/* Profit Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Profit</p>
            <p className={`font-medium ${Number(profit) > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              £{profit}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Markup</p>
            <p className={`font-medium ${Number(markup) >= 50 ? 'text-success' : Number(markup) >= 25 ? 'text-foreground' : 'text-warning'}`}>
              {markup}%
            </p>
          </div>
        </div>
        
        {/* Metal/Gemstone Info */}
        {product.metal && (
          <div className="text-xs text-muted-foreground mb-4">
            {product.metal} {product.karat && `(${product.karat})`}
            {product.gemstone && ` • ${product.gemstone}`}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="mt-auto">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
            {canEdit(CRM_MODULES.PRODUCTS) && (
              <>
                <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate();
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Duplicate this product</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


export default function Products() {
  const { user } = useAuth();
  const { canCreate, canEdit } = usePermissions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: suppliers = [] } = useSuppliers();
  const { data: locations = [] } = useLocations();
  const { data: filterOptions, isLoading: filterOptionsLoading } = useFilterOptions();
  const createProduct = useCreateProduct();
  const stockAdjustment = useStockAdjustment();

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{src: string; alt: string} | null>(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [productToDuplicate, setProductToDuplicate] = useState(null);
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EnhancedProductFiltersType>({
    categories: [],
    metals: [],
    karats: [],
    gemstones: [],
    suppliers: [],
    locations: [],
    stockLevel: 'all',
    priceRange: { min: 0, max: 50000 },
    marginRange: { min: 0, max: 100 },
    isTradeIn: 'all',
    inventoryAge: 'all',
    sortBy: 'newest'
  });

  // Initialize price range when filter options load
  useEffect(() => {
    if (filterOptions) {
      setFilters(prev => ({
        ...prev,
        priceRange: filterOptions.priceRange
      }));
    }
  }, [filterOptions]);

  const { data: products = [], isLoading, error } = useEnhancedProducts(filters);
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Handle ?age= query parameter to apply inventory age filter
  useEffect(() => {
    const ageParam = searchParams.get('age');
    if (ageParam && ['30', '60', '90'].includes(ageParam)) {
      setFilters(prev => ({
        ...prev,
        inventoryAge: ageParam as '30' | '60' | '90'
      }));
    }
  }, [searchParams]);
  
  // Handle ?id= query parameter to open product detail modal
  useEffect(() => {
    const productId = searchParams.get('id');
    if (productId && !viewModalOpen) {
      // First check if product is in loaded products
      const product = products.find(p => String(p.id) === String(productId));
      if (product) {
        setSelectedProduct(product);
        setViewModalOpen(true);
        return;
      }
      
      // If not found in loaded products, fetch it directly
      const fetchProduct = async () => {
        try {
          const productIdNum = parseInt(productId);
          if (isNaN(productIdNum)) {
            toast({
              title: "Invalid product ID",
              description: "The product ID in the URL is not valid.",
              variant: "destructive"
            });
            setSearchParams({});
            return;
          }
          
          const { data, error } = await supabase
            .from('products')
            .select('*, supplier:suppliers!supplier_id(name)')
            .eq('id', productIdNum)
            .single();
          
          if (error) throw error;
          
          if (data) {
            // Get stock info for the product
            const { data: stockData } = await supabase
              .from('v_stock_on_hand')
              .select('*')
              .eq('product_id', productIdNum)
              .single();
            
            const { data: inventoryData } = await supabase
              .from('v_inventory_value')
              .select('*')
              .eq('product_id', productIdNum)
              .single();
            
            const enrichedProduct = {
              ...data,
              supplier_name: data.supplier?.name,
              qty_on_hand: stockData?.qty_on_hand || 0,
              inventory_value: inventoryData?.inventory_value || 0,
              avg_cost: inventoryData?.avg_cost || data.unit_cost
            };
            
            setSelectedProduct(enrichedProduct);
            setViewModalOpen(true);
          } else {
            toast({
              title: "Product not found",
              description: "The product you're looking for doesn't exist or has been removed.",
              variant: "destructive"
            });
            setSearchParams({});
          }
        } catch (error) {
          console.error('Error fetching product:', error);
          toast({
            title: "Error loading product",
            description: "There was an error loading the product details.",
            variant: "destructive"
          });
          setSearchParams({});
        }
      };
      
      fetchProduct();
    }
  }, [searchParams, products, viewModalOpen, toast]);
  
  // Get stock status for all products
  const productIds = products.map(p => p.id);
  const { data: stockStatusMap } = useStockStatus(productIds);

  // Get part exchange info for all trade-in products
  const [partExchangeMap, setPartExchangeMap] = useState<Record<number, any>>({});
  useEffect(() => {
    const fetchPartExchangeInfo = async () => {
      const tradeInProducts = products.filter(p => p.is_trade_in);
      if (tradeInProducts.length === 0) return;
      
      const { data } = await supabase
        .from('part_exchanges')
        .select('product_id, customer_name, allowance')
        .in('product_id', tradeInProducts.map(p => p.id));
      
      if (data) {
        const map: Record<number, any> = {};
        data.forEach(px => {
          map[px.product_id] = px;
        });
        setPartExchangeMap(map);
      }
    };
    
    fetchPartExchangeInfo();
  }, [products]);
  // Filtered products based on search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    let filtered = [...products];

    // Apply search filter only (other filters are now handled in the query)
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.internal_sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [products, searchQuery]);

  // Calculate active filters count
  const activeFilters = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filters.categories.length > 0) count++;
    if (filters.metals.length > 0) count++;
    if (filters.karats.length > 0) count++;
    if (filters.gemstones.length > 0) count++;
    if (filters.suppliers.length > 0) count++;
    if (filters.stockLevel !== 'all') count++;
    if (filters.isTradeIn && filters.isTradeIn !== 'all') count++;
    if (filters.priceRange.min > (filterOptions?.priceRange.min || 0) || 
        filters.priceRange.max < (filterOptions?.priceRange.max || 50000)) count++;
    if (filters.marginRange.min > 0 || filters.marginRange.max < 100) count++;
    return count;
  }, [searchQuery, filters, filterOptions]);

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
    // Clean up URL when opening modal manually
    if (searchParams.get('id')) {
      setSearchParams({});
    }
  };

  const handleSellProduct = (product: any) => {
    navigate(`/sales?productId=${product.id}`);
  };
  
  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    // Clean up URL when closing modal
    if (searchParams.get('id')) {
      setSearchParams({});
    }
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setEditModalOpen(true);
  };

  const handleEditFromView = () => {
    setViewModalOpen(false);
    setEditModalOpen(true);
  };

  const handleImageClick = (product: any) => {
    if (product.image_url) {
      setSelectedImage({src: product.image_url, alt: product.name});
      setImageModalOpen(true);
    }
  };

  if (isLoading || filterOptionsLoading) {
    return (
      <AppLayout title="Products" showSearch>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-64 h-10">
                <div className="absolute inset-0 bg-muted animate-pulse rounded-md" />
              </div>
              <div className="w-20 h-10 bg-muted animate-pulse rounded-md" />
            </div>
            <div className="w-32 h-10 bg-muted animate-pulse rounded-md" />
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Products" showSearch>
        <QueryErrorHandler 
          error={error} 
          onRetry={() => window.location.reload()}
        />
      </AppLayout>
    );
  }

  if (!filterOptions) {
    return (
      <AppLayout title="Products" showSearch>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading filter options...</div>
        </div>
      </AppLayout>
    );
  }

  const totalProducts = products?.length || 0;
  // Only count items that are "at risk" (low but not zero) from the active products list
  // Out-of-stock items are moved to Sold Items archive and shouldn't count as "low stock alerts"
  const restockAlerts = products?.filter(p => {
    const status = stockStatusMap?.get(p.id);
    return status?.is_at_risk && !status?.is_out_of_stock;
  }).length || 0;
  const totalInventoryValue = products?.reduce((sum, p) => sum + Number(p.inventory_value || 0), 0) || 0;
  
  return (
    <AppLayout title="Products" subtitle="Manage inventory and product catalogue" showSearch>
      <div className="space-y-6">
        {/* Row 1: Search + Controls in one compact row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search input - takes available space */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          {/* Controls grouped together */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <EnhancedProductFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filters={filters}
              onFiltersChange={setFilters}
              filterOptions={filterOptions}
              suppliers={suppliers}
              locations={locations}
              activeFilters={activeFilters}
            />
            <Select
              value={filters.sortBy || 'newest'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                <SelectItem value="price_high">Price (High-Low)</SelectItem>
                <SelectItem value="price_low">Price (Low-High)</SelectItem>
                <SelectItem value="margin_high">Margin (High-Low)</SelectItem>
                <SelectItem value="margin_low">Margin (Low-High)</SelectItem>
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as 'list' | 'grid')}
              className="border rounded-md"
            >
              <ToggleGroupItem value="list" aria-label="List view" className="px-3">
                <LayoutList className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grid view" className="px-3">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button variant="premium" onClick={() => setShowAddProduct(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Row 2: Quick Filters */}
        <div className="w-full max-w-full overflow-hidden">
          {filterOptions && (
            <QuickFilters
              filters={filters}
              onFiltersChange={setFilters}
              filterOptions={filterOptions}
              onOpenFullFilters={() => {
                const filtersButton = document.querySelector('[data-filter-trigger]') as HTMLButtonElement;
                filtersButton?.click();
              }}
              activeFilters={activeFilters}
              onClearAll={() => {
                setFilters({
                  categories: [],
                  metals: [],
                  karats: [],
                  gemstones: [],
                  suppliers: [],
                  locations: [],
                  stockLevel: 'all',
                  priceRange: filterOptions?.priceRange || { min: 0, max: 50000 },
                  marginRange: { min: 0, max: 100 },
                  isTradeIn: 'all'
                });
                setSearchQuery('');
              }}
            />
          )}
        </div>

        {/* KPI Summary Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-luxury text-sm">Active Products</CardTitle>
              <Package className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-luxury text-2xl font-bold text-foreground">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">In stock inventory</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-luxury text-sm">Inventory Value</CardTitle>
              <PoundSterling className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-luxury text-2xl font-bold text-foreground">£{totalInventoryValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total inventory value</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-luxury text-sm">Low Stock Items</CardTitle>
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-luxury text-2xl font-bold text-foreground">{restockAlerts}</div>
              <p className="text-xs text-muted-foreground">At reorder threshold</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Info banner for sold items */}
        <Card className="bg-muted/50 border-primary/20">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Viewing active inventory only</p>
                <p className="text-xs text-muted-foreground">Products with stock level of 0 are archived in Sold Items</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/sales/items')}
              className="gap-2 w-full sm:w-auto shrink-0"
            >
              View Sold Items Archive
              <TrendingDown className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Products List/Grid View */}
        {viewMode === 'list' ? (
          <ProductTable
            products={filteredProducts}
            onView={handleViewProduct}
            onEdit={handleEditProduct}
            onDuplicate={(product) => {
              setProductToDuplicate(product);
              setDuplicateModalOpen(true);
            }}
            onSell={handleSellProduct}
            onImageClick={handleImageClick}
            stockStatusMap={stockStatusMap}
            partExchangeMap={partExchangeMap}
            highlightedProductId={highlightedProductId}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const stockStatus = stockStatusMap?.get(product.id);
              const stockBadge = getStockBadge(stockStatus);
              const pxInfo = product.is_trade_in ? partExchangeMap[product.id] : null;
              
              return (
                <div
                  key={product.id}
                  data-product-id={product.id}
                  className={highlightedProductId === product.id ? 'animate-pulse' : ''}
                >
                  <ProductCard 
                    product={product}
                    stockStatus={stockBadge}
                    partExchangeInfo={pxInfo}
                    onView={() => handleViewProduct(product)}
                    onEdit={() => handleEditProduct(product)}
                    onDuplicate={() => {
                      setProductToDuplicate(product);
                      setDuplicateModalOpen(true);
                    }}
                    onImageClick={() => handleImageClick(product)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {filteredProducts.length === 0 && !isLoading && (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {activeFilters > 0
                  ? "No products match your search criteria. Try adjusting your search or filters."
                  : "You haven't added any products yet. Get started by adding your first product."
                }
              </p>
              {activeFilters > 0 ? (
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setFilters({
                    categories: [],
                    metals: [],
                    karats: [],
                    gemstones: [],
                    suppliers: [],
                    locations: [],
                    stockLevel: 'all',
                    priceRange: filterOptions?.priceRange || { min: 0, max: 50000 },
                    marginRange: { min: 0, max: 100 }
                  });
                }}>
                  Clear All Filters
                </Button>
              ) : (
                <Button variant="premium" onClick={() => setShowAddProduct(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <ProductDetailModal
        product={selectedProduct}
        open={viewModalOpen}
        onOpenChange={handleCloseViewModal}
        onEditClick={handleEditFromView}
        onDuplicateClick={() => {
          setProductToDuplicate(selectedProduct);
          setDuplicateModalOpen(true);
        }}
      />
      
      <EditProductModal
        product={selectedProduct}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
      
      <EditProductModal
        product={null}
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
      />

      <ImageModal
        src={selectedImage?.src || ''}
        alt={selectedImage?.alt || ''}
        open={imageModalOpen}
        onOpenChange={setImageModalOpen}
      />

      <DuplicateProductModal
        product={productToDuplicate}
        open={duplicateModalOpen}
        onOpenChange={setDuplicateModalOpen}
        onSuccess={(newProduct, action) => {
          if (action === 'stay') {
            // Highlight the new product
            setHighlightedProductId(newProduct.id);
            // Scroll to the new product after a short delay
            setTimeout(() => {
              const element = document.querySelector(`[data-product-id="${newProduct.id}"]`);
              element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
            // Remove highlight after 3 seconds
            setTimeout(() => setHighlightedProductId(null), 3000);
          } else if (action === 'open') {
            // Open the new product detail modal
            setSelectedProduct(newProduct);
            setViewModalOpen(true);
          }
        }}
      />
    </AppLayout>
  );
}
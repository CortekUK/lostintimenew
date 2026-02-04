import { useState, useMemo } from 'react';
import { Eye, Edit, Copy, ChevronUp, ChevronDown, ChevronsUpDown, MapPin, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePermissions, CRM_MODULES } from '@/hooks/usePermissions';
import { getSupplierDisplayName } from '@/lib/utils';

interface ProductTableProps {
  products: any[];
  onView: (product: any) => void;
  onEdit: (product: any) => void;
  onDuplicate: (product: any) => void;
  onSell?: (product: any) => void;
  onImageClick?: (product: any) => void;
  stockStatusMap?: Map<number, any>;
  highlightedProductId?: number | null;
  /** When true, disables internal sorting and uses products array as-is (sorted by parent) */
  externalSort?: boolean;
}

type SortField = 'name' | 'category' | 'supplier' | 'location' | 'unit_price' | 'unit_cost' | 'profit' | 'margin';
type SortDirection = 'asc' | 'desc';

export function ProductTable({
  products,
  onView,
  onEdit,
  onDuplicate,
  onSell,
  onImageClick,
  stockStatusMap,
  highlightedProductId,
  externalSort = false,
}: ProductTableProps) {
  const { canEdit, canCreate } = usePermissions();
  const canEditProducts = canEdit(CRM_MODULES.PRODUCTS);
  const canCreateProducts = canCreate(CRM_MODULES.PRODUCTS);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [denseMode, setDenseMode] = useState(false);

  const handleSort = (field: SortField) => {
    if (externalSort) return; // Disable internal sorting when parent controls it
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProducts = useMemo(() => {
    // When externalSort is true, use products as-is (already sorted by parent)
    if (externalSort) {
      return products;
    }
    
    return [...products].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'category':
          aValue = a.category?.toLowerCase() || '';
          bValue = b.category?.toLowerCase() || '';
          break;
        case 'supplier':
          aValue = getSupplierDisplayName(a)?.toLowerCase() || '';
          bValue = getSupplierDisplayName(b)?.toLowerCase() || '';
          break;
        case 'location':
          aValue = a.location?.name?.toLowerCase() || '';
          bValue = b.location?.name?.toLowerCase() || '';
          break;
        case 'unit_price':
          aValue = Number(a.unit_price) || 0;
          bValue = Number(b.unit_price) || 0;
          break;
        case 'unit_cost':
          aValue = Number(a.unit_cost) || 0;
          bValue = Number(b.unit_cost) || 0;
          break;
        case 'profit':
          aValue = Number(a.unit_price) - Number(a.unit_cost);
          bValue = Number(b.unit_price) - Number(b.unit_cost);
          break;
        case 'margin':
          // Markup = (Profit / Cost) * 100
          aValue = a.unit_cost > 0 ? ((a.unit_price - a.unit_cost) / a.unit_cost) * 100 : 0;
          bValue = b.unit_cost > 0 ? ((b.unit_price - b.unit_cost) / b.unit_cost) * 100 : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [products, sortField, sortDirection, externalSort]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getStockStatusDisplay = (product: any) => {
    const stockStatus = stockStatusMap?.get(product.id);
    const qtyOnHand = product.qty_on_hand || 0;
    const qtyAvailable = product.qty_available ?? qtyOnHand;
    const qtyReserved = product.qty_reserved || 0;

    // Fully reserved - all stock is held
    if (product.is_fully_reserved) {
      return { 
        primary: { text: 'Reserved', className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700' },
        secondary: null
      };
    }

    // Partially reserved - some stock available, some reserved
    if (product.is_partially_reserved) {
      return {
        primary: { text: `${qtyAvailable} Available`, className: 'bg-primary/10 border-primary text-primary' },
        secondary: { text: `${qtyReserved} Reserved`, className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700' }
      };
    }

    // No reservations - normal stock status
    if (stockStatus) {
      if (stockStatus.is_out_of_stock) {
        return { primary: { text: 'Out of Stock', className: 'bg-muted text-muted-foreground' }, secondary: null };
      } else if (stockStatus.is_at_risk) {
        return { primary: { text: `Low: ${qtyOnHand}`, className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300' }, secondary: null };
      }
    }
    
    return qtyOnHand === 0
      ? { primary: { text: 'Out of Stock', className: 'bg-muted text-muted-foreground' }, secondary: null }
      : { primary: { text: 'In Stock', className: 'bg-primary/10 border-primary text-primary' }, secondary: null };
  };
  
  const getReservationTooltip = (product: any) => {
    if (!product.reserved_orders || product.reserved_orders.length === 0) return null;
    return product.reserved_orders.map((order: any) => 
      `${order.customer_name} (Order #${order.deposit_order_id})${order.quantity > 1 ? ` × ${order.quantity}` : ''}`
    ).join('\n');
  };

  const cellPadding = denseMode ? 'py-2' : 'py-3';

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold">Product Inventory</CardTitle>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{products.length} products</span>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={denseMode}
                onCheckedChange={(checked) => setDenseMode(!!checked)}
              />
              Dense
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead className="min-w-[180px]">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Product {getSortIcon('name')}
                  </button>
                </TableHead>
                <TableHead className="min-w-[100px]">
                  <button
                    onClick={() => handleSort('category')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Category {getSortIcon('category')}
                  </button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <button
                    onClick={() => handleSort('supplier')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Supplier {getSortIcon('supplier')}
                  </button>
                </TableHead>
                <TableHead className="min-w-[100px]">
                  <button
                    onClick={() => handleSort('location')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Location {getSortIcon('location')}
                  </button>
                </TableHead>
                <TableHead className="w-[90px]">Stock</TableHead>
                <TableHead className="min-w-[100px] text-right">
                  <button
                    onClick={() => handleSort('unit_price')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                  >
                    Sell Price {getSortIcon('unit_price')}
                  </button>
                </TableHead>
                <TableHead className="min-w-[90px] text-right">
                  <button
                    onClick={() => handleSort('unit_cost')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                  >
                    Cost {getSortIcon('unit_cost')}
                  </button>
                </TableHead>
                <TableHead className="min-w-[90px] text-right">
                  <button
                    onClick={() => handleSort('profit')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                  >
                    Profit {getSortIcon('profit')}
                  </button>
                </TableHead>
                <TableHead className="min-w-[80px] text-right">
                  <button
                    onClick={() => handleSort('margin')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                  >
                    Markup {getSortIcon('margin')}
                  </button>
                </TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map((product) => {
                const profit = Number(product.unit_price) - Number(product.unit_cost);
                // Markup = (Profit / Cost) * 100
                const markup = Number(product.unit_cost) > 0
                  ? ((profit / Number(product.unit_cost)) * 100).toFixed(1)
                  : '0.0';
                const stockDisplay = getStockStatusDisplay(product);
                const reservationTooltip = getReservationTooltip(product);

                return (
                  <TableRow
                    key={product.id}
                    data-product-id={product.id}
                    className={`hover:bg-muted/50 cursor-pointer transition-colors ${highlightedProductId === product.id ? 'animate-pulse bg-primary/5' : ''}`}
                    onClick={() => onView(product)}
                  >
                    {/* Image */}
                    <TableCell className={cellPadding}>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onImageClick?.(product);
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center border">
                          <span className="font-luxury text-sm text-muted-foreground">
                            {product.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    {/* Product Name & SKU */}
                    <TableCell className={cellPadding}>
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{product.name}</p>
                        {product.internal_sku && (
                          <p className="text-xs text-muted-foreground">{product.internal_sku}</p>
                        )}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell className={cellPadding}>
                      <span className="text-sm">{product.category || '—'}</span>
                    </TableCell>

                    {/* Supplier */}
                    <TableCell className={cellPadding}>
                      <span className="text-sm truncate max-w-[120px] block">
                        {getSupplierDisplayName(product) || '—'}
                      </span>
                    </TableCell>

                    {/* Location */}
                    <TableCell className={cellPadding}>
                      {product.location?.name ? (
                        <span className="text-sm flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {product.location.name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Stock Status */}
                    <TableCell className={cellPadding}>
                      <div className="flex flex-col gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={`text-xs whitespace-nowrap ${stockDisplay.primary.className}`}>
                              {stockDisplay.primary.text}
                            </Badge>
                          </TooltipTrigger>
                          {reservationTooltip && (
                            <TooltipContent className="whitespace-pre-line">
                              {reservationTooltip}
                            </TooltipContent>
                          )}
                        </Tooltip>
                        {stockDisplay.secondary && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className={`text-xs whitespace-nowrap ${stockDisplay.secondary.className}`}>
                                {stockDisplay.secondary.text}
                              </Badge>
                            </TooltipTrigger>
                            {reservationTooltip && (
                              <TooltipContent className="whitespace-pre-line">
                                {reservationTooltip}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>

                    {/* Sell Price */}
                    <TableCell className={`${cellPadding} text-right`}>
                      <span className="font-medium text-primary">£{Number(product.unit_price).toFixed(2)}</span>
                    </TableCell>

                    {/* Cost */}
                    <TableCell className={`${cellPadding} text-right`}>
                      <span className="text-muted-foreground">£{Number(product.unit_cost).toFixed(2)}</span>
                    </TableCell>

                    {/* Profit */}
                    <TableCell className={`${cellPadding} text-right`}>
                      <span className={profit > 0 ? 'text-success font-medium' : 'text-muted-foreground'}>
                        £{profit.toFixed(2)}
                      </span>
                    </TableCell>

                    {/* Markup */}
                    <TableCell className={`${cellPadding} text-right`}>
                      <span className={Number(markup) >= 50 ? 'text-success font-medium' : Number(markup) >= 25 ? 'text-foreground' : 'text-warning font-medium'}>
                        {markup}%
                      </span>
                    </TableCell>

                    {/* Type Badges */}
                    <TableCell className={cellPadding}>
                      <div className="flex flex-wrap gap-1">
                        {product.is_consignment && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            Consignment
                          </Badge>
                        )}
                        {!product.is_consignment && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className={`${cellPadding} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        {onSell && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSell(product);
                                  }}
                                  disabled={(product.qty_on_hand || 0) <= 0}
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {product.is_reserved 
                                  ? 'Reserved for deposit order' 
                                  : (product.qty_on_hand || 0) > 0 
                                    ? 'Sell Product' 
                                    : 'Out of Stock'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onView(product);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {canEditProducts && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(product);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Product</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {canCreateProducts && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicate(product);
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Duplicate Product</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No products to display</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

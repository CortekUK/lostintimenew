import { useState, useMemo } from 'react';
import { Eye, Edit, Copy, ChevronUp, ChevronDown, ChevronsUpDown, MapPin, Repeat } from 'lucide-react';
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
  onImageClick?: (product: any) => void;
  stockStatusMap?: Map<number, any>;
  partExchangeMap?: Record<number, any>;
  highlightedProductId?: number | null;
}

type SortField = 'name' | 'category' | 'supplier' | 'location' | 'unit_price' | 'unit_cost' | 'profit' | 'margin';
type SortDirection = 'asc' | 'desc';

export function ProductTable({
  products,
  onView,
  onEdit,
  onDuplicate,
  onImageClick,
  stockStatusMap,
  partExchangeMap,
  highlightedProductId,
}: ProductTableProps) {
  const { canEdit } = usePermissions();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [denseMode, setDenseMode] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProducts = useMemo(() => {
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
          aValue = a.unit_price > 0 ? ((a.unit_price - a.unit_cost) / a.unit_price) * 100 : 0;
          bValue = b.unit_price > 0 ? ((b.unit_price - b.unit_cost) / b.unit_price) * 100 : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [products, sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getStockStatusBadge = (product: any) => {
    const stockStatus = stockStatusMap?.get(product.id);
    const stock = product.qty_on_hand || 0;

    if (stockStatus) {
      if (stockStatus.is_out_of_stock) {
        return { text: 'Out of Stock', className: 'bg-muted text-muted-foreground' };
      } else if (stockStatus.is_at_risk) {
        return { text: `Low: ${stock}`, className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300' };
      }
    }
    return stock === 0
      ? { text: 'Out of Stock', className: 'bg-muted text-muted-foreground' }
      : { text: 'In Stock', className: 'bg-primary/10 border-primary text-primary' };
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
                    Margin {getSortIcon('margin')}
                  </button>
                </TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map((product) => {
                const profit = Number(product.unit_price) - Number(product.unit_cost);
                const margin = Number(product.unit_price) > 0
                  ? ((profit / Number(product.unit_price)) * 100).toFixed(1)
                  : '0.0';
                const stockBadge = getStockStatusBadge(product);
                const pxInfo = product.is_trade_in ? partExchangeMap?.[product.id] : null;

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
                        {pxInfo && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <Repeat className="h-3 w-3" />
                            Trade-in
                          </p>
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
                      <Badge variant="outline" className={`text-xs whitespace-nowrap ${stockBadge.className}`}>
                        {stockBadge.text}
                      </Badge>
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

                    {/* Margin */}
                    <TableCell className={`${cellPadding} text-right`}>
                      <span className={Number(margin) > 0 ? 'text-success font-medium' : 'text-muted-foreground'}>
                        {margin}%
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
                        {product.is_trade_in && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            PX
                          </Badge>
                        )}
                        {!product.is_consignment && !product.is_trade_in && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className={`${cellPadding} text-right`}>
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onView(product)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {canEdit(CRM_MODULES.PRODUCTS) && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onEdit(product)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Product</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onDuplicate(product)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplicate Product</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
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

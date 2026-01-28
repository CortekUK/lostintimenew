import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductSearch, useProducts } from '@/hooks/useDatabase';
import { debounce } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { normalizeProductStockData } from '@/utils/stockUtils';
import type { Product } from '@/types';
import { 
  Search, 
  Plus,
  Package,
  AlertTriangle,
  Check
} from 'lucide-react';

interface ProductSearchResult extends Product {
  supplier?: { name: string } | null;
  consignment_supplier?: { name: string } | null;
  location?: { id: number; name: string } | null;
  stock_on_hand: number;
}

interface ProductSearchProps {
  onAddToCart: (product: ProductSearchResult) => void;
  cartItems: Array<{ product_id: number; quantity: number }>;
}

export function ProductSearch({ onAddToCart, cartItems }: ProductSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debounced search query
  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );
  
  // Use search results when there's a query, otherwise show available products
  const { data: searchResults = [], isLoading: isSearchLoading } = useProductSearch(searchQuery);
  const { data: allProducts = [], isLoading: isProductsLoading } = useProducts();
  
  // Determine which products to display
  const products = useMemo(() => {
    if (searchQuery) {
      return searchResults;
    }
    
    // Show first 20 products that are in stock when no search query
    return allProducts
      .map(product => normalizeProductStockData(product, product.stock?.[0], product.inventory?.[0]))
      .filter(product => {
        if (!product.track_stock) return true;
        // Explicit check: must have stock > 0 (not undefined, not null, not 0)
        const stockQty = product.qty_on_hand;
        return typeof stockQty === 'number' && stockQty > 0;
      })
      .slice(0, 20)
      .map(product => ({
        ...product,
        stock_on_hand: product.qty_on_hand ?? 0,
        supplier: product.supplier,
        consignment_supplier: product.consignment_supplier,
        location: product.location
      }));
  }, [searchQuery, searchResults, allProducts]);
  
  const isLoading = searchQuery ? isSearchLoading : isProductsLoading;
  
  const getCartQuantity = (productId: number) => {
    const cartItem = cartItems.find(item => item.product_id === productId);
    return cartItem?.quantity || 0;
  };
  
  const canAddToCart = (product: ProductSearchResult) => {
    if (!product.track_stock) return true;
    
    // Use qty_available if set (accounts for reservations), otherwise fall back to stock_on_hand
    const available = (product as any).qty_available ?? product.stock_on_hand ?? 0;
    const cartQuantity = getCartQuantity(product.id);
    return available > cartQuantity;
  };
  
  const getStockDisplay = (product: ProductSearchResult) => {
    if (!product.track_stock) return { primary: 'Unlimited', secondary: null };
    
    const stockOnHand = product.stock_on_hand || 0;
    const qtyReserved = (product as any).qty_reserved || 0;
    const qtyAvailable = (product as any).qty_available ?? stockOnHand;
    const cartQuantity = getCartQuantity(product.id);
    const availableAfterCart = qtyAvailable - cartQuantity;
    
    // Product is in cart and no more available
    if (availableAfterCart <= 0 && cartQuantity > 0) {
      if (cartQuantity === 1) {
        return { primary: 'Last one selected', secondary: null };
      }
      return { primary: `All ${cartQuantity} selected`, secondary: null };
    }
    
    // Truly out of stock (nothing in cart, nothing available)
    if (availableAfterCart <= 0 && qtyReserved === 0) {
      return { primary: 'Out of stock', secondary: null };
    }
    
    // Fully reserved
    if (availableAfterCart <= 0 && qtyReserved > 0) {
      return { primary: 'Reserved', secondary: null };
    }
    
    // Partially reserved - show both available and reserved counts
    if (qtyReserved > 0) {
      return { 
        primary: `${availableAfterCart} Available`, 
        secondary: `${qtyReserved} Reserved` 
      };
    }
    
    return { primary: `${availableAfterCart} Available`, secondary: null };
  };
  
  const getStockBadgeVariant = (product: ProductSearchResult) => {
    if (!product.track_stock) return 'default';
    
    const qtyAvailable = (product as any).qty_available ?? product.stock_on_hand ?? 0;
    const qtyReserved = (product as any).qty_reserved || 0;
    const cartQuantity = getCartQuantity(product.id);
    const availableAfterCart = qtyAvailable - cartQuantity;
    
    // In cart - use secondary
    if (availableAfterCart <= 0 && cartQuantity > 0) return 'secondary';
    
    // Fully reserved
    if (availableAfterCart <= 0 && qtyReserved > 0) return 'outline';
    
    // Truly out of stock
    if (availableAfterCart <= 0) return 'destructive';
    
    // Low stock warning
    if (availableAfterCart <= 5) return 'secondary';
    
    return 'default';
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-luxury">Product Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              debouncedSearch(e.target.value);
            }}
            className="pl-9"
          />
        </div>
        
        {/* Product Results */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))
          ) : products.length > 0 ? (
            products.map(product => {
              const canAdd = canAddToCart(product);
              const stockDisplay = getStockDisplay(product);
              const badgeVariant = getStockBadgeVariant(product);
              
              return (
                <div key={product.id} className="flex items-start justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    {/* Category Badge */}
                    {product.category && (
                      <Badge variant="outline" className="text-xs mb-1.5">
                        {product.category}
                      </Badge>
                    )}
                    
                    {/* Product Name */}
                    <h3 className="font-semibold text-base truncate mb-1">{product.name}</h3>
                    
                    {/* Price in Gold */}
                    <p className="text-sm text-[#D4AF37] font-medium mb-0.5">
                      {formatCurrency(product.unit_price)}
                      {product.tax_rate > 0 && (
                        <span className="ml-2 text-muted-foreground">• {product.tax_rate}% tax</span>
                      )}
                    </p>
                    
                    {/* Internal SKU */}
                    {product.internal_sku && (
                      <p className="text-xs text-muted-foreground">Internal SKU: {product.internal_sku}</p>
                    )}
                    
                    {/* SKU */}
                    {product.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                    )}
                  </div>
                  
                  {/* Right side: Availability + Add Button */}
                  <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={badgeVariant} className={`text-xs ${badgeVariant === 'outline' ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300' : ''}`}>
                        {stockDisplay.primary}
                      </Badge>
                      {stockDisplay.secondary && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                          {stockDisplay.secondary}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant={canAdd ? "default" : "secondary"}
                      size="sm"
                      onClick={() => onAddToCart(product)}
                      disabled={!canAdd}
                    >
                      {!canAdd && product.track_stock ? (
                        getCartQuantity(product.id) > 0 ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Out of Stock
                          </>
                        )
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : searchQuery ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="font-medium text-muted-foreground">No products match your search</p>
              <p className="text-sm text-muted-foreground">Try different keywords or check spelling</p>
            </div>
          ) : (
            products.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-40" />
                <p className="font-medium text-muted-foreground">No products available</p>
                <p className="text-sm text-muted-foreground">Add products to your inventory first</p>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
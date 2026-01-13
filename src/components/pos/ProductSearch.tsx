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
  AlertTriangle
} from 'lucide-react';

interface ProductSearchResult extends Product {
  supplier?: { name: string } | null;
  consignment_supplier?: { name: string } | null;
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
      .filter(product => !product.track_stock || (product.qty_on_hand > 0))
      .slice(0, 20)
      .map(product => ({
        ...product,
        stock_on_hand: product.qty_on_hand || 0,
        supplier: product.supplier,
        consignment_supplier: product.consignment_supplier
      }));
  }, [searchQuery, searchResults, allProducts]);
  
  const isLoading = searchQuery ? isSearchLoading : isProductsLoading;
  
  const getCartQuantity = (productId: number) => {
    const cartItem = cartItems.find(item => item.product_id === productId);
    return cartItem?.quantity || 0;
  };
  
  const canAddToCart = (product: ProductSearchResult) => {
    if (!product.track_stock) return true;
    
    const stockOnHand = product.stock_on_hand || 0;
    const cartQuantity = getCartQuantity(product.id);
    return stockOnHand > cartQuantity;
  };
  
  const getStockDisplay = (product: ProductSearchResult) => {
    if (!product.track_stock) return 'Unlimited';
    
    const stockOnHand = product.stock_on_hand || 0;
    const cartQuantity = getCartQuantity(product.id);
    const available = stockOnHand - cartQuantity;
    
    return `${available} available`;
  };
  
  const getStockBadgeVariant = (product: ProductSearchResult) => {
    if (!product.track_stock) return 'default';
    
    const stockOnHand = product.stock_on_hand || 0;
    const cartQuantity = getCartQuantity(product.id);
    const available = stockOnHand - cartQuantity;
    
    if (available <= 0) return 'destructive';
    if (available <= 5) return 'secondary';
    return 'default';
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-luxury">
          <Search className="h-5 w-5 text-muted-foreground" />
          Product Search
        </CardTitle>
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
                    <Badge variant={badgeVariant} className="text-xs">
                      {stockDisplay}
                    </Badge>
                    <Button 
                      variant={canAdd ? "default" : "secondary"}
                      size="sm"
                      onClick={() => onAddToCart(product)}
                      disabled={!canAdd}
                    >
                      {!canAdd && product.track_stock ? (
                        <>
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Out of Stock
                        </>
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
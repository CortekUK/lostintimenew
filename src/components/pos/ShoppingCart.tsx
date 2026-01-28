import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency, calculateCartTotals } from '@/lib/utils';
import type { CartItem, PartExchangeItem, CustomCartItem } from '@/types';
import { PartExchangeItem as PartExchangeItemComponent } from './PartExchangeItem';
import { ConsignmentBadge } from '@/components/ui/consignment-badge';
import { 
  ShoppingCart, 
  Plus,
  Minus,
  Trash2,
  Package,
  Hash,
  Repeat,
  Sparkles,
  Pencil,
  Check,
  X
} from 'lucide-react';

export type DiscountType = 'percentage' | 'fixed';

interface ShoppingCartProps {
  items: CartItem[];
  customItems?: CustomCartItem[];
  partExchanges: PartExchangeItem[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onUpdateCustomQuantity?: (id: string, quantity: number) => void;
  onRemoveCustomItem?: (id: string) => void;
  onRemovePartExchange: (id: string) => void;
  onEditPartExchange: (id: string) => void;
  onAddPartExchange: () => void;
  onAddCustomItem?: () => void;
  onUpdateItemPrice?: (productId: number, newPrice: number) => void;
  discount: number;
  discountType: DiscountType;
  onSerialAssignment?: (item: CartItem) => void;
  showCustomItemButton?: boolean;
}

export function ShoppingCartComponent({ 
  items,
  customItems = [],
  partExchanges,
  onUpdateQuantity, 
  onRemoveItem,
  onUpdateCustomQuantity,
  onRemoveCustomItem,
  onRemovePartExchange,
  onEditPartExchange,
  onAddPartExchange,
  onAddCustomItem,
  onUpdateItemPrice,
  discount,
  discountType,
  onSerialAssignment,
  showCustomItemButton = false
}: ShoppingCartProps) {
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  // Calculate discount based on type
  const calculateItemDiscount = (lineTotal: number) => {
    if (discountType === 'percentage') {
      return (lineTotal * discount) / 100;
    } else {
      // For fixed discount, distribute proportionally across items
      const cartSubtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      return cartSubtotal > 0 ? (lineTotal / cartSubtotal) * discount : 0;
    }
  };

  // Calculate totals for regular items
  const regularTotals = calculateCartTotals(items.map(item => {
    const lineTotal = item.unit_price * item.quantity;
    return {
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      discount: calculateItemDiscount(lineTotal)
    };
  }));

  // Calculate totals for custom items (no discount applied to custom items)
  const customSubtotal = customItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const customTax = customItems.reduce((sum, item) => sum + (item.unit_price * item.quantity * (item.tax_rate / 100)), 0);

  const totals = {
    subtotal: regularTotals.subtotal + customSubtotal,
    tax_total: regularTotals.tax_total + customTax,
    discount_total: regularTotals.discount_total,
    total: regularTotals.total + customSubtotal + customTax
  };

  const partExchangeTotal = partExchanges.reduce((sum, px) => sum + px.allowance, 0);
  const netTotal = totals.total - partExchangeTotal;

  const hasItems = items.length > 0 || customItems.length > 0 || partExchanges.length > 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-luxury">Shopping Cart</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="font-medium text-muted-foreground">Cart is empty</p>
            <p className="text-sm text-muted-foreground">
              Add products to start a sale
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Regular inventory items */}
            {items.map(item => {
              const lineTotal = item.unit_price * item.quantity;
              const lineDiscount = calculateItemDiscount(lineTotal);
              const lineTax = (lineTotal - lineDiscount) * (item.tax_rate / 100);
              const lineFinal = lineTotal - lineDiscount + lineTax;
              const catalogPrice = item.product.unit_price;
              const priceChanged = item.unit_price !== catalogPrice;
              const priceIncreased = item.unit_price > catalogPrice;
              const isEditing = editingPriceId === item.product.id;

              const startEditing = () => {
                setEditingPriceId(item.product.id);
                setEditPriceValue(String(item.unit_price));
              };

              const cancelEditing = () => {
                setEditingPriceId(null);
                setEditPriceValue('');
              };

              const savePrice = () => {
                const newPrice = parseFloat(editPriceValue);
                if (!isNaN(newPrice) && newPrice >= 0 && onUpdateItemPrice) {
                  onUpdateItemPrice(item.product.id, newPrice);
                }
                cancelEditing();
              };

              const handleKeyDown = (e: React.KeyboardEvent) => {
                if (e.key === 'Enter') savePrice();
                if (e.key === 'Escape') cancelEditing();
              };
              
              return (
                <div key={item.product.id} className="p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                        {item.product.is_consignment && (
                          <ConsignmentBadge className="text-xs shrink-0" />
                        )}
                      </div>
                      {item.product.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span>£</span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className="h-6 w-20 text-xs px-1"
                              autoFocus
                            />
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={savePrice}>
                              <Check className="h-3 w-3 text-success" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancelEditing}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            {priceChanged && (
                              <span className="line-through text-muted-foreground/60">{formatCurrency(catalogPrice)}</span>
                            )}
                            <button 
                              onClick={startEditing}
                              className={`font-medium inline-flex items-center gap-1 hover:underline cursor-pointer ${
                                priceIncreased ? 'text-blue-600 dark:text-blue-400' : priceChanged ? 'text-success' : 'text-primary'
                              }`}
                            >
                              {formatCurrency(item.unit_price)}
                              <Pencil className="h-3 w-3 opacity-60" />
                            </button>
                            <span>Each</span>
                          </>
                        )}
                        {item.tax_rate > 0 && !isEditing && (
                          <span className="ml-1">• {item.tax_rate}% tax</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm text-primary">{formatCurrency(lineFinal)}</p>
                      {discount > 0 && (
                        <p className="text-xs text-success">
                          -{formatCurrency(lineDiscount)} discount
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="h-7 w-7 p-0"
                        disabled={item.product.track_stock && item.stock_on_hand !== undefined && item.quantity >= item.stock_on_hand}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onRemoveItem(item.product.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Custom items section */}
            {customItems.length > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Custom
                  </Badge>
                  <span className="text-sm text-muted-foreground">{customItems.length} item{customItems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {customItems.map(item => {
                    const lineTotal = item.unit_price * item.quantity;
                    const lineTax = lineTotal * (item.tax_rate / 100);
                    const lineFinal = lineTotal + lineTax;
                    
                    return (
                      <div key={item.id} className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate text-purple-900 dark:text-purple-200">{item.product_name}</h4>
                            </div>
                            {item.category && (
                              <p className="text-xs text-purple-700 dark:text-purple-400">{item.category}</p>
                            )}
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="text-primary font-medium">{formatCurrency(item.unit_price)}</span> each
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm text-primary">{formatCurrency(lineFinal)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onUpdateCustomQuantity?.(item.id, item.quantity - 1)}
                              className="h-7 w-7 p-0"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onUpdateCustomQuantity?.(item.id, item.quantity + 1)}
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onRemoveCustomItem?.(item.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {/* Part Exchange Section */}
            {partExchanges.length > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                    Trade-In
                  </Badge>
                  <span className="text-sm text-muted-foreground">{partExchanges.length} items</span>
                </div>
                <div className="space-y-2">
                  {partExchanges.map(px => (
                    <PartExchangeItemComponent
                      key={px.id}
                      item={px}
                      onEdit={() => onEditPartExchange(px.id)}
                      onRemove={() => onRemovePartExchange(px.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Add Part Exchange Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={onAddPartExchange}
                className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/20"
              >
                <Repeat className="h-4 w-4 mr-2" />
                Add Part Exchange
              </Button>
            </div>
            
            {/* Cart Summary */}
            <div className="pt-3 border-t space-y-2">
              <h5 className="font-semibold text-sm mb-2">Summary</h5>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="text-primary font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount ({discountType === 'percentage' ? `${discount}%` : formatCurrency(discount)}):
                  </span>
                  <span className="text-success font-medium">-{formatCurrency(totals.discount_total)}</span>
                </div>
              )}
              {totals.tax_total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="text-primary font-medium">{formatCurrency(totals.tax_total)}</span>
                </div>
              )}
              {partExchangeTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trade-In Allowance:</span>
                  <span className="text-success font-medium">-{formatCurrency(partExchangeTotal)}</span>
                </div>
              )}
              <div className={`flex justify-between font-bold text-base pt-2 border-t ${netTotal < 0 ? 'text-destructive' : 'text-primary'}`}>
                <span>{netTotal < 0 ? 'Owed to Customer:' : 'Net Total:'}</span>
                <span>{formatCurrency(Math.abs(netTotal))}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
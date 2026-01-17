import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, calculateCartTotals } from '@/lib/utils';
import type { CartItem, PartExchangeItem } from '@/types';
import { PartExchangeItem as PartExchangeItemComponent } from './PartExchangeItem';
import { ConsignmentBadge } from '@/components/ui/consignment-badge';
import { 
  ShoppingCart, 
  Plus,
  Minus,
  Trash2,
  Package,
  Hash,
  Repeat
} from 'lucide-react';

export type DiscountType = 'percentage' | 'fixed';

interface ShoppingCartProps {
  items: CartItem[];
  partExchanges: PartExchangeItem[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onRemovePartExchange: (id: string) => void;
  onEditPartExchange: (id: string) => void;
  onAddPartExchange: () => void;
  discount: number;
  discountType: DiscountType;
  onSerialAssignment?: (item: CartItem) => void;
}

export function ShoppingCartComponent({ 
  items,
  partExchanges,
  onUpdateQuantity, 
  onRemoveItem,
  onRemovePartExchange,
  onEditPartExchange,
  onAddPartExchange,
  discount,
  discountType,
  onSerialAssignment 
}: ShoppingCartProps) {
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

  const totals = calculateCartTotals(items.map(item => {
    const lineTotal = item.unit_price * item.quantity;
    return {
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      discount: calculateItemDiscount(lineTotal)
    };
  }));

  const partExchangeTotal = partExchanges.reduce((sum, px) => sum + px.allowance, 0);
  const netTotal = totals.total - partExchangeTotal;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-luxury">Shopping Cart</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 && partExchanges.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="font-medium text-muted-foreground">Cart is empty</p>
            <p className="text-sm text-muted-foreground">Add products to start a sale</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const lineTotal = item.unit_price * item.quantity;
              const lineDiscount = calculateItemDiscount(lineTotal);
              const lineTax = (lineTotal - lineDiscount) * (item.tax_rate / 100);
              const lineFinal = lineTotal - lineDiscount + lineTax;
              
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
                      <p className="text-xs text-muted-foreground">
                        <span className="text-[#D4AF37] font-medium">{formatCurrency(item.unit_price)}</span> each
                        {item.tax_rate > 0 && (
                          <span className="ml-2">• {item.tax_rate}% tax</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm text-[#D4AF37]">{formatCurrency(lineFinal)}</p>
                      {discount > 0 && (
                        <p className="text-xs text-green-600">
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
                <span className="text-[#D4AF37] font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount ({discountType === 'percentage' ? `${discount}%` : formatCurrency(discount)}):
                  </span>
                  <span className="text-green-600 font-medium">-{formatCurrency(totals.discount_total)}</span>
                </div>
              )}
              {totals.tax_total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="text-[#D4AF37] font-medium">{formatCurrency(totals.tax_total)}</span>
                </div>
              )}
              {partExchangeTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trade-In Allowance:</span>
                  <span className="text-green-600 font-medium">-{formatCurrency(partExchangeTotal)}</span>
                </div>
              )}
              <div className={`flex justify-between font-bold text-base pt-2 border-t ${netTotal < 0 ? 'text-red-600' : 'text-[#D4AF37]'}`}>
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
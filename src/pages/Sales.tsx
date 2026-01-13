import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useProducts, useCreateSale } from '@/hooks/useDatabase';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingCart, 
  Search, 
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Calculator,
  Loader2
} from 'lucide-react';

interface CartItem {
  id: number;
  name: string;
  unit_price: number;
  unit_cost: number;
  tax_rate: number;
  quantity: number;
  stock_available: number;
  track_stock: boolean;
}

export default function Sales() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { data: products = [], isLoading } = useProducts();
  const createSale = useCreateSale();
  const { toast } = useToast();

  const addToCart = (product: any) => {
    const stockOnHand = product.stock?.[0]?.qty_on_hand || 0;
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= stockOnHand) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${stockOnHand} units available`,
          variant: "destructive"
        });
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (stockOnHand <= 0) {
        toast({
          title: "Out of Stock",
          description: "This product is currently out of stock",
          variant: "destructive"
        });
        return;
      }
      setCart([...cart, {
        id: product.id,
        name: product.name,
        unit_price: Number(product.unit_price),
        unit_cost: Number(product.unit_cost),
        tax_rate: Number(product.tax_rate),
        quantity: 1,
        stock_available: stockOnHand,
        track_stock: product.track_stock ?? true
      }]);
    }
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      const item = cart.find(item => item.id === id);
      if (item && quantity > item.stock_available) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${item.stock_available} units available`,
          variant: "destructive"
        });
        return;
      }
      setCart(cart.map(item => 
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxAmount = cart.reduce((sum, item) => sum + ((item.unit_price * item.quantity - (item.unit_price * item.quantity * discount / 100)) * item.tax_rate / 100), 0);
  const total = subtotal - discountAmount + taxAmount;

  const handleCompleteSale = async () => {
    if (cart.length === 0 || !paymentMethod) return;

    try {
      // Validate stock availability before sale
      const { data: stockData, error: stockError } = await supabase
        .from('v_stock_on_hand')
        .select('product_id, qty_on_hand')
        .in('product_id', cart.map(item => item.id));

      if (stockError) throw new Error('Failed to verify stock availability');

      const stockMap = new Map(stockData?.map(s => [s.product_id, s.qty_on_hand]) || []);

      for (const item of cart) {
        if (item.track_stock) {
          const available = stockMap.get(item.id) || 0;
          if (available < item.quantity) {
            toast({
              title: "Insufficient Stock",
              description: `"${item.name}" has only ${available} available, but ${item.quantity} requested.`,
              variant: "destructive"
            });
            return;
          }
        }
      }

      const saleData = {
        sale: {
          payment: paymentMethod as 'cash' | 'card',
          notes: customerName ? `Customer: ${customerName}` : null
        },
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.unit_cost,
          tax_rate: item.tax_rate,
          discount: (item.unit_price * item.quantity * discount) / 100
        }))
      };

      await createSale.mutateAsync(saleData);
      
      const saleId = 'temp-id'; // TODO: Get actual sale ID from mutation response
      toast({
        title: "Sale Completed",
        description: `Sale of £${total.toFixed(2)} completed successfully!`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/sales/${saleId}`)}
          >
            View Sale
          </Button>
        )
      });
      
      // Reset form
      setCart([]);
      setCustomerName('');
      setDiscount(0);
      setPaymentMethod('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete sale. Please try again.",
        variant: "destructive"
      });
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppLayout title="Sales / POS" subtitle="Process sales and manage transactions" showSearch>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Search & Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Product Search</CardTitle>
              <CardDescription>Search and add products to cart</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {authLoading || isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          £${Number(product.unit_price).toFixed(2)} • {product.stock?.[0]?.qty_on_hand || 0} in stock
                        </p>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => addToCart(product)}
                        disabled={!product.stock?.[0]?.qty_on_hand || product.stock?.[0]?.qty_on_hand <= 0}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      No products found
                    </div>
                  )}
                </div>
              )}
              
              <Button variant="outline" className="w-full mt-4" disabled>
                <QrCode className="h-4 w-4 mr-2" />
                Scan Barcode (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Shopping Cart & Checkout */}
        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Cart ({cart.length.toString()} items)</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Cart is empty</p>
                  <p className="text-sm text-muted-foreground">Add products to start a sale</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">£{item.unit_price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer & Payment */}
          {cart.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
              <CardTitle>Checkout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer Name (Optional)</Label>
                  <Input
                    id="customer"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Cash
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Credit Card
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Order Summary */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>£{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Discount ({discount}%):</span>
                      <span>-£{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>£{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span>£{total.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  variant="premium" 
                  className="w-full" 
                  size="lg"
                  onClick={handleCompleteSale}
                  disabled={!paymentMethod || createSale.isPending}
                >
                  {createSale.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Complete Sale"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
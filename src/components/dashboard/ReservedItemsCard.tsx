import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { Package, ExternalLink, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';

interface ReservedItem {
  product_id: number;
  product_name: string;
  product_image?: string;
  unit_price: number;
  deposit_order_id: number;
  customer_name: string;
  expected_date: string | null;
  quantity: number;
  status: string;
}

export function ReservedItemsCard() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const { data: reservedItems = [], isLoading } = useQuery({
    queryKey: ['reserved-items-dashboard'],
    queryFn: async (): Promise<ReservedItem[]> => {
      // Get all active deposit order items with their product and order details
      const { data, error } = await supabase
        .from('deposit_order_items')
        .select(`
          product_id,
          product_name,
          unit_price,
          quantity,
          deposit_order:deposit_orders!inner(
            id,
            customer_name,
            expected_date,
            status
          )
        `)
        .not('deposit_order.status', 'in', '(completed,cancelled)')
        .not('product_id', 'is', null);

      if (error) throw error;

      // Fetch product images separately
      const productIds = data?.map(item => item.product_id).filter(Boolean) || [];
      const { data: products } = await supabase
        .from('products')
        .select('id, image_url')
        .in('id', productIds);

      const imageMap = new Map(products?.map(p => [p.id, p.image_url]) || []);

      return (data || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: imageMap.get(item.product_id) || undefined,
        unit_price: item.unit_price,
        deposit_order_id: item.deposit_order.id,
        customer_name: item.deposit_order.customer_name,
        expected_date: item.deposit_order.expected_date,
        quantity: item.quantity || 1,
        status: item.deposit_order.status
      }));
    },
    enabled: !!user && !!session,
  });

  const getPickupStatus = (expectedDate: string | null) => {
    if (!expectedDate) return null;
    
    const days = differenceInDays(parseISO(expectedDate), new Date());
    
    if (days < 0) {
      return { text: 'Overdue', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertTriangle };
    }
    if (days <= 3) {
      return { text: `${days}d`, className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300', icon: Clock };
    }
    return { text: format(parseISO(expectedDate), 'MMM d'), className: 'bg-muted text-muted-foreground', icon: Clock };
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-luxury">Reserved Items</CardTitle>
          <CardDescription>Products held for deposit orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reservedItems.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-luxury">Reserved Items</CardTitle>
          <CardDescription>Products held for deposit orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">No reserved items</p>
            <p className="text-sm text-muted-foreground">Products reserved for deposits will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by deposit order for summary stats
  const uniqueOrders = new Set(reservedItems.map(item => item.deposit_order_id));
  const totalValue = reservedItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const overdueCount = reservedItems.filter(item => {
    if (!item.expected_date) return false;
    return differenceInDays(parseISO(item.expected_date), new Date()) < 0;
  }).length;

  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="font-luxury text-base md:text-lg">Reserved Items</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {reservedItems.length} item{reservedItems.length !== 1 ? 's' : ''} across {uniqueOrders.size} order{uniqueOrders.size !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueCount} overdue
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/deposits')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">View All</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-3 rounded-lg bg-muted/30 border">
          <div>
            <p className="text-xs text-muted-foreground">Total Reserved Value</p>
            <p className="text-lg font-semibold text-primary">{formatCurrency(totalValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Orders</p>
            <p className="text-lg font-semibold">{uniqueOrders.size}</p>
          </div>
        </div>

        {/* Reserved Items List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {reservedItems.slice(0, 5).map((item, index) => {
            const pickupStatus = getPickupStatus(item.expected_date);
            
            return (
              <div
                key={`${item.deposit_order_id}-${item.product_id}-${index}`}
                className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer group"
                onClick={() => navigate(`/deposits/${item.deposit_order_id}`)}
              >
                {/* Product Image/Initial */}
                {item.product_image ? (
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="h-10 w-10 rounded object-cover border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center border">
                    <span className="text-sm font-medium text-muted-foreground">
                      {item.product_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    For: {item.customer_name}
                  </p>
                </div>

                {/* Status & Price */}
                <div className="flex items-center gap-2">
                  {pickupStatus && (
                    <Badge variant="outline" className={`text-xs ${pickupStatus.className}`}>
                      <pickupStatus.icon className="h-3 w-3 mr-1" />
                      {pickupStatus.text}
                    </Badge>
                  )}
                  <span className="text-sm font-medium text-primary">
                    {formatCurrency(item.unit_price)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
          
          {reservedItems.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => navigate('/deposits')}
            >
              View {reservedItems.length - 5} more reserved items
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

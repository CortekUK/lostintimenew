import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PoundSterling, ShoppingCart, ExternalLink, Eye } from 'lucide-react';
import { useRecentSales } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const ProductPreview = ({ products }: { products: Array<{ name: string; quantity: number }> }) => {
  if (products.length === 0) return <span className="text-muted-foreground">No items</span>;
  
  const first = products[0];
  const second = products[1];
  const remaining = products.length - 2;
  
  return (
    <div className="text-sm">
      <span className="font-medium">{first.name}</span>
      {first.quantity > 1 && <span className="text-muted-foreground"> x{first.quantity}</span>}
      {second && (
        <>
          <span className="text-muted-foreground">, </span>
          <span className="font-medium">{second.name}</span>
          {second.quantity > 1 && <span className="text-muted-foreground"> x{second.quantity}</span>}
        </>
      )}
      {remaining > 0 && (
        <span className="text-muted-foreground"> +{remaining} more</span>
      )}
    </div>
  );
};

const SaleRow = ({ sale }: { sale: any }) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-muted-foreground">
            {format(new Date(sale.sold_at), 'HH:mm')}
          </span>
          <Badge variant="outline" className="text-xs">
            {sale.payment}
          </Badge>
        </div>
        
        <ProductPreview products={sale.products} />
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(sale.total)}
          </span>
          {sale.staff_name && (
            <span className="text-xs text-muted-foreground">
              by {sale.staff_name}
            </span>
          )}
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/sales/${sale.id}`)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Eye className="h-3 w-3" />
      </Button>
    </div>
  );
};

export const RecentSalesFeed = () => {
  const { data: recentSales, isLoading } = useRecentSales(5);
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-full mb-1" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!recentSales || recentSales.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">No sales yet today</p>
            <p className="text-sm text-muted-foreground">Sales will appear here as they're made</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const todayTotal = recentSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  
  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Latest transactions</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/sales/history')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {recentSales.map((sale) => (
            <SaleRow key={sale.id} sale={sale} />
          ))}
        </div>
        
        {/* Today's Total Bar */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Recent total
            </span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(todayTotal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
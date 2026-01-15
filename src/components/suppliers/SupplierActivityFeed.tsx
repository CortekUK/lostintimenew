import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Package, Receipt, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SupplierActivityFeedProps {
  supplierId: number;
}

interface Activity {
  id: string;
  type: 'product' | 'expense' | 'stock_purchase';
  description: string;
  date: string;
  amount?: number;
}

export function SupplierActivityFeed({ supplierId }: SupplierActivityFeedProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['supplier-activity-feed', supplierId],
    queryFn: async () => {
      const activities: Activity[] = [];

      // Fetch recent products linked to this supplier
      const { data: recentProducts } = await supabase
        .from('products')
        .select('id, name, created_at, unit_cost')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentProducts) {
        recentProducts.forEach(product => {
          activities.push({
            id: `product-${product.id}`,
            type: 'product',
            description: `New product linked: ${product.name}`,
            date: product.created_at,
            amount: product.unit_cost,
          });
        });
      }

      // Fetch recent expenses from this supplier
      const { data: recentExpenses } = await supabase
        .from('expenses')
        .select('id, description, incurred_at, amount, category')
        .eq('supplier_id', supplierId)
        .order('incurred_at', { ascending: false })
        .limit(5);

      if (recentExpenses) {
        recentExpenses.forEach(expense => {
          activities.push({
            id: `expense-${expense.id}`,
            type: 'expense',
            description: expense.description || `Expense: ${expense.category}`,
            date: expense.incurred_at,
            amount: expense.amount,
          });
        });
      }

      // Fetch recent stock purchases from this supplier
      const { data: recentPurchases } = await supabase
        .from('stock_movements')
        .select(`
          id, 
          occurred_at, 
          unit_cost, 
          quantity,
          product:products(name)
        `)
        .eq('supplier_id', supplierId)
        .eq('movement_type', 'purchase')
        .order('occurred_at', { ascending: false })
        .limit(5);

      if (recentPurchases) {
        recentPurchases.forEach((purchase: any) => {
          activities.push({
            id: `purchase-${purchase.id}`,
            type: 'stock_purchase',
            description: `Stock purchase: ${purchase.product?.name || 'Unknown'}`,
            date: purchase.occurred_at,
            amount: (purchase.unit_cost || 0) * (purchase.quantity || 0),
          });
        });
      }

      // Sort all activities by date, most recent first
      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6);
    },
  });

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'product':
        return <Package className="h-4 w-4" />;
      case 'expense':
        return <Receipt className="h-4 w-4" />;
      case 'stock_purchase':
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'product':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'expense':
        return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
      case 'stock_purchase':
        return 'bg-accent/10 text-accent-foreground border-accent/20';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-luxury text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-luxury text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Activity will appear here as transactions occur
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-start gap-3 border-l-2 border-muted pl-3 py-1"
              >
                <div className={`p-1.5 rounded-full ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                  </p>
                </div>
                {activity.amount !== undefined && activity.amount > 0 && (
                  <span className="text-sm font-mono text-muted-foreground">
                    £{activity.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

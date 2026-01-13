import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PoundSterling, Receipt, ShoppingCart, Package, AlertTriangle, BarChart3 } from 'lucide-react';
import { useTodayStats } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/lib/utils';

const ComparisonBadge = ({ current, previous, format = 'currency' }: {
  current: number;
  previous: number;
  format?: 'currency' | 'number';
}) => {
  if (previous === 0) return null;
  
  const change = ((current - previous) / previous) * 100;
  const isPositive = change >= 0;
  const formattedChange = Math.abs(change).toFixed(1);
  
  return (
    <Badge 
      variant={isPositive ? "default" : "secondary"}
      className={`text-xs ${isPositive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}
    >
      {isPositive ? '+' : '-'}{formattedChange}%
    </Badge>
  );
};

const StatItem = ({ 
  icon: Icon, 
  title, 
  value, 
  comparison 
}: {
  icon: any;
  title: string;
  value: string;
  comparison?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-muted rounded-lg">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-primary">{value}</p>
      </div>
    </div>
    {comparison && (
      <div className="text-right">
        {comparison}
      </div>
    )}
  </div>
);

export const TodayOverviewCard = () => {
  const { data: todayStats, isLoading } = useTodayStats();
  
  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Today's Overview</CardTitle>
          <CardDescription>Today's performance vs yesterday</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!todayStats) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Today's Overview</CardTitle>
          <CardDescription>Today's performance vs yesterday</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">No data available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PoundSterling className="h-5 w-5 text-muted-foreground" />
          Today's Overview
        </CardTitle>
        <CardDescription>Today's performance vs yesterday</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatItem
            icon={PoundSterling}
            title="Today's Sales"
            value={formatCurrency(todayStats.sales)}
            comparison={
              <ComparisonBadge
                current={todayStats.sales}
                previous={todayStats.yesterdayComparison.sales}
                format="currency"
              />
            }
          />
          
          <StatItem
            icon={Receipt}
            title="Transactions"
            value={todayStats.transactions.toString()}
            comparison={
              <ComparisonBadge
                current={todayStats.transactions}
                previous={todayStats.yesterdayComparison.transactions}
                format="number"
              />
            }
          />
          
          <StatItem
            icon={Package}
            title="Total Products"
            value={todayStats.totalProducts.toString()}
          />
          
          <StatItem
            icon={BarChart3}
            title="Inventory Value"
            value={formatCurrency(todayStats.totalInventoryValue)}
          />
          
          <StatItem
            icon={ShoppingCart}
            title="Items Sold"
            value={todayStats.itemsSold.toString()}
            comparison={
              <ComparisonBadge
                current={todayStats.itemsSold}
                previous={todayStats.yesterdayComparison.itemsSold}
                format="number"
              />
            }
          />
          
          <StatItem
            icon={AlertTriangle}
            title="Restock Alerts"
            value={todayStats.restockAlerts.toString()}
          />
        </div>
      </CardContent>
    </Card>
  );
};
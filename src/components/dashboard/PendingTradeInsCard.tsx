import { Card, CardContent } from '@/components/ui/card';
import { Repeat, ArrowUpRight } from 'lucide-react';
import { usePendingPartExchangesStats } from '@/hooks/usePartExchanges';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export function PendingTradeInsCard() {
  const { data: stats, isLoading } = usePendingPartExchangesStats();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer"
      onClick={() => navigate('/products/intake')}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-luxury text-lg font-semibold">Pending Trade-Ins</h3>
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-2xl font-bold tracking-tight">
            {stats?.count || 0} {stats?.count === 1 ? 'item' : 'items'}
          </p>
          <p className="text-sm text-muted-foreground">
            Total Value: {formatCurrency(stats?.totalValue || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Convert to inventory from the intake queue
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

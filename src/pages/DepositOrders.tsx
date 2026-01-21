import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Wallet,
  PoundSterling,
  Package,
  User,
  Calendar,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useDepositOrders, useDepositOrderStats, DepositOrderStatus } from '@/hooks/useDepositOrders';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG: Record<DepositOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Pending', variant: 'default', icon: Clock },
  completed: { label: 'Completed', variant: 'secondary', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

// Format currency helper
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(value);
};

function StatCard({ title, value, subtitle, icon: Icon, variant = 'default' }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: typeof Wallet;
  variant?: 'default' | 'success' | 'warning';
}) {
  const bgClass = variant === 'success' 
    ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
    : variant === 'warning'
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : 'bg-primary/10 text-primary';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${bgClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DepositOrderCard({ order, onClick }: { order: any; onClick: () => void }) {
  const config = STATUS_CONFIG[order.status as DepositOrderStatus];
  const StatusIcon = config.icon;
  const progressPercent = order.total_amount > 0 
    ? Math.round((order.amount_paid / order.total_amount) * 100) 
    : 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {order.customer_name || 'Walk-in Customer'}
              </h3>
              <Badge variant={config.variant} className="flex items-center gap-1 shrink-0">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Order #{order.id}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        {/* Items summary */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Package className="h-4 w-4" />
          <span className="truncate">{order.item_names || 'No items'}</span>
        </div>

        {/* Financial summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">{formatCurrency(order.total_amount || 0)}</span>
          </div>
          
          {order.status === 'pending' && (
            <>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Paid: {formatCurrency(order.amount_paid || 0)}
                </span>
                <span className="font-medium text-primary">
                  Due: {formatCurrency(order.balance_due || 0)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(order.created_at), 'dd MMM yyyy')}
          </div>
          {order.staff_name && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {order.staff_name}
            </div>
          )}
          {order.payment_count > 0 && (
            <div className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              {order.payment_count} payment{order.payment_count !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DepositOrders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | DepositOrderStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: orders, isLoading: ordersLoading, refetch } = useDepositOrders(activeTab === 'all' ? undefined : activeTab);
  const { data: stats, isLoading: statsLoading } = useDepositOrderStats();

  // Filter orders by search query
  const filteredOrders = orders?.filter(order => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      order.customer_name?.toLowerCase().includes(search) ||
      order.id?.toString().includes(search)
    );
  }) || [];

  return (
    <AppLayout title="Deposit Orders" subtitle="Manage layaway and deposit-based orders">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard
              title="Active Orders"
              value={stats?.pending.count || 0}
              subtitle={`${formatCurrency(stats?.pending.totalValue || 0)} total value`}
              icon={Clock}
            />
            <StatCard
              title="Deposits Collected"
              value={formatCurrency(stats?.pending.totalPaid || 0)}
              subtitle="From active orders"
              icon={PoundSterling}
              variant="success"
            />
            <StatCard
              title="Balance Due"
              value={formatCurrency(stats?.pending.balanceDue || 0)}
              subtitle="Outstanding from active orders"
              icon={Wallet}
              variant="warning"
            />
            <StatCard
              title="Completed"
              value={stats?.completed.count || 0}
              subtitle={`${formatCurrency(stats?.completed.totalValue || 0)} converted to sales`}
              icon={CheckCircle2}
              variant="success"
            />
          </>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, order ID, or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate('/sales?mode=deposit')}>
            <Plus className="h-4 w-4 mr-2" />
            New Deposit Order
          </Button>
        </div>
      </div>

      {/* Tabs and Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Pending
            {stats?.pending.count ? (
              <Badge variant="secondary" className="ml-1">{stats.pending.count}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4" />
            Cancelled
          </TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {ordersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Wallet className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No deposit orders found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : activeTab === 'pending'
                    ? 'Create a new deposit order to get started'
                    : `No ${activeTab} orders to display`
                  }
                </p>
                {!searchQuery && activeTab === 'pending' && (
                  <Button className="mt-4" onClick={() => navigate('/sales?mode=deposit')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Deposit Order
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <DepositOrderCard
                  key={order.id}
                  order={order}
                  onClick={() => navigate(`/deposits/${order.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

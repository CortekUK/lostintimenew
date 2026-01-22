import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  RefreshCw,
  LayoutList,
  LayoutGrid,
  CalendarClock,
  AlertCircle,
  Pencil
} from 'lucide-react';
import { 
  useDepositOrders, 
  useDepositOrderStats, 
  useCompleteDepositOrder,
  DepositOrderStatus,
  isPickupApproaching,
  isPickupOverdue,
  getDaysUntilPickup
} from '@/hooks/useDepositOrders';
import { RecordPaymentModal } from '@/components/deposits/RecordPaymentModal';
import { EditDepositOrderModal } from '@/components/deposits/EditDepositOrderModal';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<DepositOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  active: { label: 'Active', variant: 'default', icon: Clock },
  completed: { label: 'Completed', variant: 'secondary', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
  expired: { label: 'Expired', variant: 'destructive', icon: XCircle },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(value);
};

function StatCard({ title, value, subtitle, icon: Icon }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: typeof Wallet;
}) {
  return (
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
      <CardHeader className="flex flex-row items-start justify-between pb-2 min-h-[3.5rem]">
        <CardTitle className="text-sm font-medium text-muted-foreground flex-1 pr-2">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold font-luxury">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
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
  const isOverdue = order.status === 'active' && isPickupOverdue(order.expected_date);
  const isApproaching = order.status === 'active' && isPickupApproaching(order.expected_date) && !isOverdue;
  const daysUntil = getDaysUntilPickup(order.expected_date);

  return (
    <Card 
      className="cursor-pointer shadow-card hover:shadow-elegant transition-all duration-300 group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">
                {order.customer_name || 'Walk-in Customer'}
              </h3>
              <Badge variant={config.variant} className="flex items-center gap-1 shrink-0">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs shrink-0">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {Math.abs(daysUntil || 0)}d overdue
                </Badge>
              )}
              {isApproaching && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-xs shrink-0">
                  <CalendarClock className="h-3 w-3 mr-1" />
                  {daysUntil === 0 ? 'Today' : `${daysUntil}d left`}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Order #{order.id}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Package className="h-4 w-4" />
          <span className="truncate">{order.item_names || 'No items'}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium font-luxury">{formatCurrency(order.total_amount || 0)}</span>
          </div>
          
          {order.status === 'active' && (
            <>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Paid: {formatCurrency(order.amount_paid || 0)}
                </span>
                <span className="font-medium text-primary font-luxury">
                  Due: {formatCurrency(order.balance_due || 0)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(order.created_at), 'dd MMM yyyy')}
          </div>
          {order.expected_date && (
            <div className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {format(new Date(order.expected_date), 'dd MMM')}
            </div>
          )}
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

function DepositOrderTable({ 
  orders, 
  onRowClick,
  onEdit,
  onPay,
  onComplete
}: { 
  orders: any[]; 
  onRowClick: (id: number) => void;
  onEdit: (order: any) => void;
  onPay: (order: any) => void;
  onComplete: (order: any) => void;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Order #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Expected Pickup</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Balance Due</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const config = STATUS_CONFIG[order.status as DepositOrderStatus];
            const StatusIcon = config.icon;
            const isOverdue = order.status === 'active' && isPickupOverdue(order.expected_date);
            const isApproaching = order.status === 'active' && isPickupApproaching(order.expected_date) && !isOverdue;
            const daysUntil = getDaysUntilPickup(order.expected_date);
            
            return (
              <TableRow 
                key={order.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(order.id)}
              >
                <TableCell className="font-medium">
                  {order.customer_name || 'Walk-in Customer'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  #{order.id}
                </TableCell>
                <TableCell>
                  <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {order.item_names || 'No items'}
                </TableCell>
                <TableCell>
                  {order.expected_date ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{format(new Date(order.expected_date), 'dd MMM yyyy')}</span>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          {Math.abs(daysUntil || 0)}d overdue
                        </Badge>
                      )}
                      {isApproaching && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-xs">
                          {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Not set</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium font-luxury">
                  {formatCurrency(order.total_amount || 0)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(order.amount_paid || 0)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={order.balance_due > 0 ? 'text-primary font-medium font-luxury' : 'text-green-600'}>
                    {formatCurrency(order.balance_due || 0)}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(order.created_at), 'dd MMM yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); onEdit(order); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {order.status === 'active' && order.balance_due > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); onPay(order); }}
                      >
                        <PoundSterling className="h-4 w-4" />
                      </Button>
                    )}
                    {order.status === 'active' && (order.balance_due || 0) <= 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                        onClick={(e) => { e.stopPropagation(); onComplete(order); }}
                        title="Complete Order"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DepositOrders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | DepositOrderStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const { data: orders, isLoading: ordersLoading, refetch } = useDepositOrders(activeTab === 'all' ? undefined : activeTab);
  const { data: stats, isLoading: statsLoading } = useDepositOrderStats();
  const completeOrder = useCompleteDepositOrder();

  const filteredOrders = orders?.filter(order => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      order.customer_name?.toLowerCase().includes(search) ||
      order.id?.toString().includes(search)
    );
  }) || [];

  const handleRowClick = (id: number) => {
    navigate(`/deposits/${id}`);
  };

  const handleEditClick = (order: any) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handlePayClick = (order: any) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handleCompleteClick = async (order: any) => {
    if ((order.balance_due || 0) > 0) {
      toast.error('Order must be fully paid before completing');
      return;
    }
    try {
      const result = await completeOrder.mutateAsync(order.id);
      if (result?.sale?.id) {
        toast.success('Order completed! Redirecting to sale...');
        navigate(`/sales/${result.sale.id}`);
      }
    } catch (error) {
      // Error handled by hook
    }
  };

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
              title="Upcoming Pickups"
              value={stats?.approaching || 0}
              subtitle={stats?.overdue ? `${stats.overdue} overdue` : 'Next 7 days'}
              icon={CalendarClock}
            />
            <StatCard
              title="Balance Due"
              value={formatCurrency(stats?.pending.balanceDue || 0)}
              subtitle="Outstanding from active orders"
              icon={Wallet}
            />
            <StatCard
              title="Completed"
              value={stats?.completed.count || 0}
              subtitle={`${formatCurrency(stats?.completed.totalValue || 0)} converted to sales`}
              icon={CheckCircle2}
            />
          </>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}>
            <ToggleGroupItem value="list" aria-label="List view">
              <LayoutList className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
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
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="active" className="flex-1 flex items-center justify-center gap-1.5">
            <Clock className="h-4 w-4" />
            Active
            {stats?.pending.count ? (
              <Badge variant="secondary" className="ml-1">{stats.pending.count}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1 flex items-center justify-center gap-1.5">
            <XCircle className="h-4 w-4" />
            Cancelled
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1">All Orders</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {ordersLoading ? (
            viewMode === 'list' ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            )
          ) : filteredOrders.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Wallet className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No deposit orders found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : activeTab === 'active'
                    ? 'Create a new deposit order to get started'
                    : `No ${activeTab} orders to display`
                  }
                </p>
                {!searchQuery && activeTab === 'active' && (
                  <Button className="mt-4" onClick={() => navigate('/sales?mode=deposit')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Deposit Order
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            <DepositOrderTable 
              orders={filteredOrders} 
              onRowClick={handleRowClick}
              onEdit={handleEditClick}
              onPay={handlePayClick}
              onComplete={handleCompleteClick}
            />
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

      {/* Modals */}
      {selectedOrder && (
        <>
          <RecordPaymentModal
            open={showPaymentModal}
            onOpenChange={setShowPaymentModal}
            depositOrderId={selectedOrder.id}
            balanceDue={selectedOrder.balance_due || 0}
          />
          <EditDepositOrderModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            order={selectedOrder}
          />
        </>
      )}
    </AppLayout>
  );
}

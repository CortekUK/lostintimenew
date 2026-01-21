import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Wallet,
  PoundSterling,
  Package,
  User,
  Calendar,
  Plus,
  Trash2,
  Receipt,
  ExternalLink,
  Repeat,
  TrendingUp,
  CreditCard,
  Pencil,
  CalendarClock,
  AlertCircle
} from 'lucide-react';
import { 
  useDepositOrderDetails, 
  useCompleteDepositOrder, 
  useCancelDepositOrder,
  DepositOrderStatus,
  isPickupApproaching,
  isPickupOverdue,
  getDaysUntilPickup
} from '@/hooks/useDepositOrders';
import { RecordPaymentModal } from '@/components/deposits/RecordPaymentModal';
import { EditDepositOrderModal } from '@/components/deposits/EditDepositOrderModal';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions';

const STATUS_CONFIG: Record<DepositOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof Clock }> = {
  active: { label: 'Active', variant: 'default', icon: Clock },
  completed: { label: 'Completed', variant: 'secondary', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
  expired: { label: 'Expired', variant: 'destructive', icon: XCircle },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  transfer: 'Bank Transfer',
  other: 'Other',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(value);
};

export default function DepositOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = usePermissions();
  const orderId = id ? parseInt(id, 10) : null;
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  const { data: order, isLoading, error } = useDepositOrderDetails(orderId);
  const completeOrder = useCompleteDepositOrder();
  const cancelOrder = useCancelDepositOrder();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !order) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order not found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The deposit order you're looking for doesn't exist or has been removed.
          </p>
          <Button variant="outline" onClick={() => navigate('/deposits')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deposits
          </Button>
        </div>
      </AppLayout>
    );
  }

  const config = STATUS_CONFIG[order.status as DepositOrderStatus];
  const StatusIcon = config.icon;
  const partExchangeTotal = order.part_exchange_total || 0;
  const netOrderTotal = order.total_amount - partExchangeTotal;
  const progressPercent = netOrderTotal > 0 
    ? Math.round((order.amount_paid / netOrderTotal) * 100) 
    : 0;
  const canManage = role === 'owner' || role === 'manager';
  const isActive = order.status === 'active';
  const isFullyPaid = order.balance_due <= 0;

  const handleComplete = () => {
    if (orderId) {
      completeOrder.mutate(orderId, {
        onSuccess: () => {
          setShowCompleteDialog(false);
          navigate('/deposits');
        },
      });
    }
  };

  const handleCancel = () => {
    if (orderId) {
      cancelOrder.mutate({ orderId, reason: cancelReason }, {
        onSuccess: () => {
          setShowCancelDialog(false);
          setCancelReason('');
          navigate('/deposits');
        },
      });
    }
  };

  const pickupOverdue = isActive && isPickupOverdue(order.expected_date);
  const pickupApproaching = isActive && isPickupApproaching(order.expected_date) && !pickupOverdue;
  const daysUntilPickup = getDaysUntilPickup(order.expected_date);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Overdue Alert Banner */}
        {pickupOverdue && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pickup Overdue</AlertTitle>
            <AlertDescription>
              This order was expected for pickup on {format(new Date(order.expected_date!), 'PPP')} ({Math.abs(daysUntilPickup || 0)} days ago). Consider contacting the customer.
            </AlertDescription>
          </Alert>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/deposits')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-luxury font-bold">Deposit Order #{order.id}</h1>
                <Badge variant={config.variant} className="flex items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">{order.customer_name || 'Walk-in Customer'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-11 sm:ml-0">
            {isActive && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
                {isFullyPaid && (
                  <Button size="sm" onClick={() => setShowCompleteDialog(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                )}
                {canManage && (
                  <Button variant="destructive" size="sm" onClick={() => setShowCancelDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </>
            )}
            {order.sale_id && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${order.sale_id}`)}>
                <Receipt className="h-4 w-4 mr-2" />
                View Sale
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-fr">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-h-[3.5rem]">
              <CardTitle className="text-sm font-medium text-muted-foreground">Order Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(order.total_amount)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-h-[3.5rem]">
              <CardTitle className="text-sm font-medium text-muted-foreground">Amount Paid</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(order.amount_paid)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-h-[3.5rem]">
              <CardTitle className="text-sm font-medium text-muted-foreground">Balance Due</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${order.balance_due > 0 ? 'text-primary' : 'text-green-600'}`}>
                {formatCurrency(order.balance_due)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-h-[3.5rem]">
              <CardTitle className="text-sm font-medium text-muted-foreground">Payments</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{order.deposit_payments?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        {isActive && (
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Payment Progress</span>
                <span className="text-sm text-muted-foreground">{progressPercent}% Complete</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.deposit_order_items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">
                          {item.product?.name || item.product_name}
                        </p>
                        {item.product?.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                        )}
                        {item.is_custom_order && (
                          <Badge variant="outline" className="mt-1">Custom Order</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.unit_price * item.quantity)}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trade-In Items */}
                {order.deposit_order_part_exchanges && order.deposit_order_part_exchanges.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Repeat className="h-4 w-4" />
                        Trade-In Items
                      </h4>
                      <div className="space-y-2">
                        {order.deposit_order_part_exchanges.map((px) => (
                          <div key={px.id} className="flex items-center justify-between py-2 px-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div>
                              <p className="font-medium text-amber-900 dark:text-amber-200">{px.product_name}</p>
                              {px.category && (
                                <p className="text-sm text-amber-700 dark:text-amber-400">{px.category}</p>
                              )}
                              {px.serial && (
                                <p className="text-xs text-muted-foreground">S/N: {px.serial}</p>
                              )}
                            </div>
                            <span className="font-medium text-green-600">-{formatCurrency(px.allowance)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator className="my-4" />

                {/* Financial Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items Total</span>
                    <span>{formatCurrency(order.total_amount)}</span>
                  </div>
                  {partExchangeTotal > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Trade-In Allowance</span>
                        <span className="text-green-600">-{formatCurrency(partExchangeTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Net Order Total</span>
                        <span>{formatCurrency(netOrderTotal)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="text-green-600">{formatCurrency(order.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Balance Due</span>
                    <span className={order.balance_due > 0 ? 'text-primary' : 'text-green-600'}>
                      {formatCurrency(order.balance_due)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5" />
                  Payment History
                </CardTitle>
                <CardDescription>
                  {order.deposit_payments?.length || 0} payment{(order.deposit_payments?.length || 0) !== 1 ? 's' : ''} recorded
                </CardDescription>
              </CardHeader>
              <CardContent>
                {order.deposit_payments && order.deposit_payments.length > 0 ? (
                  <div className="space-y-4">
                    {order.deposit_payments.map((payment) => (
                      <div key={payment.id} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <PoundSterling className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                            <Badge variant="outline">
                              {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payment.received_at), 'dd MMM yyyy, HH:mm')}
                          </p>
                          {payment.notes && (
                            <p className="text-sm mt-1 italic text-muted-foreground">{payment.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No payments recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{order.customer_name || 'Walk-in Customer'}</p>
                </div>
                {order.customer && (
                  <>
                    {order.customer.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-sm">{order.customer.email}</p>
                      </div>
                    )}
                    {order.customer.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-sm">{order.customer.phone}</p>
                      </div>
                    )}
                  </>
                )}
                {order.customer_id > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => navigate(`/customers/${order.customer_id}`)}
                  >
                    View Customer Profile
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{format(new Date(order.created_at), 'dd MMM yyyy, HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Pickup</p>
                  {order.expected_date ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{format(new Date(order.expected_date), 'PPP')}</p>
                      {pickupOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          {Math.abs(daysUntilPickup || 0)}d overdue
                        </Badge>
                      )}
                      {pickupApproaching && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-xs">
                          {daysUntilPickup === 0 ? 'Today' : `${daysUntilPickup}d left`}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground italic">Not set</p>
                      {isActive && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowEditModal(true)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {order.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-sm">{format(new Date(order.completed_at), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                )}
                {order.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <RecordPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        depositOrderId={orderId!}
        balanceDue={order.balance_due}
      />

      {/* Complete Order Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Deposit Order</AlertDialogTitle>
            <AlertDialogDescription>
              This will convert the deposit order into a sale. The order is fully paid 
              and ready to be completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleComplete}
              disabled={completeOrder.isPending}
            >
              {completeOrder.isPending ? 'Completing...' : 'Complete Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Order Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Deposit Order</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the deposit order and release any reserved stock. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Cancellation Reason (optional)</label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              disabled={cancelOrder.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelOrder.isPending ? 'Cancelling...' : 'Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      <EditDepositOrderModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        order={order}
      />
    </AppLayout>
  );
}

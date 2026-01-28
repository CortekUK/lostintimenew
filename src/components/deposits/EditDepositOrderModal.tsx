import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, Package, Loader2, AlertCircle, Check, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUpdateDepositOrder, useUpdateDepositOrderItemCost, useDepositOrderDetails } from '@/hooks/useDepositOrders';
import { SetCustomItemCostModal } from './SetCustomItemCostModal';
import { toast } from '@/hooks/use-toast';

interface DepositOrderItem {
  id: number;
  product_name: string;
  unit_price: number;
  unit_cost: number;
  quantity: number;
  is_custom_order: boolean;
  category?: string | null;
  description?: string | null;
  product?: { name: string } | null;
}

interface EditDepositOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function EditDepositOrderModal({ open, onOpenChange, orderId }: EditDepositOrderModalProps) {
  const [notes, setNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DepositOrderItem | null>(null);
  
  // Fetch full order details when modal opens
  const { data: order, isLoading } = useDepositOrderDetails(open ? orderId : null);
  const updateOrder = useUpdateDepositOrder();
  const updateItemCost = useUpdateDepositOrderItemCost();

  // Reset form when order data loads
  useEffect(() => {
    if (order) {
      setNotes(order.notes || '');
      setExpectedDate(order.expected_date ? new Date(order.expected_date) : undefined);
    }
  }, [order]);

  const handleSave = () => {
    updateOrder.mutate(
      {
        id: orderId,
        notes: notes || null,
        expected_date: expectedDate ? format(expectedDate, 'yyyy-MM-dd') : null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleSaveItemCost = (data: {
    itemId: number;
    unit_cost: number;
    category?: string;
    description?: string;
  }) => {
    updateItemCost.mutate(data, {
      onSuccess: () => {
        setEditingItem(null);
        toast({
          title: 'Cost updated',
          description: 'Item cost has been saved successfully.',
        });
      },
    });
  };

  // Calculate totals from order data
  const itemsTotal = order?.deposit_order_items?.length 
    ? order.deposit_order_items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      )
    : (order?.total_amount || 0);

  const partExchangeTotal = order?.deposit_order_part_exchanges?.length 
    ? order.deposit_order_part_exchanges.reduce(
        (sum, px) => sum + px.allowance,
        0
      )
    : (order?.part_exchange_total || 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Deposit Order #{orderId}</DialogTitle>
            <DialogDescription>
              Update order notes and expected pickup date. Item changes require cancellation and re-creation.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : order ? (
            <div className="space-y-6 py-4">
              {/* Order Items Summary */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4" />
                  Order Items
                </Label>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  {order.deposit_order_items?.map((item) => {
                    const isCustom = item.is_custom_order;
                    const hasCost = item.unit_cost > 0;
                    
                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 truncate flex-1 mr-2">
                            {isCustom && (
                              hasCost ? (
                                <Check className="h-4 w-4 text-green-600 shrink-0" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                              )
                            )}
                            <span className="truncate">
                              {item.product?.name || item.product_name}
                              {item.quantity > 1 && ` (×${item.quantity})`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-medium">
                              {formatCurrency(item.unit_price * item.quantity)}
                            </span>
                            {isCustom && (
                              <Button
                                variant={hasCost ? "ghost" : "outline"}
                                size="sm"
                                className={cn(
                                  "h-7 px-2 text-xs",
                                  !hasCost && "border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                )}
                                onClick={() => setEditingItem(item as DepositOrderItem)}
                              >
                                {hasCost ? (
                                  <><Pencil className="h-3 w-3 mr-1" /> Edit</>
                                ) : (
                                  'Set Cost'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        {isCustom && (
                          <p className="text-xs text-muted-foreground ml-6">
                            Custom • Cost: {hasCost ? formatCurrency(item.unit_cost) : <span className="text-amber-500">Not set</span>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {order.deposit_order_part_exchanges && order.deposit_order_part_exchanges.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      {order.deposit_order_part_exchanges.map((px) => (
                        <div key={px.id} className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-400">
                          <span className="truncate flex-1 mr-2">
                            Trade-In: {px.product_name}
                          </span>
                          <span className="font-medium shrink-0">
                            -{formatCurrency(px.allowance)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between font-medium">
                    <span>Order Total</span>
                    <span>{formatCurrency(itemsTotal - partExchangeTotal)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  To modify items, cancel this order and create a new one.
                </p>
              </div>

              {/* Expected Pickup Date */}
              <div className="space-y-2">
                <Label htmlFor="expected-date">Expected Pickup Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="expected-date"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !expectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expectedDate ? format(expectedDate, 'PPP') : 'Select date (optional)'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expectedDate}
                      onSelect={(date) => {
                        setExpectedDate(date);
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {expectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setExpectedDate(undefined)}
                  >
                    Clear date
                  </Button>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Order Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this order..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateOrder.isPending || isLoading}>
              {updateOrder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cost editing modal */}
      <SetCustomItemCostModal
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem}
        onSave={handleSaveItemCost}
        isPending={updateItemCost.isPending}
      />
    </>
  );
}

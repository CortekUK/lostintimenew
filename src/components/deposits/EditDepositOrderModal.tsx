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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarIcon, Package, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUpdateDepositOrder, DepositOrderWithDetails } from '@/hooks/useDepositOrders';

interface EditDepositOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: DepositOrderWithDetails;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(value);
};

export function EditDepositOrderModal({ open, onOpenChange, order }: EditDepositOrderModalProps) {
  const [notes, setNotes] = useState(order.notes || '');
  const [expectedDate, setExpectedDate] = useState<Date | undefined>(
    order.expected_date ? new Date(order.expected_date) : undefined
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const updateOrder = useUpdateDepositOrder();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setNotes(order.notes || '');
      setExpectedDate(order.expected_date ? new Date(order.expected_date) : undefined);
    }
  }, [open, order]);

  const handleSave = () => {
    updateOrder.mutate(
      {
        id: order.id,
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

  const itemsTotal = order.deposit_order_items?.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  ) || 0;

  const partExchangeTotal = order.deposit_order_part_exchanges?.reduce(
    (sum, px) => sum + px.allowance,
    0
  ) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Deposit Order #{order.id}</DialogTitle>
          <DialogDescription>
            Update order notes and expected pickup date. Item changes require cancellation and re-creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Items Summary (Read-only) */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" />
              Order Items
            </Label>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              {order.deposit_order_items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2">
                    {item.product?.name || item.product_name}
                    {item.quantity > 1 && ` (×${item.quantity})`}
                  </span>
                  <span className="font-medium shrink-0">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateOrder.isPending}>
            {updateOrder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

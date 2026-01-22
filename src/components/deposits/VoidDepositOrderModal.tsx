import { useState } from 'react';
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
import { AlertTriangle } from 'lucide-react';
import { useVoidDepositOrder } from '@/hooks/useDepositOrders';

interface VoidDepositOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: { id: number; customer_name?: string } | null;
  onSuccess?: () => void;
}

export function VoidDepositOrderModal({
  open,
  onOpenChange,
  order,
  onSuccess
}: VoidDepositOrderModalProps) {
  const [reason, setReason] = useState('');
  const voidOrder = useVoidDepositOrder();

  const handleVoid = async () => {
    if (!order) return;
    try {
      await voidOrder.mutateAsync({ orderId: order.id, reason: reason || undefined });
      onOpenChange(false);
      setReason('');
      onSuccess?.();
    } catch (error) {
      // Error handled by hook
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!voidOrder.isPending) {
        onOpenChange(isOpen);
        if (!isOpen) setReason('');
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive font-luxury">
            <AlertTriangle className="h-5 w-5" />
            Void Deposit Order #{order.id}
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>Are you sure you want to void this deposit order?</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Release all reserved items back to available stock</li>
              <li>Mark the order as voided (remains in records for audit)</li>
              {order.customer_name && (
                <li>Customer: {order.customer_name}</li>
              )}
            </ul>
            <p className="font-medium text-foreground">
              This action cannot be undone.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="void-reason">Reason for voiding (optional)</Label>
          <Textarea
            id="void-reason"
            placeholder="e.g., Customer cancelled, Duplicate order..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={voidOrder.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleVoid} disabled={voidOrder.isPending}>
            {voidOrder.isPending ? 'Voiding...' : 'Void Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

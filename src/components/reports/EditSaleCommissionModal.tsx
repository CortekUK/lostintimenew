import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateSaleCommission } from '@/hooks/useStaffCommissionOverrides';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface EditSaleCommissionModalProps {
  open: boolean;
  onClose: () => void;
  saleId: number;
  currentCommission: number;
  calculatedCommission: number;
  hasOverride: boolean;
  overrideReason?: string | null;
}

export function EditSaleCommissionModal({
  open,
  onClose,
  saleId,
  currentCommission,
  calculatedCommission,
  hasOverride,
  overrideReason,
}: EditSaleCommissionModalProps) {
  const [amount, setAmount] = useState(currentCommission.toString());
  const [reason, setReason] = useState(overrideReason || '');
  const updateCommission = useUpdateSaleCommission();

  useEffect(() => {
    if (open) {
      setAmount(currentCommission.toString());
      setReason(overrideReason || '');
    }
  }, [open, currentCommission, overrideReason]);

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return;
    }

    updateCommission.mutate(
      {
        sale_id: saleId,
        commission_override: numAmount,
        commission_override_reason: reason || null,
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  const handleReset = () => {
    updateCommission.mutate(
      {
        sale_id: saleId,
        commission_override: null,
        commission_override_reason: null,
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  const numAmount = parseFloat(amount);
  const isValid = !isNaN(numAmount) && numAmount >= 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Sale Commission</DialogTitle>
          <DialogDescription>
            Override the commission for this specific sale
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Calculated Commission</span>
            <span className="font-medium">£{calculatedCommission.toFixed(2)}</span>
          </div>

          {hasOverride && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">This sale has a custom commission override</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="commission-amount">Commission Amount (£)</Label>
            <Input
              id="commission-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter commission amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Override</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional: explain why the commission is being adjusted"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasOverride && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={updateCommission.isPending}
              className="sm:mr-auto"
            >
              Reset to Calculated
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || updateCommission.isPending}
          >
            {updateCommission.isPending ? 'Saving...' : 'Save Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

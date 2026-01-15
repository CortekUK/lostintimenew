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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useStaffCommissionOverride,
  useUpsertStaffCommissionOverride,
  useDeleteStaffCommissionOverride,
} from '@/hooks/useStaffCommissionOverrides';
import { useSettings } from '@/contexts/SettingsContext';
import { Badge } from '@/components/ui/badge';

interface StaffCommissionOverrideModalProps {
  open: boolean;
  onClose: () => void;
  staffId: string;
  staffName: string;
}

export function StaffCommissionOverrideModal({
  open,
  onClose,
  staffId,
  staffName,
}: StaffCommissionOverrideModalProps) {
  const { settings } = useSettings();
  const { data: override, isLoading } = useStaffCommissionOverride(staffId);
  const upsertOverride = useUpsertStaffCommissionOverride();
  const deleteOverride = useDeleteStaffCommissionOverride();

  const [rate, setRate] = useState('');
  const [basis, setBasis] = useState<'revenue' | 'profit'>('revenue');
  const [notes, setNotes] = useState('');

  const globalRate = settings.commissionSettings?.defaultRate ?? 5;
  const globalBasis = settings.commissionSettings?.calculationBasis ?? 'revenue';

  useEffect(() => {
    if (open) {
      if (override) {
        setRate(override.commission_rate.toString());
        setBasis(override.commission_basis);
        setNotes(override.notes || '');
      } else {
        setRate(globalRate.toString());
        setBasis(globalBasis);
        setNotes('');
      }
    }
  }, [open, override, globalRate, globalBasis]);

  const handleSave = () => {
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      return;
    }

    upsertOverride.mutate(
      {
        staff_id: staffId,
        commission_rate: numRate,
        commission_basis: basis,
        notes: notes || undefined,
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  const handleReset = () => {
    deleteOverride.mutate(staffId, {
      onSuccess: () => onClose(),
    });
  };

  const numRate = parseFloat(rate);
  const isValid = !isNaN(numRate) && numRate >= 0 && numRate <= 100;
  const isPending = upsertOverride.isPending || deleteOverride.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Commission Rate</DialogTitle>
          <DialogDescription>
            Set a custom commission rate for {staffName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Global Default</span>
                <Badge variant="secondary">
                  {globalRate}% of {globalBasis}
                </Badge>
              </div>

              {override && (
                <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <span className="text-sm">Current Custom Rate</span>
                  <Badge variant="default">
                    {override.commission_rate}% of {override.commission_basis}
                  </Badge>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="commission-rate">Commission Rate (%)</Label>
                <Input
                  id="commission-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="Enter commission rate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commission-basis">Calculate Based On</Label>
                <Select value={basis} onValueChange={(v) => setBasis(v as 'revenue' | 'profit')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue (Sale Price)</SelectItem>
                    <SelectItem value="profit">Profit (Margin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional: add notes about this rate"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {override && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isPending}
                  className="sm:mr-auto"
                >
                  Use Global Default
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!isValid || isPending}>
                {isPending ? 'Saving...' : 'Save Rate'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

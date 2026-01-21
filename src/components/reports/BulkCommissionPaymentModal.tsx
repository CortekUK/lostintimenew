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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRecordCommissionPayment } from '@/hooks/useCommissionPayments';
import { useToast } from '@/hooks/use-toast';
import { MonthlyCommission, StaffMonthlyData } from '@/hooks/useMonthlyCommission';
import { Users, CheckCircle } from 'lucide-react';

interface BulkCommissionPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: MonthlyCommission;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export function BulkCommissionPaymentModal({
  open,
  onOpenChange,
  month,
}: BulkCommissionPaymentModalProps) {
  // Only show staff with outstanding amounts
  const unpaidStaff = month.staffData.filter(s => s.outstanding > 0);
  
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(
    new Set(unpaidStaff.map(s => s.staffId))
  );
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const recordPayment = useRecordCommissionPayment();
  const { toast } = useToast();

  const toggleStaff = (staffId: string) => {
    setSelectedStaffIds(prev => {
      const next = new Set(prev);
      if (next.has(staffId)) {
        next.delete(staffId);
      } else {
        next.add(staffId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStaffIds.size === unpaidStaff.length) {
      setSelectedStaffIds(new Set());
    } else {
      setSelectedStaffIds(new Set(unpaidStaff.map(s => s.staffId)));
    }
  };

  const selectedStaff = unpaidStaff.filter(s => selectedStaffIds.has(s.staffId));
  const totalAmount = selectedStaff.reduce((sum, s) => sum + s.outstanding, 0);

  const handleSubmit = async () => {
    if (selectedStaff.length === 0) {
      toast({
        title: 'No staff selected',
        description: 'Please select at least one staff member to pay.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const staff of selectedStaff) {
      try {
        await recordPayment.mutateAsync({
          staffId: staff.staffId,
          staffName: staff.staffName,
          periodStart: month.periodStart,
          periodEnd: month.periodEnd,
          salesCount: staff.salesCount,
          revenueTotal: staff.revenue,
          profitTotal: staff.profit,
          commissionRate: staff.effectiveRate,
          commissionBasis: staff.effectiveBasis,
          commissionAmount: staff.outstanding,
          paymentMethod,
          notes: notes || undefined,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to record payment for ${staff.staffName}:`, error);
        failCount++;
      }
    }

    setIsSubmitting(false);

    if (successCount > 0) {
      toast({
        title: 'Bulk payment recorded',
        description: `Successfully paid ${successCount} staff member${successCount > 1 ? 's' : ''} (£${totalAmount.toFixed(2)} total)${failCount > 0 ? `. ${failCount} failed.` : ''}`,
      });
      onOpenChange(false);
      setNotes('');
    } else {
      toast({
        title: 'Payment failed',
        description: 'Failed to record commission payments. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Pay Commission - {month.monthLabel}
          </DialogTitle>
          <DialogDescription>
            Pay all outstanding commission for multiple staff members at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {unpaidStaff.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success" />
              <p className="font-medium">All commission paid for this month!</p>
            </div>
          ) : (
            <>
              {/* Staff Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Staff to Pay</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAll}
                    className="text-xs"
                  >
                    {selectedStaffIds.size === unpaidStaff.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                  {unpaidStaff.map((staff) => (
                    <div
                      key={staff.staffId}
                      className="flex items-center justify-between px-3 py-2 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedStaffIds.has(staff.staffId)}
                          onCheckedChange={() => toggleStaff(staff.staffId)}
                        />
                        <div>
                          <p className="text-sm font-medium">{staff.staffName}</p>
                          <p className="text-xs text-muted-foreground">
                            {staff.salesCount} sales • {staff.effectiveRate}% rate
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-[hsl(var(--gold))]">
                        £{staff.outstanding.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total to Pay</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedStaff.length} staff member{selectedStaff.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-[hsl(var(--gold))]">
                    £{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this bulk payment..."
                    rows={2}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {unpaidStaff.length > 0 && (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || selectedStaff.length === 0}
            >
              {isSubmitting ? 'Processing...' : `Pay ${selectedStaff.length} Staff (£${totalAmount.toFixed(2)})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { useRecordCommissionPayment } from '@/hooks/useCommissionPayments';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface StaffCommissionData {
  staffId: string;
  staffName: string;
  salesCount: number;
  revenue: number;
  profit: number;
  commission: number;
}

interface RecordCommissionPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffData: StaffCommissionData;
  dateRange: { from: Date | undefined; to: Date | undefined };
  commissionRate: number;
  commissionBasis: 'revenue' | 'profit';
  alreadyPaid: number;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export function RecordCommissionPaymentModal({
  open,
  onOpenChange,
  staffData,
  dateRange,
  commissionRate,
  commissionBasis,
  alreadyPaid,
}: RecordCommissionPaymentModalProps) {
  const outstanding = staffData.commission - alreadyPaid;
  const [paymentAmount, setPaymentAmount] = useState(outstanding.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');
  
  const recordPayment = useRecordCommissionPayment();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: 'Date range required',
        description: 'Please select a date range first.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await recordPayment.mutateAsync({
        staffId: staffData.staffId,
        periodStart: format(dateRange.from, 'yyyy-MM-dd'),
        periodEnd: format(dateRange.to, 'yyyy-MM-dd'),
        salesCount: staffData.salesCount,
        revenueTotal: staffData.revenue,
        profitTotal: staffData.profit,
        commissionRate,
        commissionBasis,
        commissionAmount: amount,
        paymentMethod,
        notes: notes || undefined,
      });

      toast({
        title: 'Payment recorded',
        description: `£${amount.toFixed(2)} commission payment recorded for ${staffData.staffName}.`,
      });

      onOpenChange(false);
      setPaymentAmount('0');
      setNotes('');
    } catch (error) {
      toast({
        title: 'Error recording payment',
        description: 'Failed to record the commission payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const periodLabel = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`
    : 'Not selected';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Commission Payment</DialogTitle>
          <DialogDescription>
            Record a commission payment for {staffData.staffName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Staff Member</span>
              <p className="font-medium">{staffData.staffName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Period</span>
              <p className="font-medium">{periodLabel}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Sales Count</span>
              <p className="font-medium">{staffData.salesCount}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Commission Rate</span>
              <p className="font-medium">{commissionRate}% of {commissionBasis}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Commission Owed</span>
              <span className="font-medium">£{staffData.commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Already Paid</span>
              <span className="font-medium text-green-600">-£{alreadyPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-medium">Outstanding</span>
              <span className="font-bold text-primary">£{outstanding.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

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
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this payment..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={recordPayment.isPending}>
            {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

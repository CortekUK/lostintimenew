import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRecordPayout } from '@/hooks/useConsignments';
import { formatCurrency } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RecordPayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: {
    id: number;
    product?: { 
      name: string;
      consignment_terms?: string;
    };
    supplier?: { name: string };
    sale_price?: number;
    payout_amount?: number;
  };
}

export function RecordPayoutDialog({ open, onOpenChange, settlement }: RecordPayoutDialogProps) {
  const [payoutAmount, setPayoutAmount] = useState(String(settlement.payout_amount || 0));
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const recordPayout = useRecordPayout();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await recordPayout.mutateAsync({
      id: settlement.id,
      payout_amount: Number(payoutAmount),
      notes: notes.trim() || undefined
    });

    onOpenChange(false);
    // Reset form
    setNotes('');
    setPaymentDate(new Date());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record Payout</DialogTitle>
            <DialogDescription>
              Record payment to supplier for consignment sale
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Product Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Product</Label>
              <div className="text-sm font-medium">{settlement.product?.name}</div>
            </div>

            {/* Supplier Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Supplier</Label>
              <div className="text-sm font-medium">{settlement.supplier?.name}</div>
            </div>

            {/* Consignment Terms */}
            {settlement.product?.consignment_terms && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                <Label className="text-sm font-medium text-muted-foreground">Agreed Terms</Label>
                <div className="text-sm font-medium">{settlement.product.consignment_terms}</div>
              </div>
            )}

            {/* Sale Price */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Sale Price</Label>
              <div className="text-sm font-medium text-[#D4AF37]">
                {formatCurrency(Number(settlement.sale_price) || 0)}
              </div>
            </div>

            {/* Payout Amount */}
            <div className="space-y-2">
              <Label htmlFor="payout-amount">Payout Amount *</Label>
              <Input
                id="payout-amount"
                type="number"
                step="0.01"
                min="0"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                required
                className="font-medium"
              />
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label>Payment Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => date && setPaymentDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Settlement Reference / Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Settlement Reference / Notes</Label>
              <Textarea
                id="notes"
                placeholder="e.g., Bank transfer ref: TXN123456"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayout.isPending}>
              {recordPayout.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

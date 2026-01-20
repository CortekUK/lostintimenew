import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRecordPayout } from '@/hooks/useConsignments';
import { formatCurrency } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';

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

  // Reset form when settlement changes
  useEffect(() => {
    setPayoutAmount(String(settlement.payout_amount || 0));
    setPaymentDate(new Date());
    setNotes('');
  }, [settlement.id, settlement.payout_amount]);

  const salePrice = Number(settlement.sale_price) || 0;
  const payoutNum = Number(payoutAmount) || 0;
  const margin = salePrice - payoutNum;
  const marginPercent = salePrice > 0 ? (margin / salePrice) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await recordPayout.mutateAsync({
      id: settlement.id,
      payout_amount: payoutNum,
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
            {/* Product & Supplier Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <Label className="text-xs text-muted-foreground">Product</Label>
                <p className="font-medium text-sm mt-0.5 truncate">{settlement.product?.name}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <Label className="text-xs text-muted-foreground">Supplier</Label>
                <p className="font-medium text-sm mt-0.5 truncate">{settlement.supplier?.name}</p>
              </div>
            </div>

            {/* Agreed Terms */}
            {settlement.product?.consignment_terms && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                <Label className="text-xs text-muted-foreground">Agreed Terms</Label>
                <p className="font-medium text-sm mt-0.5">{settlement.product.consignment_terms}</p>
              </div>
            )}

            {/* Pricing Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <Label className="text-xs text-muted-foreground">Sale Price</Label>
                <p className="font-semibold text-lg text-[hsl(var(--gold))]">
                  {formatCurrency(salePrice)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground">Your Margin</Label>
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className={cn(
                  "font-semibold text-lg",
                  margin >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"
                )}>
                  {formatCurrency(margin)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({marginPercent.toFixed(1)}%)
                  </span>
                </p>
              </div>
            </div>

            {/* Payout Amount */}
            <div className="space-y-2">
              <Label htmlFor="payout-amount">Payout Amount *</Label>
              <CurrencyInput
                id="payout-amount"
                value={payoutAmount}
                onValueChange={setPayoutAmount}
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
            <Button 
              type="submit" 
              disabled={recordPayout.isPending || payoutNum <= 0}
              className="bg-gradient-primary"
            >
              {recordPayout.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

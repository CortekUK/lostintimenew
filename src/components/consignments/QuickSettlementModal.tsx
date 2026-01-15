import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
interface QuickSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  supplierName: string;
  salePrice: number;
  agreedPrice: number | null;
  productId: number;
  supplierId: number;
  saleId: number;
}

export function QuickSettlementModal({
  isOpen,
  onClose,
  productName,
  supplierName,
  salePrice,
  agreedPrice,
  productId,
  supplierId,
  saleId
}: QuickSettlementModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState<string>(agreedPrice?.toString() || '');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>('');

  const recordPayoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('consignment_settlements')
        .insert({
          product_id: productId,
          supplier_id: supplierId,
          sale_id: saleId,
          sale_price: salePrice,
          agreed_price: agreedPrice,
          payout_amount: parseFloat(payoutAmount),
          paid_at: paymentDate.toISOString(),
          notes: notes.trim() || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-details'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-settlements'] });
      toast({
        title: "Settlement Recorded",
        description: `Payment of £${parseFloat(payoutAmount).toFixed(2)} recorded for ${supplierName}`
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record settlement",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payout amount",
        variant: "destructive"
      });
      return;
    }
    recordPayoutMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-luxury">Record Consignment Settlement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="text-sm text-muted-foreground">Product</div>
            <div className="font-medium">{productName}</div>
          </div>

          {/* Supplier Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="text-sm text-muted-foreground">Supplier</div>
            <div className="font-medium">{supplierName}</div>
          </div>

          {/* Sale Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sale Price</Label>
              <div className="font-mono text-sm font-medium">£{salePrice.toFixed(2)}</div>
            </div>
            {agreedPrice && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Agreed Price</Label>
                <div className="font-mono text-sm font-medium">£{agreedPrice.toFixed(2)}</div>
              </div>
            )}
          </div>

          {/* Payout Amount */}
          <div className="space-y-2">
            <Label htmlFor="payout-amount">Payout Amount *</Label>
            <CurrencyInput
              id="payout-amount"
              value={payoutAmount}
              onValueChange={setPayoutAmount}
              placeholder="0.00"
            />
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(paymentDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="settlement-notes">Notes (Optional)</Label>
            <Textarea
              id="settlement-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this settlement..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={recordPayoutMutation.isPending}
            className="bg-gradient-primary"
          >
            {recordPayoutMutation.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

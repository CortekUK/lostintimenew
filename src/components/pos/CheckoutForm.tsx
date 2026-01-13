import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency, calculateCartTotals } from '@/lib/utils';
import type { CartItem, PaymentMethod, PartExchangeItem } from '@/types';
import { Calculator, CreditCard, Banknote, Smartphone, Building, Loader2, Percent, PoundSterling, PenTool, ChevronDown } from 'lucide-react';
import { SignaturePad, SignaturePadRef } from './SignaturePad';
export type DiscountType = 'percentage' | 'fixed';
interface CheckoutFormProps {
  items: CartItem[];
  partExchanges: PartExchangeItem[];
  discount: number;
  discountType: DiscountType;
  onDiscountChange: (discount: number) => void;
  onDiscountTypeChange: (type: DiscountType) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (email: string) => void;
  customerNotes: string;
  onCustomerNotesChange: (notes: string) => void;
  paymentMethod: PaymentMethod | '';
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCompleteSale: () => void;
  isProcessing: boolean;
  requiresOwnerApproval?: boolean;
  signature?: string | null;
  onSignatureChange?: (signature: string | null) => void;
  staffMember: string;
  onStaffMemberChange: (member: string) => void;
  staffMembers: string[];
}
const paymentMethods = [{
  value: 'cash' as PaymentMethod,
  label: 'Cash',
  icon: Banknote
}, {
  value: 'card' as PaymentMethod,
  label: 'Credit/Debit Card',
  icon: CreditCard
}, {
  value: 'transfer' as PaymentMethod,
  label: 'Bank Transfer',
  icon: Building
}, {
  value: 'other' as PaymentMethod,
  label: 'Other',
  icon: Smartphone
}];
export function CheckoutForm({
  items,
  partExchanges,
  discount,
  discountType,
  onDiscountChange,
  onDiscountTypeChange,
  customerName,
  onCustomerNameChange,
  customerEmail,
  onCustomerEmailChange,
  customerNotes,
  onCustomerNotesChange,
  paymentMethod,
  onPaymentMethodChange,
  onCompleteSale,
  isProcessing,
  requiresOwnerApproval,
  signature,
  onSignatureChange,
  staffMember,
  onStaffMemberChange,
  staffMembers
}: CheckoutFormProps) {
  const [discountInput, setDiscountInput] = useState(discount.toString());
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);

  // Calculate discount amount based on type
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountAmount = discountType === 'percentage' ? subtotal * discount / 100 : discount;
  const totals = calculateCartTotals(items.map(item => {
    const itemSubtotal = item.unit_price * item.quantity;
    const itemDiscountRatio = discountType === 'percentage' ? discount / 100 : subtotal > 0 ? discountAmount / subtotal : 0;
    return {
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      discount: itemSubtotal * itemDiscountRatio
    };
  }));
  const partExchangeTotal = partExchanges.reduce((sum, px) => sum + px.allowance, 0);
  const netTotal = totals.total - partExchangeTotal;
  const handleDiscountChange = (value: string) => {
    setDiscountInput(value);
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0) {
      if (discountType === 'percentage' && numValue <= 100) {
        onDiscountChange(numValue);
      } else if (discountType === 'fixed' && numValue <= subtotal) {
        onDiscountChange(numValue);
      }
    }
  };
  const canCompleteSale = (items.length > 0 || partExchanges.length > 0) && paymentMethod && staffMember && !isProcessing && (!requiresOwnerApproval || netTotal >= 0);
  return <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-luxury">
          <Calculator className="h-5 w-5 text-muted-foreground" />
          Checkout
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Staff Member Selection */}
        <div className="space-y-2">
          <Label htmlFor="staff-member">Processed By *</Label>
          <Select value={staffMember} onValueChange={onStaffMemberChange}>
            <SelectTrigger id="staff-member">
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staffMembers.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  No staff members configured.<br/>
                  Add staff in Settings.
                </div>
              ) : (
                staffMembers.map(member => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Customer Information */}
        <div className="space-y-2">
          <Label htmlFor="customer-name">Customer Name (Optional)</Label>
          <Input id="customer-name" placeholder="Enter customer name" value={customerName} onChange={e => onCustomerNameChange(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-email">Customer Email (Optional)</Label>
          <Input id="customer-email" type="email" placeholder="customer@example.com" value={customerEmail} onChange={e => onCustomerEmailChange(e.target.value)} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customer-notes">Notes (Optional)</Label>
          <Textarea id="customer-notes" placeholder="Special instructions, custom requests, etc." value={customerNotes} onChange={e => onCustomerNotesChange(e.target.value)} rows={2} />
        </div>

        {/* Discount */}
        <div className="space-y-2">
          <Label htmlFor="discount">Discount</Label>
          <ToggleGroup type="single" value={discountType} onValueChange={value => {
          if (value) {
            onDiscountTypeChange(value as DiscountType);
            onDiscountChange(0);
            setDiscountInput('0');
          }
        }} className="justify-start">
            <ToggleGroupItem value="percentage" aria-label="Percentage discount" className="gap-1">
              
              %
            </ToggleGroupItem>
            <ToggleGroupItem value="fixed" aria-label="Fixed amount discount" className="gap-1">
              
              £
            </ToggleGroupItem>
          </ToggleGroup>
          
          {discountType === 'percentage' ? <Input id="discount" type="number" min="0" max="100" step="0.1" value={discountInput} onChange={e => handleDiscountChange(e.target.value)} placeholder="0" /> : <CurrencyInput id="discount" value={discountInput} onValueChange={handleDiscountChange} />}
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <Label>Payment Method *</Label>
          <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map(method => {
              const Icon = method.icon;
              return <SelectItem key={method.value} value={method.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {method.label}
                    </div>
                  </SelectItem>;
            })}
            </SelectContent>
          </Select>
        </div>

        {/* Order Summary */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold text-base">Order Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items ({items.length}):</span>
              <span className="text-[#D4AF37] font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.discount_total > 0 && <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Discount {discountType === 'percentage' ? `(${discount}%)` : ''}:
                </span>
                <span className="text-green-600 font-medium">-{formatCurrency(totals.discount_total)}</span>
              </div>}
            {totals.tax_total > 0 && <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span className="text-[#D4AF37] font-medium">{formatCurrency(totals.tax_total)}</span>
              </div>}
            {partExchangeTotal > 0 && <div className="flex justify-between">
                <span className="text-muted-foreground">Trade-In ({partExchanges.length} items):</span>
                <span className="text-green-600 font-medium">-{formatCurrency(partExchangeTotal)}</span>
              </div>}
          </div>
          <div className={`flex justify-between text-lg font-bold pt-2 border-t ${netTotal < 0 ? 'text-red-600' : 'text-[#D4AF37]'}`}>
            <span>{netTotal < 0 ? 'Owed to Customer:' : 'Net Total:'}</span>
            <span>{formatCurrency(Math.abs(netTotal))}</span>
          </div>
          {netTotal < 0 && <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-2">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                ⚠️ Owner approval required for negative balance
              </p>
            </div>}
        </div>

        {/* Signature Section */}
        {onSignatureChange && (
          <div className="space-y-2">
            <Collapsible open={signatureOpen} onOpenChange={setSignatureOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Customer Signature {signature && '✓'}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${signatureOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                {signature ? (
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Signature Captured</label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onSignatureChange(null);
                            signaturePadRef.current?.clear();
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="border-2 border-muted rounded-lg overflow-hidden bg-background">
                        <img src={signature} alt="Customer signature" className="w-full h-40 object-contain" />
                      </div>
                    </div>
                  </Card>
                ) : (
                  <SignaturePad
                    ref={signaturePadRef}
                    onSave={(sig) => {
                      onSignatureChange(sig);
                      setSignatureOpen(false);
                    }}
                    onCancel={() => setSignatureOpen(false)}
                    disabled={isProcessing}
                  />
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Complete Sale Button */}
        <Button className="w-full text-lg font-bold shadow-gold bg-gradient-primary hover:scale-[1.02] transition-all duration-300" size="lg" onClick={onCompleteSale} disabled={!canCompleteSale}>
          {isProcessing ? <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing Sale...
            </> : <>
              {netTotal < 0 ? 'Process Refund' : 'Complete Sale'} — {formatCurrency(Math.abs(netTotal))}
            </>}
        </Button>
        
        {items.length === 0 && partExchanges.length === 0 && <p className="text-center text-sm text-muted-foreground">
            Add items to cart or part exchanges to enable checkout
          </p>}
        
        {(items.length > 0 || partExchanges.length > 0) && !staffMember && <p className="text-center text-sm text-muted-foreground">
            Select staff member to complete sale
          </p>}
        
        {(items.length > 0 || partExchanges.length > 0) && !paymentMethod && staffMember && <p className="text-center text-sm text-muted-foreground">
            Select a payment method to complete sale
          </p>}

        {requiresOwnerApproval && netTotal < 0 && <p className="text-center text-sm text-red-600">
            Owner approval required for transactions where customer is owed money
          </p>}
      </CardContent>
    </Card>;
}
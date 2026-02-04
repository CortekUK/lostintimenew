import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatCurrency, calculateCartTotals } from '@/lib/utils';
import type { CartItem, PaymentMethod } from '@/types';
import { CreditCard, Banknote, Smartphone, Building, Loader2, PenTool, ChevronDown, MapPin } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SignaturePad, SignaturePadRef } from './SignaturePad';
import { CustomerSearchInput } from './CustomerSearchInput';
import { LocationSelector } from '@/components/cash-drawer/LocationSelector';
import { Badge } from '@/components/ui/badge';
import { useLocation } from '@/hooks/useLocations';


export type DiscountType = 'percentage' | 'fixed';

interface CheckoutFormProps {
  items: CartItem[];
  discount: number;
  discountType: DiscountType;
  onDiscountChange: (discount: number) => void;
  onDiscountTypeChange: (type: DiscountType) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (email: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (phone: string) => void;
  selectedCustomerId: number | null;
  onCustomerSelect: (customerId: number | null, name: string, email: string, phone: string) => void;
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
  locationId: number | null;
  onLocationChange: (locationId: number | null) => void;
  locationLocked?: boolean;
  disabled?: boolean;
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
  discount,
  discountType,
  onDiscountChange,
  onDiscountTypeChange,
  customerName,
  onCustomerNameChange,
  customerEmail,
  onCustomerEmailChange,
  customerPhone,
  onCustomerPhoneChange,
  selectedCustomerId,
  onCustomerSelect,
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
  locationId,
  onLocationChange,
  locationLocked,
  disabled,
}: CheckoutFormProps) {
  const [discountInput, setDiscountInput] = useState(discount.toString());
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  
  // Fetch location name when locked
  const { data: locationData } = useLocation(locationLocked && locationId ? locationId : 0);
  const resolvedLocationName = locationData?.name || `Location #${locationId}`;

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
  const handleDiscountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, discountType === 'percentage' 
      ? Math.min(numValue, 100) 
      : Math.min(numValue, subtotal));
    
    setDiscountInput(clampedValue.toString());
    onDiscountChange(clampedValue);
  };
  const canCompleteSale = items.length > 0 && paymentMethod && staffMember && locationId && customerName.trim() && !isProcessing && !requiresOwnerApproval && !disabled;
  return <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-luxury">Checkout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Staff Member Display - Auto-filled from logged-in user */}
        <div className="space-y-2">
          <Label htmlFor="staff-member">Processed By</Label>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {staffMember ? staffMember.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
            <span className="font-medium">
              {staffMember || 'Loading...'}
            </span>
          </div>
        </div>

        {/* Shop Location - locked when cart has items */}
        {locationLocked && locationId ? (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shop Location *
            </Label>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
              <span className="font-medium">{resolvedLocationName}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                From product
              </Badge>
            </div>
          </div>
        ) : (
          <LocationSelector
            value={locationId}
            onChange={onLocationChange}
            required
          />
        )}

        {/* Customer Information */}
        <CustomerSearchInput
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          selectedCustomerId={selectedCustomerId}
          onCustomerNameChange={onCustomerNameChange}
          onCustomerEmailChange={onCustomerEmailChange}
          onCustomerPhoneChange={onCustomerPhoneChange}
          onCustomerSelect={onCustomerSelect}
        />
        
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
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t text-[#D4AF37]">
            <span>Total:</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
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
              {totals.total < 0 ? 'Process Refund' : 'Complete Sale'} — {formatCurrency(Math.abs(totals.total))}
            </>}
        </Button>
        
        {disabled && <p className="text-center text-sm text-destructive">
            You don't have permission to create sales
          </p>}

        {!disabled && items.length === 0 && <p className="text-center text-sm text-muted-foreground">
            Add items to cart or part exchanges to enable checkout
          </p>}
        
        {items.length > 0 && !staffMember && <p className="text-center text-sm text-muted-foreground">
            Select staff member to complete sale
          </p>}
        
        {items.length > 0 && !paymentMethod && staffMember && locationId && customerName.trim() && <p className="text-center text-sm text-muted-foreground">
            Select a payment method to complete sale
          </p>}

        {items.length > 0 && staffMember && !locationId && <p className="text-center text-sm text-muted-foreground">
            Select a shop location to complete sale
          </p>}

        {items.length > 0 && staffMember && locationId && !customerName.trim() && <p className="text-center text-sm text-muted-foreground">
            Enter customer name to complete sale
          </p>}

        {requiresOwnerApproval && totals.total < 0 && <p className="text-center text-sm text-red-600">
            Manager or Owner approval required for transactions where customer is owed money
          </p>}
      </CardContent>
    </Card>;
}
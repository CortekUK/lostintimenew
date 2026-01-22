import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency, calculateCartTotals } from '@/lib/utils';
import type { CartItem, PaymentMethod, PartExchangeItem, CustomCartItem } from '@/types';
import { CreditCard, Banknote, Smartphone, Building, Loader2, Wallet, ShoppingBag } from 'lucide-react';
import { CustomerSearchInput } from './CustomerSearchInput';
import { LocationSelector } from '@/components/cash-drawer/LocationSelector';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { useLocation } from '@/hooks/useLocations';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface DepositCheckoutSectionProps {
  items: CartItem[];
  customItems?: CustomCartItem[];
  partExchanges: PartExchangeItem[];
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
  staffMember: string;
  locationId: number | null;
  onLocationChange: (locationId: number | null) => void;
  locationLocked?: boolean;
  onCreateDepositOrder: (initialPayment: number, paymentMethod: PaymentMethod) => void;
  isProcessing: boolean;
  disabled?: boolean;
  onSwitchToSale?: () => void;
}

const paymentMethods = [
  { value: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote },
  { value: 'card' as PaymentMethod, label: 'Credit/Debit Card', icon: CreditCard },
  { value: 'transfer' as PaymentMethod, label: 'Bank Transfer', icon: Building },
  { value: 'other' as PaymentMethod, label: 'Other', icon: Smartphone },
];

export function DepositCheckoutSection({
  items,
  customItems = [],
  partExchanges,
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
  staffMember,
  locationId,
  onLocationChange,
  locationLocked,
  onCreateDepositOrder,
  isProcessing,
  disabled,
  onSwitchToSale,
}: DepositCheckoutSectionProps) {
  const [initialPayment, setInitialPayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Fetch location name when locked
  const { data: locationData } = useLocation(locationLocked && locationId ? locationId : 0);
  const resolvedLocationName = locationData?.name || `Location #${locationId}`;

  // Calculate totals including part exchanges and custom items
  const regularSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const customSubtotal = customItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  
  const regularTotals = calculateCartTotals(
    items.map((item) => ({
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      discount: 0,
    }))
  );

  const customTax = customItems.reduce((sum, item) => sum + (item.unit_price * item.quantity * (item.tax_rate / 100)), 0);
  const totalAmount = regularTotals.total + customSubtotal + customTax;

  const partExchangeTotal = partExchanges.reduce((sum, px) => sum + px.allowance, 0);
  const netOrderTotal = totalAmount - partExchangeTotal;

  const initialPaymentAmount = parseFloat(initialPayment) || 0;
  const balanceAfterDeposit = netOrderTotal - initialPaymentAmount;
  const depositPercentage = netOrderTotal > 0 ? (initialPaymentAmount / netOrderTotal) * 100 : 0;

  const hasItems = items.length > 0 || customItems.length > 0;

  const canCreate =
    hasItems &&
    customerName.trim() &&
    staffMember &&
    locationId &&
    initialPaymentAmount > 0 &&
    initialPaymentAmount <= netOrderTotal &&
    !isProcessing &&
    !disabled;

  const handleCreate = () => {
    onCreateDepositOrder(initialPaymentAmount, paymentMethod);
  };

  return (
    <Card className="shadow-card border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="font-luxury">Deposit Order</CardTitle>
          {onSwitchToSale && (
            <ToggleGroup
              type="single"
              value="deposit"
              onValueChange={(value) => {
                if (value === 'sale') onSwitchToSale();
              }}
              className="bg-muted/50 p-1 rounded-lg w-full sm:w-auto"
            >
              <ToggleGroupItem 
                value="sale" 
                aria-label="Complete sale now"
                className="gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm px-2 sm:px-3 flex-1 sm:flex-initial"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm">Complete Sale</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="deposit" 
                aria-label="Create deposit order"
                className="gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm px-2 sm:px-3 flex-1 sm:flex-initial"
              >
                <Wallet className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm">Deposit Order</span>
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Reserve items with a partial payment. Customer pays balance on collection.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Staff Member Display */}
        <div className="space-y-2">
          <Label htmlFor="staff-member">Processed By</Label>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {staffMember ? staffMember.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
            <span className="font-medium">{staffMember || 'Loading...'}</span>
          </div>
        </div>

        {/* Shop Location */}
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
          <LocationSelector value={locationId} onChange={onLocationChange} required />
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
          <Textarea
            id="customer-notes"
            placeholder="Special instructions, collection date, etc."
            value={customerNotes}
            onChange={(e) => onCustomerNotesChange(e.target.value)}
            rows={2}
          />
        </div>

        {/* Order Summary */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold text-base">Order Summary</h4>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Items Total:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
          {partExchangeTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trade-In ({partExchanges.length} item{partExchanges.length !== 1 ? 's' : ''}):</span>
              <span className="text-success">-{formatCurrency(partExchangeTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Net Order Total:</span>
            <span className="text-primary">{formatCurrency(netOrderTotal)}</span>
          </div>
        </div>

        {/* Deposit Payment Section */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold text-base">Initial Deposit</h4>

          <div className="space-y-2">
            <Label>Deposit Amount *</Label>
            <CurrencyInput
              value={initialPayment}
              onValueChange={setInitialPayment}
              placeholder="Enter deposit amount"
            />
            {initialPaymentAmount > 0 && totalAmount > 0 && (
              <div className="space-y-1">
                <Progress value={depositPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {depositPercentage.toFixed(0)}% of total ({formatCurrency(initialPaymentAmount)})
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {method.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {initialPaymentAmount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deposit:</span>
                <span className="text-green-600 font-medium">{formatCurrency(initialPaymentAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Balance Due on Collection:</span>
                <span className="text-primary">{formatCurrency(balanceAfterDeposit)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Create Button */}
        <Button
          className="w-full text-lg font-bold shadow-gold bg-gradient-primary hover:scale-[1.02] transition-all duration-300"
          size="lg"
          onClick={handleCreate}
          disabled={!canCreate}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Creating Order...
            </>
          ) : (
            <>
              <Wallet className="h-5 w-5 mr-2 shrink-0" />
              <span className="truncate">Create Deposit Order — {formatCurrency(initialPaymentAmount)}</span>
            </>
          )}
        </Button>

        {/* Validation Messages */}
        {disabled && (
          <p className="text-center text-sm text-destructive">You don't have permission to create orders</p>
        )}

        {!disabled && !hasItems && (
          <p className="text-center text-sm text-muted-foreground">Add items to cart to create a deposit order</p>
        )}

        {hasItems && !customerName.trim() && (
          <p className="text-center text-sm text-muted-foreground">
            Customer name is required for deposit orders
          </p>
        )}

        {hasItems && customerName.trim() && !locationId && (
          <p className="text-center text-sm text-muted-foreground">Select a shop location</p>
        )}

        {hasItems && customerName.trim() && locationId && initialPaymentAmount <= 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Enter an initial deposit amount to continue
          </p>
        )}

        {initialPaymentAmount > netOrderTotal && (
          <p className="text-center text-sm text-destructive">
            Deposit cannot exceed net order value
          </p>
        )}
      </CardContent>
    </Card>
  );
}

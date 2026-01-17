import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Printer, Mail, X } from 'lucide-react';
import { formatCurrency, formatDateTime, formatPaymentMethod } from '@/lib/utils';
import { SaleWithItems } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/ui/logo';

interface PrintableReceiptProps {
  sale: SaleWithItems;
  items: Array<{
    id: number;
    product: {
      name: string;
      sku?: string;
    };
    quantity: number;
    unit_price: number;
    discount: number;
    tax_rate: number;
  }>;
  partExchanges?: Array<{
    id: number;
    title: string;
    allowance: number;
    customer_name?: string;
  }>;
  customerName?: string;
  onClose: () => void;
  onPrint?: () => void;
}

export function PrintableReceipt({
  sale,
  items,
  partExchanges = [],
  customerName,
  onClose,
  onPrint
}: PrintableReceiptProps) {
  const { toast } = useToast();
  const pxTotal = partExchanges.reduce((sum, px) => sum + px.allowance, 0);

  const handlePrint = () => {
    window.print();
    onPrint?.();
  };

  const handleEmailReceipt = () => {
    // Create email with receipt details
    const subject = `Receipt for Sale #${sale.id}`;
    const body = `Thank you for your purchase!

Sale Details:
- Sale ID: #${sale.id}
- Date: ${new Date(sale.sold_at).toLocaleDateString()}
- Total: £${Number(sale.total).toFixed(2)}

Items:
${items.map(item => `- ${item.product?.name} x${item.quantity} @ £${Number(item.unit_price).toFixed(2)}`).join('\n')}

Payment Method: ${getPaymentMethodDisplay(sale.payment)}
${sale.notes ? `\nNotes: ${sale.notes}` : ''}

Thank you for your business!`;
    
    const mailtoLink = `mailto:${customerName ? `${encodeURIComponent(customerName)}` : ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    toast({
      title: "Email Receipt",
      description: "Opening default email client with receipt details",
      variant: "default"
    });
  };

  const getPaymentMethodDisplay = (method: string) => {
    return formatPaymentMethod(method);
  };

  return (
    <>
      {/* Screen version */}
      <Card className="w-full max-w-md mx-auto p-6 print:hidden">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <Logo variant="text" size="md" />
            </div>
            <p className="text-xs text-muted-foreground">
              123 High Street, London SW1A 1AA<br />
              Tel: 020 7123 4567
            </p>
          </div>

          <Separator />

          {/* Sale Info */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span className="font-mono">{sale.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDateTime(sale.sold_at)}</span>
            </div>
            {customerName && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{customerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Payment:</span>
              <span>{getPaymentMethodDisplay(sale.payment)}</span>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            <h3 className="font-medium">Items</h3>
            {items.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between">
                  <span className="flex-1">{item.product.name}</span>
                  <span className="w-16 text-right">{formatCurrency(item.unit_price)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground ml-2">
                  <span>Qty: {item.quantity}</span>
                  <span>{formatCurrency(item.quantity * item.unit_price)}</span>
                </div>
                {item.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600 ml-2">
                    <span>Discount:</span>
                    <span>-{formatCurrency(item.discount)}</span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Part Exchanges */}
            {partExchanges.map((px) => (
              <div key={`px-${px.id}`} className="space-y-1 border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <span className="font-medium">Part Exchange — {px.title}</span>
                    <div className="text-xs text-muted-foreground">Customer: {px.customer_name || '—'}</div>
                  </div>
                  <span className="w-16 text-right text-destructive">-{formatCurrency(px.allowance)}</span>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {pxTotal > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Part Exchange:</span>
                <span>-{formatCurrency(pxTotal)}</span>
              </div>
            )}
            {sale.discount_total > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount_total)}</span>
              </div>
            )}
            {sale.tax_total > 0 && (
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(sale.tax_total)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Net Total:</span>
              <span>{formatCurrency(sale.total - pxTotal)}</span>
            </div>
          </div>

          {sale.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium">Notes:</p>
                <p className="text-sm text-muted-foreground">{sale.notes}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="text-center text-xs text-muted-foreground">
            <p>Thank you for your business!</p>
            <p>Please retain this receipt for your records</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleEmailReceipt} variant="outline" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm" className="px-3">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Print version */}
      <div className="hidden print:block print:max-w-none print:p-0">
        <div className="print-receipt">
          {/* Print header */}
          <div className="text-center mb-4">
            <div className="flex justify-center mb-2">
              <Logo variant="full" size="sm" />
            </div>
            <h1 className="font-bold text-lg font-luxury">Sourced Jewellers</h1>
            <p className="text-sm">Premium Jewelry & Timepieces</p>
            <p className="text-xs">
              123 High Street, London SW1A 1AA<br />
              Tel: 020 7123 4567
            </p>
          </div>

          <hr className="my-2" />

          {/* Print sale info */}
          <div className="mb-4 text-sm">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span>{sale.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDateTime(sale.sold_at)}</span>
            </div>
            {customerName && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{customerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Payment:</span>
              <span>{getPaymentMethodDisplay(sale.payment)}</span>
            </div>
          </div>

          <hr className="my-2" />

          {/* Print items */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">Items</h3>
            {items.map((item) => (
              <div key={item.id} className="mb-2">
                <div className="flex justify-between">
                  <span>{item.product.name}</span>
                  <span>{formatCurrency(item.unit_price)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 ml-2">
                  <span>Qty: {item.quantity}</span>
                  <span>{formatCurrency(item.quantity * item.unit_price)}</span>
                </div>
                {item.discount > 0 && (
                  <div className="flex justify-between text-xs ml-2">
                    <span>Discount:</span>
                    <span>-{formatCurrency(item.discount)}</span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Print Part Exchanges */}
            {partExchanges.map((px) => (
              <div key={`px-${px.id}`} className="mb-2 border-t pt-2">
                <div className="flex justify-between">
                  <span>Part Exchange — {px.title}</span>
                  <span className="text-red-600">-{formatCurrency(px.allowance)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 ml-2">
                  <span>Customer: {px.customer_name || '—'}</span>
                </div>
              </div>
            ))}
          </div>

          <hr className="my-2" />

          {/* Print totals */}
          <div className="mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {pxTotal > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Part Exchange:</span>
                <span>-{formatCurrency(pxTotal)}</span>
              </div>
            )}
            {sale.discount_total > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount_total)}</span>
              </div>
            )}
            {sale.tax_total > 0 && (
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(sale.tax_total)}</span>
              </div>
            )}
            <hr className="my-1" />
            <div className="flex justify-between font-bold">
              <span>Net Total:</span>
              <span>{formatCurrency(sale.total - pxTotal)}</span>
            </div>
          </div>

          {sale.notes && (
            <div className="mb-4">
              <p className="font-medium">Notes:</p>
              <p className="text-sm">{sale.notes}</p>
            </div>
          )}

          <hr className="my-2" />

          <div className="text-center text-xs">
            <p>Thank you for your business!</p>
            <p>Please retain this receipt for your records</p>
          </div>
        </div>
      </div>
    </>
  );
}
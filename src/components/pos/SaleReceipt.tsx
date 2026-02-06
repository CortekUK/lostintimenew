import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDateTime, formatPaymentMethod } from '@/lib/utils';
import type { Sale, SaleItem, Product, PaymentMethod } from '@/types';
import { 
  Receipt,
  Printer,
  Download,
  Check
} from 'lucide-react';

interface SaleReceiptProps {
  sale: Sale;
  items: Array<SaleItem & { product: Product }>;
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

export function SaleReceipt({ sale, items, partExchanges = [], customerName, onClose, onPrint }: SaleReceiptProps) {
  const pxTotal = partExchanges.reduce((sum, px) => sum + px.allowance, 0);
  const getPaymentMethodDisplay = (method: PaymentMethod) => {
    return formatPaymentMethod(method);
  };

  return (
    <Card className="shadow-elegant max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-2">
          <Check className="h-6 w-6 text-success" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Sale Completed
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {formatDateTime(sale.sold_at)}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Business Header */}
        <div className="text-center">
          <h2 className="font-bold text-lg">Lost in Time</h2>
          <p className="text-sm text-muted-foreground">
            Premium Jewellery
          </p>
        </div>
        
        <Separator />
        
        {/* Sale Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Sale ID:</span>
            <span className="font-mono">#{sale.id.toString().padStart(6, '0')}</span>
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
        <div className="space-y-3">
          <h4 className="font-medium">Items</h4>
          {items.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.unit_price)}
                    {item.tax_rate > 0 && (
                      <span className="ml-1">({item.tax_rate}% tax)</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </p>
                  {item.discount > 0 && (
                    <p className="text-xs text-success">
                      -{formatCurrency(item.discount)} discount
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Part Exchanges */}
          {partExchanges.map((px) => (
            <div key={`px-${px.id}`} className="space-y-1 border-t pt-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-sm">Part Exchange — {px.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Customer: {px.customer_name || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm text-destructive">
                    -{formatCurrency(px.allowance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <Separator />
        
        {/* Totals */}
        <div className="space-y-2 text-sm">
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
            <div className="flex justify-between text-success">
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
        </div>
        
        <Separator />
        
        <div className="flex justify-between font-bold text-lg">
          <span>Net Total:</span>
          <span className="text-primary">{formatCurrency(sale.total - pxTotal)}</span>
        </div>
        
        {sale.notes && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-sm mb-1">Notes:</h4>
              <p className="text-sm text-muted-foreground">{sale.notes}</p>
            </div>
          </>
        )}
        
        <Separator />
        
        <div className="text-center text-xs text-muted-foreground">
          <p>Thank you for your business!</p>
          <p>Visit us again soon</p>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" onClick={onPrint} disabled={!onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={onClose}>
            <Download className="h-4 w-4 mr-2" />
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDateTime, formatPaymentMethod } from '@/lib/utils';
import { CheckCircle2, Printer, Mail, Download, ShoppingCart, ExternalLink, Eye, Loader2 } from 'lucide-react';
import type { Sale, SaleItem, Product, PartExchangeItem } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { SaleDetailModal } from '@/components/transactions/SaleDetailModal';
import { EmailReceiptDialog } from '@/components/pos/EmailReceiptDialog';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';

interface SaleConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  items: Array<{ product: Product; quantity: number; unit_price: number }>;
  partExchanges: PartExchangeItem[];
  signature?: string | null;
  onPrint: () => void;
  onEmailReceipt?: () => void;
  onDownloadPDF?: () => void;
}

export function SaleConfirmationModal({
  isOpen,
  onClose,
  sale,
  items,
  partExchanges,
  signature,
  onPrint,
  onEmailReceipt,
  onDownloadPDF
}: SaleConfirmationModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const partExchangeTotal = partExchanges.reduce((sum, px) => sum + px.allowance, 0);
  const netTotal = sale.total - partExchangeTotal;
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Get customer info from sale
  const customerEmail = (sale as any).customer_email;
  const customerName = (sale as any).customer_name;

  const handleNewSale = () => {
    onClose();
  };

  const handleViewReceipt = () => {
    navigate(`/pos/receipt/${sale.id}`);
  };

  const handlePrint = async () => {
    // Print using hidden iframe - stays within SPA
    toast({
      title: "Opening print dialog...",
      description: "Preparing your receipt",
    });
    
    // Navigate to receipt preview which has full print capability
    navigate(`/pos/receipt/${sale.id}`);
  };

  const sendReceiptEmail = async (email: string, customMessage?: string) => {
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-receipt-email', {
        body: {
          recipientEmail: email,
          recipientName: customerName,
          saleId: sale.id,
          saleDate: sale.sold_at,
          items: items.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: 0
          })),
          partExchanges: partExchanges.map(px => ({
            title: px.product_name,
            allowance: px.allowance
          })),
          subtotal: sale.subtotal,
          discountTotal: sale.discount_total,
          taxTotal: sale.tax_total,
          total: sale.total,
          paymentMethod: formatPaymentMethod(sale.payment),
          notes: sale.notes || undefined,
          customMessage: customMessage || undefined
        }
      });

      if (error) throw error;

      toast({
        title: "Receipt sent!",
        description: `Email sent successfully to ${email}`,
      });

      // Save email to customer if new
      if (email !== customerEmail && (sale as any).customer_id) {
        await supabase
          .from('customers')
          .update({ email })
          .eq('id', (sale as any).customer_id);
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to send email",
        description: error.message || 'An error occurred',
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleEmail = () => {
    setShowEmailDialog(true);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <DialogTitle className="text-2xl font-luxury text-center">
              Sale Completed Successfully
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Transaction Summary */}
        <div className="space-y-4">
          {/* Sale Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Transaction Number</span>
              <Badge variant="outline" className="text-base font-mono">
                #{sale.id.toString().padStart(6, '0')}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date & Time</span>
              <span className="text-sm font-medium">{formatDateTime(sale.sold_at)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <Badge variant="secondary" className="capitalize">{sale.payment}</Badge>
            </div>
          </div>

          <Separator />

          {/* Items Sold */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Items Sold</h3>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between items-start text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.quantity} × {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-medium text-primary">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </p>
                </div>
              ))}

              {/* Part Exchanges */}
              {partExchanges.map((px, index) => (
                <div key={`px-${index}`} className="flex justify-between items-start text-sm border-t pt-2">
                  <div className="flex-1">
                    <p className="font-medium">Part Exchange — {px.product_name}</p>
                    <p className="text-muted-foreground text-xs">
                      Trade-in allowance
                    </p>
                  </div>
                  <p className="font-medium text-destructive">
                    -{formatCurrency(px.allowance)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount_total > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-success">-{formatCurrency(sale.discount_total)}</span>
              </div>
            )}
            {sale.tax_total > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(sale.tax_total)}</span>
              </div>
            )}
            {partExchangeTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Part Exchange:</span>
                <span className="text-destructive">-{formatCurrency(partExchangeTotal)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Net Total:</span>
              <span className="text-primary">{formatCurrency(netTotal)}</span>
              </div>
            </div>

            {/* Signature Display */}
            {signature && (
              <div className="space-y-2 p-4 bg-muted/20 rounded-lg border">
                <h4 className="text-sm font-medium">Customer Signature</h4>
                <div className="border-2 border-muted rounded-lg overflow-hidden bg-background">
                  <img src={signature} alt="Customer signature" className="w-full h-32 object-contain" />
                </div>
              </div>
            )}

            {/* Trade-In Notice */}
          {partExchanges.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground flex-1">
                  ✅ <strong>{partExchanges.length}</strong> trade-in(s) added to intake queue. 
                  Convert to inventory from the <strong>Intake Queue</strong>.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    onClose();
                    navigate('/products/intake');
                  }}
                  className="text-blue-600 dark:text-blue-400 h-auto p-0 whitespace-nowrap"
                >
                  Go to Queue →
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDetailModal(true)}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="w-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Button
              variant="outline"
              onClick={handleViewReceipt}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Receipt
            </Button>
            <Button
              variant="outline"
              onClick={handleEmail}
              className="w-full"
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Email Receipt
                </>
              )}
            </Button>
          </div>

          {/* New Sale Button */}
          <Button
            onClick={handleNewSale}
            className="w-full bg-gradient-primary hover:scale-[1.02] transition-all duration-300"
            size="lg"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Start New Sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Sale Detail Modal */}
    <SaleDetailModal
      saleId={sale.id}
      open={showDetailModal}
      onClose={() => setShowDetailModal(false)}
    />

    {/* Email Receipt Dialog */}
    <EmailReceiptDialog
      open={showEmailDialog}
      onOpenChange={setShowEmailDialog}
      onSubmit={sendReceiptEmail}
      customerName={customerName}
      defaultEmail={customerEmail || ''}
    />
    </>
  );
}

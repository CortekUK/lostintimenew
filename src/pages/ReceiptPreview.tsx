import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReceiptDocument } from '@/components/receipt/ReceiptDocument';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { Helmet } from 'react-helmet';
import { formatCurrency, formatDateTime, formatPaymentMethod } from '@/lib/utils';
import { Printer, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { printHtml } from '@/utils/printUtils';
import { buildReceiptHtml } from '@/utils/receiptHtmlBuilder';
import { EmailReceiptDialog } from '@/components/pos/EmailReceiptDialog';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useTheme } from 'next-themes';

export default function ReceiptPreview() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, isLoading: settingsLoading } = useSettings();
  const { theme } = useTheme();
  const [isPrinting, setIsPrinting] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Fetch sale data with related information
  const { data, isLoading, error } = useQuery({
    queryKey: ['receipt-preview', saleId],
    queryFn: async () => {
      if (!saleId) throw new Error('Sale ID is required');

      const saleIdNum = parseInt(saleId);
      if (isNaN(saleIdNum)) throw new Error('Invalid sale ID');

      // Fetch sale with staff info
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          profiles!sales_staff_id_fkey(full_name)
        `)
        .eq('id', saleIdNum)
        .single();

      if (saleError) throw saleError;

      // Fetch sale items with product details
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          products(
            name, 
            internal_sku, 
            sku, 
            is_trade_in, 
            is_consignment
          )
        `)
        .eq('sale_id', saleIdNum);

      if (itemsError) throw itemsError;

      // Fetch part exchanges for this sale with customer details
      const { data: partExchanges, error: pxError } = await supabase
        .from('part_exchanges')
        .select(`
          id,
          title,
          allowance,
          customer_name,
          customer_supplier_id,
          suppliers(name)
        `)
        .eq('sale_id', saleIdNum);

      if (pxError) throw pxError;

      // Calculate part exchange total
      const pxTotal = partExchanges?.reduce((sum, px) => sum + (px.allowance || 0), 0) || 0;

      return {
        sale,
        saleItems,
        partExchanges: partExchanges || [],
        pxTotal,
        staff: sale.profiles
      };
    },
    enabled: !!saleId
  });

  const handlePrint = async () => {
    if (!data || !settings) return;
    
    setIsPrinting(true);
    try {
      const isDarkMode = theme === 'dark';
      const html = buildReceiptHtml(data, settings, isDarkMode);
      await printHtml(html);
      toast({
        title: "Print dialog opened",
        description: "Your receipt is ready to print",
      });
    } catch (error) {
      toast({
        title: "Print failed",
        description: "Unable to open print dialog. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const sendReceiptEmail = async (email: string, customMessage?: string) => {
    if (!data) return;

    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-receipt-email', {
        body: {
          recipientEmail: email,
          recipientName: data.sale.customer_name,
          saleId: data.sale.id,
          saleDate: data.sale.sold_at,
          items: data.saleItems.map(item => ({
            name: item.products?.name || 'Unknown',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0
          })),
          partExchanges: data.partExchanges.map(px => ({
            title: px.title,
            allowance: px.allowance
          })),
          subtotal: data.sale.subtotal,
          discountTotal: data.sale.discount_total,
          taxTotal: data.sale.tax_total,
          total: data.sale.total,
          paymentMethod: formatPaymentMethod(data.sale.payment),
          notes: data.sale.notes || undefined,
          customMessage: customMessage || undefined
        }
      });

      if (error) throw error;

      toast({
        title: "Receipt sent!",
        description: `Email sent successfully to ${email}`,
      });

      // Save email to customer if new
      if (email !== data.sale.customer_email && data.sale.customer_id) {
        await supabase
          .from('customers')
          .update({ email })
          .eq('id', data.sale.customer_id);
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

  if (!saleId) {
    navigate('/sales');
    return null;
  }

  const storeName = 'Lost in Time';
  const receiptTitle = data ? `Receipt #${data.sale.id} - ${storeName}` : 'Receipt Preview';
  const receiptDescription = data 
    ? `Sales receipt for transaction #${data.sale.id} dated ${formatDateTime(data.sale.sold_at)}. Total: ${formatCurrency(data.sale.total - data.pxTotal)}.`
    : 'Sales receipt preview';

  return (
    <AppLayout>
      <Helmet>
        <title>{receiptTitle}</title>
        <meta name="description" content={receiptDescription} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container max-w-4xl mx-auto py-6 space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={isPrinting || isLoading || !data}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              {isPrinting ? 'Printing...' : 'Print Receipt'}
            </Button>
            <Button
              variant="outline"
              onClick={handleEmail}
              disabled={isLoading || !data || isSendingEmail}
              className="gap-2"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Email Receipt
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Receipt content */}
        {isLoading || settingsLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading receipt...</p>
            </div>
          </div>
        ) : error || !data ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-destructive mb-2">Receipt Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The requested receipt could not be found.
              </p>
              <Button onClick={() => navigate('/sales')}>
                Return to Sales
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-lg">
            <ReceiptDocument data={data} settings={settings} />
          </div>
        )}
      </div>

      {/* Email Receipt Dialog */}
      <EmailReceiptDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onSubmit={sendReceiptEmail}
        customerName={data?.sale.customer_name}
        defaultEmail={data?.sale.customer_email || ''}
      />
    </AppLayout>
  );
}

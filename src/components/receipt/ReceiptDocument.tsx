import { useState } from 'react';
import { useTheme } from 'next-themes';
import { formatCurrency, formatPaymentMethod } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { exportReceiptCSV } from '@/utils/receiptExport';
import { supabase } from '@/integrations/supabase/client';
import { EmailReceiptDialog } from '@/components/pos/EmailReceiptDialog';
import { Download, Loader2 } from 'lucide-react';
import '@/styles/receipt.css';

interface ReceiptProps {
  data: {
    sale: any;
    saleItems: any[];
    partExchanges?: any[];
    pxTotal?: number;
    staff: any;
  };
  settings: any;
}

export function ReceiptDocument({ data, settings }: ReceiptProps) {
  const { theme } = useTheme();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const { sale, saleItems, partExchanges = [], pxTotal = 0, staff } = data;

  // Get customer email if available
  const customerEmail = sale.customer_email;
  const customerName = sale.customer_name;
  
  // Get store and branding info from settings
  const store = settings?.store || {
    name: "Lost in Time",
    tagline: "Premium Jewellery",
    address: "123 High Street, London SW1A 1AA",
    phone: "020 7123 4567",
    email: "info@lostintime.com"
  };
  
  const branding = settings?.branding || {
    logo: "/lost-in-time-logo.png",
    primary_gold: "#D4AF37"
  };

  // Use the new logo
  const logo = branding.logo || "/lost-in-time-logo.png";
  
  const handlePrint = () => {
    window.print();
  };

  const sendReceiptEmail = async (email: string, customMessage?: string) => {
    setIsSendingEmail(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('send-receipt-email', {
        body: {
          recipientEmail: email,
          recipientName: customerName,
          saleId: sale.id,
          saleDate: sale.sold_at,
          items: saleItems.map(item => ({
            name: item.products?.name || 'Unknown',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0
          })),
          partExchanges: partExchanges.map(px => ({
            title: px.title,
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

      // If this was a new email for a customer, save it
      if (email !== customerEmail && sale.customer_id) {
        await supabase
          .from('customers')
          .update({ email })
          .eq('id', sale.customer_id);
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
    // Always show the dialog so user can add a message
    setShowEmailDialog(true);
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  };

  const capitalizePayment = (payment: string) => {
    return formatPaymentMethod(payment);
  };

  const handleExportCSV = () => {
    // Transform saleItems to match expected format
    const items = saleItems.map(item => ({
      product: {
        name: item.products?.name || 'Unknown',
        internal_sku: item.products?.internal_sku,
        sku: item.products?.sku
      },
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    // Transform partExchanges to match expected format
    const formattedPartExchanges = partExchanges.map(px => ({
      product_name: px.title,
      allowance: px.allowance,
      customer_name: px.customer_name || px.suppliers?.name
    }));

    exportReceiptCSV({ 
      sale, 
      items, 
      partExchanges: formattedPartExchanges, 
      staff 
    }, store.name);
    
    toast({
      title: "Receipt exported",
      description: "CSV file downloaded successfully",
    });
  };

  return (
    <main className="receipt">
      <header className="rcpt-header">
        <img src={logo} alt={store.name} className="rcpt-logo" />
        <div className="rcpt-meta">
          {store.address} • {store.phone} • {store.email}
        </div>
      </header>

      <section className="rcpt-info">
        <div>Date: <strong>{formatDateTime(sale.sold_at)}</strong></div>
        <div>Customer: <strong>{sale.customer_name || 'Walk-in'}</strong></div>
        <div>Staff: <strong>{staff?.full_name || '—'}</strong></div>
        <div>Payment: <strong>{capitalizePayment(sale.payment)}</strong></div>
      </section>

      <table className="rcpt-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>SKU/Serial</th>
            <th className="right">Qty</th>
            <th className="right">Unit</th>
            <th className="right">Discount</th>
            <th className="right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {saleItems.map((item) => {
            const lineTotal = (item.unit_price * item.quantity) - (item.discount || 0);
            return (
              <tr key={item.id}>
                <td>
                  <div className="flex items-center gap-2">
                    {item.products?.name}
                    {item.products?.is_trade_in && (
                      <span className="pill">PX</span>
                    )}
                    {item.products?.is_consignment && (
                      <span className="pill">Consignment</span>
                    )}
                  </div>
                </td>
                <td>
                  {item.products?.internal_sku || '—'}
                  {/* Placeholder for serials - can be enhanced later */}
                </td>
                <td className="right">{item.quantity}</td>
                <td className="right">{formatCurrency(item.unit_price)}</td>
                <td className="right">
                  {item.discount ? `-${formatCurrency(item.discount)}` : '—'}
                </td>
                <td className="right">{formatCurrency(lineTotal)}</td>
              </tr>
            );
          })}
          {partExchanges.map((px) => (
            <tr key={`px-${px.id}`}>
              <td>
                <div className="flex items-center gap-2">
                  <span>Part Exchange — {px.title}</span>
                  <span className="pill">PX</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Customer: {px.customer_name || px.suppliers?.name || '—'}
                </div>
              </td>
              <td>—</td>
              <td className="right">—</td>
              <td className="right">—</td>
              <td className="right">—</td>
              <td className="right text-destructive">-{formatCurrency(px.allowance)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="rcpt-totals">
        <div>
          <span>Subtotal</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.discount_total > 0 && (
          <div>
            <span>Discount</span>
            <span>-{formatCurrency(sale.discount_total)}</span>
          </div>
        )}
        {sale.tax_total > 0 && (
          <div>
            <span>Tax</span>
            <span>{formatCurrency(sale.tax_total)}</span>
          </div>
        )}
        <div className="net">
          <span>Net Total</span>
          <span>{formatCurrency(sale.total - pxTotal)}</span>
        </div>
      </section>

      {sale.notes && (
        <section className="rcpt-notes">
          <em>{sale.notes}</em>
        </section>
      )}

      <footer className="rcpt-footer">
        <div>Thank you for your business.</div>
        <div className="fine">
          All items are guaranteed authentic. Returns within 14 days with receipt.
        </div>
      </footer>

      <div className="rcpt-actions no-print">
        <button onClick={handlePrint} className="btn-primary">
          Print
        </button>
        {(userRole === 'owner' || userRole === 'staff') && (
          <>
            <button
              className="btn-secondary"
              onClick={handleEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="inline-block w-4 h-4 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                'Email'
              )}
            </button>
            <button className="btn-secondary" onClick={handleExportCSV}>
              <Download className="inline-block w-4 h-4 mr-1" />
              Export CSV
            </button>
          </>
        )}
        <a className="btn-secondary" href={`/sales/${sale.id}`}>
          View Sale
        </a>
      </div>

      {/* Email Receipt Dialog */}
      <EmailReceiptDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onSubmit={sendReceiptEmail}
        customerName={customerName}
        defaultEmail={customerEmail || ''}
      />
    </main>
  );
}
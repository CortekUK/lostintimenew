import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReceiptDocument } from '@/components/receipt/ReceiptDocument';
import { useSettings } from '@/contexts/SettingsContext';
import { Helmet } from 'react-helmet';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function Receipt() {
  const { id } = useParams<{ id: string }>();
  const { settings, isLoading: settingsLoading } = useSettings();

  // Fetch sale data with related information
  const { data, isLoading, error } = useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      if (!id) throw new Error('Sale ID is required');

      const saleId = parseInt(id);
      if (isNaN(saleId)) throw new Error('Invalid sale ID');

      // Fetch sale with staff info
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          profiles!sales_staff_id_fkey(full_name)
        `)
        .eq('id', saleId)
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
        .eq('sale_id', saleId);

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
        .eq('sale_id', saleId);

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
    enabled: !!id
  });

  if (!id) {
    return <Navigate to="/sales" replace />;
  }

  if (isLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Receipt Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The requested receipt could not be found.
          </p>
          <a href="/sales" className="btn-primary">
            Return to Sales
          </a>
        </div>
      </div>
    );
  }

  const storeName = 'Sourced Clothing';
  const receiptTitle = `Receipt #${data.sale.id} - ${storeName}`;
  const receiptDescription = `Sales receipt for transaction #${data.sale.id} dated ${formatDateTime(data.sale.sold_at)}. Total: ${formatCurrency(data.sale.total - data.pxTotal)}.`;

  return (
    <>
      <Helmet>
        <title>{receiptTitle}</title>
        <meta name="description" content={receiptDescription} />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content={receiptTitle} />
        <meta property="og:description" content={receiptDescription} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`${window.location.origin}/receipt/${id}`} />
      </Helmet>
      
      <ReceiptDocument 
        data={data} 
        settings={settings}
      />
    </>
  );
}
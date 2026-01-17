import { useParams, useNavigate } from 'react-router-dom';
import { formatPaymentMethod } from '@/lib/utils';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSales } from '@/hooks/useDatabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { ReceiptDocument } from '@/components/receipt/ReceiptDocument';
import { buildReceiptHtml } from '@/utils/receiptHtmlBuilder';
import { printHtml } from '@/utils/printUtils';
import { EmailService } from '@/components/integrations/EmailService';
import { 
  ArrowLeft,
  Receipt, 
  Printer,
  Mail,
  PoundSterling,
  Calendar,
  User,
  CreditCard,
  Package,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import type { SaleDetailData } from '@/types';

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const { theme } = useTheme();
  const { data: salesData = [], isLoading } = useSales();
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  const sale = Array.isArray(salesData) ? salesData.find((s: any) => s.id.toString() === id) : undefined;

  // Fetch receipt data for modal
  const { data: receiptData, isLoading: isLoadingReceipt } = useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      if (!id) return null;

      const saleId = parseInt(id);
      
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          profiles!sales_staff_id_fkey (full_name, email)
        `)
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          products (*)
        `)
        .eq('sale_id', saleId);

      if (itemsError) throw itemsError;

      const { data: partExchangesData } = await supabase
        .from('part_exchanges')
        .select('*')
        .eq('sale_id', saleId);

      return {
        sale: saleData,
        items: itemsData || [],
        partExchanges: partExchangesData || []
      };
    },
    enabled: !!id && showReceiptModal
  });

  const handleViewReceipt = () => {
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = async () => {
    if (!sale || !receiptData) {
      toast({
        title: "Cannot print",
        description: "Receipt data is not available",
        variant: "destructive"
      });
      return;
    }

    try {
      const pxTotal = receiptData.partExchanges?.reduce((sum, px) => sum + Number(px.allowance || 0), 0) || 0;
      
      const html = buildReceiptHtml(
        {
          sale: receiptData.sale,
          saleItems: receiptData.items,
          partExchanges: receiptData.partExchanges || [],
          pxTotal: pxTotal,
          staff: receiptData.sale.profiles
        },
        settings,
        theme === 'dark'
      );
      
      await printHtml(html);
      
      toast({
        title: "Printing receipt",
        description: "Print dialog opened"
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print failed",
        description: "Failed to print receipt. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEmailReceipt = () => {
    if (!receiptData) return;
    
    EmailService.sendReceipt({
      saleId: id || '',
      customerName: receiptData.sale.customer_name || receiptData.sale.customer_email,
      items: receiptData.items.map((item: any) => ({
        product: { name: item.products?.name || 'Unknown' },
        quantity: item.quantity,
        unit_price: item.unit_price
      })),
      total: receiptData.sale.total,
      soldAt: receiptData.sale.sold_at,
      paymentMethod: receiptData.sale.payment,
      notes: receiptData.sale.notes
    });
  };


  if (isLoading) {
    return (
      <AppLayout title="Sale Detail" showSearch>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sale details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!sale) {
    return (
      <AppLayout title="Sale Detail" showSearch>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sale Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The sale you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/sales')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sales
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalProfit = sale.items?.reduce((sum, item) => {
    const lineRevenue = item.quantity * item.unit_price - (item.discount || 0);
    const lineCost = item.quantity * item.unit_cost;
    return sum + (lineRevenue - lineCost);
  }, 0) || 0;

  return (
    <AppLayout title={`Sale #${sale.id}`} showSearch>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/sales')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleViewReceipt}>
              <PoundSterling className="h-4 w-4 mr-2" />
              View Receipt
            </Button>
            <Button variant="outline" onClick={handlePrintReceipt}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleEmailReceipt}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
        </div>

        {/* Sale Header Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{Number(sale.total).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Subtotal: £{Number(sale.subtotal).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sale Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {format(new Date(sale.sold_at), 'MMM dd, yyyy')}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(sale.sold_at), 'HH:mm:ss')}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Member</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {sale.staff?.full_name || 'Unknown'}
              </div>
              <p className="text-xs text-muted-foreground">
                Staff ID: {sale.staff_id}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Method</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={sale.payment === 'cash' ? 'secondary' : 'default'} className="text-lg">
                {formatPaymentMethod(sale.payment)}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Sale Notes */}
        {sale.notes && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{sale.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Line Items */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Line Items ({sale.items?.length || 0} items)
            </CardTitle>
            <CardDescription>
              Products sold in this transaction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sale.items?.map((item, index) => {
                const lineTotal = item.quantity * item.unit_price - (item.discount || 0);
                const lineCost = item.quantity * item.unit_cost;
                const lineProfit = lineTotal - lineCost;
                
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.product?.name || 'Unknown Product'}</h4>
                        {item.product?.sku && (
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.product.sku}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>
                        <div className="font-medium">{item.quantity}</div>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Unit Price:</span>
                        <div className="font-mono">£{item.unit_price.toFixed(2)}</div>
                      </div>
                      
                      {item.discount > 0 && (
                        <div>
                          <span className="text-muted-foreground">Discount:</span>
                          <div className="font-mono text-success">-£{item.discount.toFixed(2)}</div>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-muted-foreground">Line Total:</span>
                        <div className="font-mono font-bold">£{lineTotal.toFixed(2)}</div>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Gross Profit:</span>
                        <div className={`font-mono font-bold ${lineProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          £{lineProfit.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Product metadata */}
                    {(item.product?.internal_sku || item.product?.category) && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {item.product?.internal_sku && <span>INT: {item.product.internal_sku}</span>}
                          {item.product?.category && <span>{item.product.category}</span>}
                          {item.product?.metal && <span>{item.product.metal}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <Separator className="my-6" />
            
            {/* Totals Summary */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Subtotal:</span>
                  <div className="font-mono font-bold">£{Number(sale.subtotal).toFixed(2)}</div>
                </div>
                
                {Number(sale.discount_total) > 0 && (
                  <div>
                    <span className="text-muted-foreground">Total Discount:</span>
                    <div className="font-mono font-bold text-success">-£{Number(sale.discount_total).toFixed(2)}</div>
                  </div>
                )}
                
                <div>
                  <span className="text-muted-foreground">Total Tax:</span>
                  <div className="font-mono font-bold">£{Number(sale.tax_total).toFixed(2)}</div>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Final Total:</span>
                  <div className="font-mono font-bold text-xl">£{Number(sale.total).toFixed(2)}</div>
                </div>
              </div>
              
              {userRole === 'owner' && (
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Total Gross Profit:</span>
                    <span className={`font-mono font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      £{totalProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt - Sale #{id}</DialogTitle>
          </DialogHeader>
          {isLoadingReceipt ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : receiptData ? (
            <>
              <ReceiptDocument 
                data={{
                  sale: receiptData.sale,
                  saleItems: receiptData.items,
                  partExchanges: receiptData.partExchanges || [],
                  pxTotal: receiptData.partExchanges?.reduce((sum, px) => sum + Number(px.allowance || 0), 0) || 0,
                  staff: receiptData.sale.profiles
                }}
                settings={settings}
              />
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={handlePrintReceipt}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button onClick={() => setShowReceiptModal(false)}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Failed to load receipt data</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
import { Card, CardContent } from '@/components/ui/card';
import { Package, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SupplierKPICardsProps {
  supplierId: number;
  supplierType: 'registered' | 'customer';
  productCount: number;
  inventorySpend?: number;
  expenseSpend?: number;
  totalSpend?: number;
  createdAt?: string;
  onProductsClick?: () => void;
}

export function SupplierKPICards({
  supplierId,
  supplierType,
  productCount,
  inventorySpend = 0,
  expenseSpend = 0,
  totalSpend = 0,
  createdAt,
  onProductsClick,
}: SupplierKPICardsProps) {
  // Fetch active consignments for customer suppliers
  const { data: activeConsignments } = useQuery({
    queryKey: ['supplier-active-consignments', supplierId],
    queryFn: async () => {
      if (supplierType !== 'customer') return null;

      const { data, error } = await supabase
        .from('consignment_settlements')
        .select('id, payout_amount, product_id')
        .eq('supplier_id', supplierId)
        .is('paid_at', null);

      if (error) throw error;

      return {
        count: data?.length || 0,
        totalValue: data?.reduce((sum, item) => sum + (Number(item.payout_amount) || 0), 0) || 0,
      };
    },
    enabled: supplierType === 'customer',
  });

  // Fetch unsold products count for registered suppliers
  const { data: unsoldProducts } = useQuery({
    queryKey: ['supplier-unsold-products', supplierId],
    queryFn: async () => {
      if (supplierType === 'customer') return null;

      // Get products from this supplier that are still in stock
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('supplier_id', supplierId);

      if (productsError) throw productsError;
      if (!products?.length) return { count: 0, value: 0 };

      const productIds = products.map(p => p.id);

      // Get stock on hand for these products
      const { data: stockData, error: stockError } = await supabase
        .from('v_stock_on_hand')
        .select('product_id, qty_on_hand')
        .in('product_id', productIds)
        .gt('qty_on_hand', 0);

      if (stockError) throw stockError;

      // Get inventory values
      const { data: inventoryData } = await supabase
        .from('v_inventory_value')
        .select('product_id, inventory_value')
        .in('product_id', stockData?.map(s => s.product_id) || []);

      const totalValue = inventoryData?.reduce((sum, item) => sum + Number(item.inventory_value || 0), 0) || 0;

      return {
        count: stockData?.length || 0,
        value: totalValue,
      };
    },
    enabled: supplierType !== 'customer',
  });

  const totalPayouts = inventorySpend + expenseSpend;

  const cardClasses = "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)] transition-all duration-300";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Linked Products */}
      <Card 
        className={`cursor-pointer ${cardClasses}`}
        onClick={onProductsClick}
      >
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Linked Products</p>
              <p className="text-3xl font-luxury font-bold mt-1">{productCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Click to view inventory</p>
        </CardContent>
      </Card>

      {/* Card 2: Financial */}
      <Card className={cardClasses}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {supplierType === 'customer' ? 'Total Payouts (YTD)' : 'Total Spend (YTD)'}
              </p>
              <p className="text-3xl font-luxury font-bold mt-1 text-[hsl(var(--gold))]">
                £{(supplierType === 'customer' ? totalPayouts : totalSpend).toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          {supplierType === 'customer' ? (
            <p className="text-xs text-muted-foreground mt-2">
              PX + Consignment payouts
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">
              Inventory + Expenses
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Open Items / Unsold Products */}
      <Card className={cardClasses}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {supplierType === 'customer' ? 'Active Consignments' : 'In Stock'}
              </p>
              {supplierType === 'customer' ? (
                <>
                  <p className="text-3xl font-luxury font-bold mt-1">
                    {activeConsignments?.count || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    £{(activeConsignments?.totalValue || 0).toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} value
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-luxury font-bold mt-1">
                    {unsoldProducts?.count || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    £{(unsoldProducts?.value || 0).toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} value
                  </p>
                </>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Supplier Since */}
      <Card className={cardClasses}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {supplierType === 'customer' ? 'Customer Since' : 'Supplier Since'}
              </p>
              <p className="text-3xl font-luxury font-bold mt-1">
                {createdAt ? format(new Date(createdAt), 'MMM yyyy') : '—'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          {createdAt && (
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(createdAt), 'dd MMMM yyyy')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

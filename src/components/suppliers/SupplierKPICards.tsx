import { Card, CardContent } from '@/components/ui/card';
import { Package, TrendingUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SupplierKPICardsProps {
  supplierId: number;
  supplierType: 'registered' | 'customer';
  productCount: number;
  inventorySpend?: number;
  expenseSpend?: number;
  totalSpend?: number;
  onProductsClick?: () => void;
}

export function SupplierKPICards({
  supplierId,
  supplierType,
  productCount,
  inventorySpend = 0,
  expenseSpend = 0,
  totalSpend = 0,
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

  const totalPayouts = inventorySpend + expenseSpend;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Linked Products */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow" 
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
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {supplierType === 'customer' ? 'Total Payouts (YTD)' : 'Total Spend (YTD)'}
              </p>
              <p className="text-3xl font-luxury font-bold mt-1 text-[#D4AF37]">
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

      {/* Card 3: Open Items */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {supplierType === 'customer' ? 'Active Consignments' : 'Open Items'}
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
                  <p className="text-3xl font-luxury font-bold mt-1">—</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Purchase orders placeholder
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
    </div>
  );
}

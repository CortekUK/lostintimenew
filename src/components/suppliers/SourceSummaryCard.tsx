import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Repeat, Package, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SourceSummaryCardProps {
  supplierId: number;
}

export function SourceSummaryCard({ supplierId }: SourceSummaryCardProps) {
  // Fetch trade-in data
  const { data: tradeInData } = useQuery({
    queryKey: ['supplier-tradein-summary', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_exchanges')
        .select('id, allowance, product_id')
        .eq('sale_id', supplierId);

      if (error) throw error;

      // Get products linked to this customer supplier
      const { data: products } = await supabase
        .from('products')
        .select('id, is_trade_in')
        .eq('supplier_id', supplierId)
        .eq('is_trade_in', true);

      return {
        count: products?.length || 0,
        totalAllowances: data?.reduce((sum, px) => sum + Number(px.allowance), 0) || 0,
      };
    },
  });

  // Fetch active consignment data
  const { data: consignmentData } = useQuery({
    queryKey: ['supplier-consignment-summary', supplierId],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, unit_cost, consignment_supplier_id')
        .eq('consignment_supplier_id', supplierId)
        .eq('is_consignment', true);

      if (error) throw error;

      // Get active consignments (not yet sold or settled)
      const { data: settlements } = await supabase
        .from('consignment_settlements')
        .select('id, product_id, payout_amount')
        .eq('supplier_id', supplierId)
        .is('paid_at', null);

      const activeCount = products?.length || 0;
      const activeValue = settlements?.reduce((sum, s) => sum + Number(s.payout_amount || 0), 0) || 0;

      return {
        activeCount,
        activeValue,
      };
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-luxury">Source Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trade-ins */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Repeat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Trade-ins</p>
              <p className="text-2xl font-luxury font-bold">
                {tradeInData?.count || 0}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Allowances</p>
            <p className="text-lg font-semibold text-[#D4AF37]">
              £{(tradeInData?.totalAllowances || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Consignments */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Consignments</p>
              <p className="text-2xl font-luxury font-bold">
                {consignmentData?.activeCount || 0}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Active Value</p>
            <p className="text-lg font-semibold text-[#D4AF37]">
              £{(consignmentData?.activeValue || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
            Individual suppliers originate stock via Part-Exchange or Consignment.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

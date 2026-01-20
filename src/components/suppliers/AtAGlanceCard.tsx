import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, Calendar, TrendingUp } from 'lucide-react';

interface AtAGlanceCardProps {
  supplierId: number;
  tags?: string[] | null;
}

export function AtAGlanceCard({ supplierId, tags }: AtAGlanceCardProps) {
  // Fetch linked products count and inventory value
  const { data: inventoryData } = useQuery({
    queryKey: ['supplier-inventory-summary', supplierId],
    queryFn: async () => {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, unit_cost, track_stock')
        .eq('supplier_id', supplierId);

      if (productsError) throw productsError;

      const linkedProducts = products?.length || 0;

      // Get inventory value from view
      const productIds = products?.map(p => p.id) || [];
      if (productIds.length === 0) {
        return { linkedProducts: 0, inventoryValue: 0 };
      }

      const { data: inventoryValues } = await supabase
        .from('v_inventory_value')
        .select('inventory_value')
        .in('product_id', productIds);

      const totalValue = inventoryValues?.reduce((sum, item) => sum + Number(item.inventory_value || 0), 0) || 0;

      return {
        linkedProducts,
        inventoryValue: totalValue,
      };
    },
  });

  // Fetch last linked product date
  const { data: lastProduct } = useQuery({
    queryKey: ['supplier-last-product', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('created_at, name')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch top margin product
  const { data: topMarginProduct } = useQuery({
    queryKey: ['supplier-top-margin', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_product_mix')
        .select('product_id, name, gross_profit, revenue')
        .order('gross_profit', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Filter by supplier (we need to join with products to get supplier_id)
      const { data: products } = await supabase
        .from('products')
        .select('id, supplier_id, name')
        .eq('supplier_id', supplierId);

      const productIds = products?.map(p => p.id) || [];
      const supplierProducts = data?.filter(item => productIds.includes(item.product_id));

      const topProduct = supplierProducts?.[0];
      return topProduct;
    },
  });

  return (
    <Card className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
      <CardHeader>
        <CardTitle className="font-luxury">At-a-glance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Linked Products */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Linked Products</p>
              <p className="text-lg font-semibold">
                {inventoryData?.linkedProducts || 0}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Stock Value</p>
            <p className="text-lg font-semibold text-[#D4AF37]">
              £{(inventoryData?.inventoryValue || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Last Linked Product */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
          <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Last Linked Product</p>
            {lastProduct ? (
              <>
                <p className="text-sm font-semibold">{lastProduct.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastProduct.created_at).toLocaleDateString()}
                </p>
              </>
            ) : (
              <p className="text-sm">No products yet</p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
          {tags && tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, idx) => (
                <Badge key={idx} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No tags</p>
          )}
        </div>

        {/* Top Margin Product Insight */}
        {topMarginProduct && topMarginProduct.gross_profit > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            <div className="h-10 w-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Top Margin Item</p>
              <p className="text-sm font-semibold truncate">{topMarginProduct.name}</p>
              <p className="text-xs text-[#D4AF37]">
                £{Number(topMarginProduct.gross_profit).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} GP
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

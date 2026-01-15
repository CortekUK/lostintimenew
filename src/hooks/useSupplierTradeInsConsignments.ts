import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TradeInItem {
  id: number;
  product_id: number;
  product_name: string;
  internal_sku: string;
  allowance: number;
  status: 'in_stock' | 'sold';
  sale_id?: number;
  sold_price?: number;
  sold_at?: string;
  gross_profit?: number;
}

export function useSupplierTradeIns(supplierId: number, startDate?: Date, endDate?: Date, statusFilter?: string) {
  return useQuery({
    queryKey: ['supplier-trade-ins', supplierId, startDate, endDate, statusFilter],
    queryFn: async () => {
      // Get all trade-in products for this customer supplier
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          internal_sku,
          unit_cost,
          is_trade_in
        `)
        .eq('supplier_id', supplierId)
        .eq('is_trade_in', true);

      const { data: products, error: productsError } = await query;
      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        return [];
      }

      const productIds = products.map(p => p.id);

      // Get part exchange info
      const { data: partExchanges, error: pxError } = await supabase
        .from('part_exchanges')
        .select('product_id, allowance, sale_id')
        .in('product_id', productIds);

      if (pxError) throw pxError;

      // Get sale items to check if sold and get sale info
      const { data: saleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          sale_id,
          unit_price,
          quantity,
          sales(sold_at)
        `)
        .in('product_id', productIds);

      if (saleItemsError) throw saleItemsError;

      // Build the result
      const result: TradeInItem[] = products.map(product => {
        const px = partExchanges?.find(p => p.product_id === product.id);
        const saleItem = saleItems?.find(si => si.product_id === product.id);
        
        const allowance = px?.allowance || product.unit_cost || 0;
        const soldPrice = saleItem ? saleItem.unit_price * saleItem.quantity : null;
        const status = saleItem ? 'sold' : 'in_stock';
        const grossProfit = soldPrice ? soldPrice - allowance : null;

        return {
          id: product.id,
          product_id: product.id,
          product_name: product.name,
          internal_sku: product.internal_sku,
          allowance: Number(allowance),
          status: status as 'in_stock' | 'sold',
          sale_id: saleItem?.sale_id,
          sold_price: soldPrice ? Number(soldPrice) : undefined,
          sold_at: saleItem?.sales?.sold_at,
          gross_profit: grossProfit ? Number(grossProfit) : undefined,
        };
      });

      // Apply filters
      let filtered = result;

      if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(item => item.status === statusFilter);
      }

      if (startDate || endDate) {
        filtered = filtered.filter(item => {
          if (!item.sold_at) return false;
          const itemDate = new Date(item.sold_at);
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
          return true;
        });
      }

      return filtered;
    },
  });
}

interface ConsignmentItem {
  id: number;
  product_id: number;
  product_name: string;
  internal_sku: string;
  consignment_terms?: string | null;
  agreed_payout: number;
  status: 'active' | 'sold' | 'settled';
  sale_id?: number;
  sold_price?: number;
  sold_at?: string;
  gross_profit?: number;
  settlement_id?: number;
  paid_at?: string;
}

// Helper function to check if consignment is expiring soon (within 30 days)
export function isConsignmentExpiringSoon(endDate: string | null): boolean {
  if (!endDate) return false;
  const end = new Date(endDate);
  const daysUntilExpiry = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
}

// Helper function to check if payment is overdue (>30 days since sale)
export function isPaymentOverdue(soldAt: string | null): boolean {
  if (!soldAt) return false;
  const soldDate = new Date(soldAt);
  const daysSinceSale = (Date.now() - soldDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceSale > 30;
}

export function useSupplierConsignments(supplierId: number, startDate?: Date, endDate?: Date, statusFilter?: string) {
  return useQuery({
    queryKey: ['supplier-consignments', supplierId, startDate, endDate, statusFilter, 'v2'],
    queryFn: async () => {
      // Get all consignment products for this customer supplier
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, internal_sku, consignment_terms')
        .eq('consignment_supplier_id', supplierId)
        .eq('is_consignment', true);

      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        return [];
      }

      const productIds = products.map(p => p.id);

      // Get consignment settlements
      const { data: settlements, error: settlementsError } = await supabase
        .from('consignment_settlements')
        .select('id, product_id, sale_id, agreed_price, sale_price, payout_amount, paid_at')
        .in('product_id', productIds);

      if (settlementsError) throw settlementsError;

      // Get sale items to check if sold
      const { data: saleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          sale_id,
          unit_price,
          quantity,
          sales(sold_at)
        `)
        .in('product_id', productIds);

      if (saleItemsError) throw saleItemsError;

      // Build the result
      const result: ConsignmentItem[] = products.map(product => {
        const settlement = settlements?.find(s => s.product_id === product.id);
        const saleItem = saleItems?.find(si => si.product_id === product.id);

        const agreedPayout = settlement?.payout_amount || settlement?.agreed_price || 0;
        const soldPrice = saleItem ? saleItem.unit_price * saleItem.quantity : null;

        let status: 'active' | 'sold' | 'settled' = 'active';
        if (settlement?.paid_at) {
          status = 'settled';
        } else if (saleItem) {
          status = 'sold';
        }

        const grossProfit = soldPrice ? soldPrice - agreedPayout : null;

        return {
          id: product.id,
          product_id: product.id,
          product_name: product.name,
          internal_sku: product.internal_sku,
          consignment_terms: product.consignment_terms,
          agreed_payout: Number(agreedPayout),
          status,
          sale_id: saleItem?.sale_id || settlement?.sale_id,
          sold_price: soldPrice ? Number(soldPrice) : undefined,
          sold_at: saleItem?.sales?.sold_at,
          gross_profit: grossProfit ? Number(grossProfit) : undefined,
          settlement_id: settlement?.id,
          paid_at: settlement?.paid_at,
        };
      });

      // Apply filters
      let filtered = result;

      if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(item => item.status === statusFilter);
      }

      if (startDate || endDate) {
        filtered = filtered.filter(item => {
          if (!item.sold_at) return item.status === 'active';
          const itemDate = new Date(item.sold_at);
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
          return true;
        });
      }

      return filtered;
    },
  });
}

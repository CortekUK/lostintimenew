import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeProductStockData } from '@/utils/stockUtils';
import type { 
  ConsignmentSettlement,
  ConsignmentSettlementInsert,
  ConsignmentSettlementUpdate,
  ConsignmentSettlementWithDetails,
  ConsignmentFilter
} from '@/types';

// Consignment products (active stock)
export const useConsignmentProducts = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['consignment-products'],
    queryFn: async () => {
      // First get the consignment products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          supplier:suppliers!supplier_id(name),
          consignment_supplier:suppliers!consignment_supplier_id(id, name, email, phone, supplier_type)
        `)
        .eq('is_consignment', true)
        .not('consignment_supplier_id', 'is', null)
        .order('name');
      
      if (productsError) throw productsError;
      
      if (!products || products.length === 0) return {
        products: [],
        totalValue: 0
      };
      
      // Get stock information separately
      const productIds = products.map(p => p.id);
      
      // Get stock data
      const { data: stockData, error: stockError } = await supabase
        .from('v_stock_on_hand')
        .select('product_id, qty_on_hand')
        .in('product_id', productIds);
      
      if (stockError) throw stockError;
      
      // Get inventory value data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('v_inventory_value')
        .select('product_id, inventory_value, avg_cost')
        .in('product_id', productIds);
      
      if (inventoryError) throw inventoryError;
      
      // Create maps for efficient lookup
      const stockMap = new Map(stockData?.map(s => [s.product_id, s.qty_on_hand]) || []);
      const inventoryMap = new Map(inventoryData?.map(inv => [inv.product_id, {
        inventory_value: inv.inventory_value || 0,
        avg_cost: inv.avg_cost || 0
      }]) || []);
      
      // Flatten stock and inventory data to product level for consistency
      const enrichedProducts = products.map(product => {
        const qty_on_hand = stockMap.get(product.id) || 0;
        const inventoryInfo = inventoryMap.get(product.id) || { inventory_value: 0, avg_cost: 0 };
        
        return normalizeProductStockData(product, { qty_on_hand }, inventoryInfo);
      });

      // Calculate total consignment value (unit_cost * qty_on_hand)
      const totalValue = enrichedProducts.reduce((sum, product) => {
        const qty = product.stock?.qty_on_hand || 0;
        const cost = Number(product.unit_cost) || 0;
        return sum + (qty * cost);
      }, 0);

      return {
        products: enrichedProducts,
        totalValue
      };
    },
    enabled: !!user && !!session
  });
};

// Consignment settlements
export const useConsignmentSettlements = (filter?: ConsignmentFilter) => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['consignment-settlements', filter, 'v2'],
    queryFn: async () => {
      let query = supabase
        .from('consignment_settlements')
        .select(`
          *,
          product:products(
            id, name, sku, internal_sku, consignment_terms, 
            unit_cost, unit_price, tax_rate, category, description,
            image_url, material, size, color, barcode,
            is_consignment, is_trade_in, is_registered,
            consignment_start_date, consignment_end_date,
            consignment_supplier_id, supplier_id, location_id,
            created_at, updated_at, purchase_date
          ),
          supplier:suppliers(id, name, email, phone, supplier_type),
          sale:sales(sold_at, payment)
        `)
        .order('created_at', { ascending: false });

      if (filter?.status === 'sold_unsettled') {
        query = query.is('paid_at', null);
      } else if (filter?.status === 'settled') {
        query = query.not('paid_at', 'is', null);
      }

      if (filter?.supplier_id) {
        query = query.eq('supplier_id', filter.supplier_id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as ConsignmentSettlementWithDetails[];
    },
    enabled: !!user && !!session
  });
};

// Create consignment settlement (triggered by sale)
export const useCreateConsignmentSettlement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settlement: ConsignmentSettlementInsert) => {
      const { data, error } = await supabase
        .from('consignment_settlements')
        .insert(settlement)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consignment-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error) => {
      console.error('Failed to create consignment settlement:', error);
    }
  });
};

// Record payout to supplier
export const useRecordPayout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      payout_amount, 
      notes 
    }: { 
      id: number; 
      payout_amount: number; 
      notes?: string; 
    }) => {
      const { data, error } = await supabase
        .from('consignment_settlements')
        .update({
          payout_amount,
          paid_at: new Date().toISOString(),
          notes
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consignment-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: "Success",
        description: "Payout recorded successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record payout",
        variant: "destructive"
      });
    }
  });
};

// Get consignment statistics for dashboard
export const useConsignmentStats = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['consignment-stats'],
    queryFn: async () => {
      // Active consignment stock count
      const { count: activeCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_consignment', true);

      // Unsettled amounts
      const { data: unsettledData } = await supabase
        .from('consignment_settlements')
        .select('payout_amount')
        .is('paid_at', null);

      const unsettled_value = unsettledData?.reduce((sum, item) => 
        sum + (Number(item.payout_amount) || 0), 0) || 0;

      // Total settled value (all-time payouts)
      const { data: settledData } = await supabase
        .from('consignment_settlements')
        .select('payout_amount')
        .not('paid_at', 'is', null);

      const total_settled_value = settledData?.reduce((sum, item) => 
        sum + (Number(item.payout_amount) || 0), 0) || 0;

      return {
        active_stock_count: activeCount || 0,
        unsettled_value,
        total_settled_value
      };
    },
    enabled: !!user && !!session
  });
};

// Helper: Check if consignment is expiring soon (within 30 days)
export const isConsignmentExpiringSoon = (endDate: string | null): boolean => {
  if (!endDate) return false;
  const now = new Date();
  const end = new Date(endDate);
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 30;
};

// Helper: Check if payment is overdue (>30 days since sale)
export const isPaymentOverdue = (soldAt: string | null): boolean => {
  if (!soldAt) return false;
  const now = new Date();
  const saleDate = new Date(soldAt);
  const diffDays = Math.ceil((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 30;
};

// Supplier consignments - get consignment items for a specific supplier
export const useSupplierConsignments = (supplierId: number) => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['supplier-consignments', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      
      // Get products consigned by this supplier
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          internal_sku,
          unit_price,
          unit_cost,
          created_at,
          consignment_start_date,
          consignment_end_date,
          consignment_terms
        `)
        .eq('is_consignment', true)
        .eq('consignment_supplier_id', supplierId);
      
      if (productsError) throw productsError;
      if (!products || products.length === 0) return [];
      
      const productIds = products.map(p => p.id);
      
      // Get stock data
      const { data: stockData } = await supabase
        .from('v_stock_on_hand')
        .select('product_id, qty_on_hand')
        .in('product_id', productIds);
      
      const stockMap = new Map(stockData?.map(s => [s.product_id, s.qty_on_hand]) || []);
      
      // Get settlement data
      const { data: settlements } = await supabase
        .from('consignment_settlements')
        .select('product_id, payout_amount, paid_at, sale_id')
        .in('product_id', productIds);
      
      const settlementMap = new Map(settlements?.map(s => [s.product_id, s]) || []);
      
      // Map products to consignment items
      return products.map(product => {
        const stockOnHand = stockMap.get(product.id) || 0;
        const settlement = settlementMap.get(product.id);
        
        let status: 'active' | 'sold' | 'settled' = 'active';
        if (settlement?.paid_at) {
          status = 'settled';
        } else if (settlement || stockOnHand === 0) {
          status = 'sold';
        }
        
        return {
          id: product.id,
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          internal_sku: product.internal_sku,
          agreed_payout: product.unit_cost,
          sale_price: product.unit_price,
          status,
          stock_on_hand: stockOnHand,
          consignment_start_date: product.consignment_start_date,
          consignment_end_date: product.consignment_end_date,
          consignment_terms: product.consignment_terms,
          settlement: settlement || null,
          created_at: product.created_at,
        };
      });
    },
    enabled: !!user && !!session && !!supplierId
  });
};
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ProductWithStock } from '@/types';

export type ProductSortOption = 
  | 'newest' 
  | 'oldest' 
  | 'name_asc' 
  | 'name_desc' 
  | 'price_high' 
  | 'price_low' 
  | 'margin_high' 
  | 'margin_low';

export interface EnhancedProductFilters {
  categories: string[];
  metals: string[];
  karats: string[];
  gemstones: string[];
  suppliers: string[];
  locations: string[];
  priceRange: { min: number; max: number };
  marginRange: { min: number; max: number };
  isTradeIn?: 'all' | 'trade_in_only' | 'non_trade_in';
  inventoryAge?: 'all' | '30' | '60' | '90';
  sortBy?: ProductSortOption;
  reservationStatus?: 'all' | 'reserved_only' | 'available_only' | 'fully_reserved';
}

export const useEnhancedProducts = (filters?: EnhancedProductFilters) => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['enhanced-products', filters],
    queryFn: async (): Promise<ProductWithStock[]> => {
      // Build the base query for products with suppliers and location
      let query = supabase
        .from('products')
        .select(`
          *,
          supplier:suppliers!supplier_id(name),
          consignment_supplier:suppliers!consignment_supplier_id(name),
          location:locations!location_id(id, name)
        `);

      // Apply filters if provided
      if (filters) {
        // Category filter
        if (filters.categories.length > 0) {
          query = query.in('category', filters.categories);
        }

        // Metal filter
        if (filters.metals.length > 0) {
          query = query.in('metal', filters.metals);
        }

        // Karat filter
        if (filters.karats.length > 0) {
          query = query.in('karat', filters.karats);
        }

        // Gemstone filter - handle "None" specially
        if (filters.gemstones.length > 0) {
          if (filters.gemstones.includes('None')) {
            const otherGemstones = filters.gemstones.filter(g => g !== 'None');
            if (otherGemstones.length > 0) {
              query = query.or(`gemstone.in.(${otherGemstones.join(',')}),gemstone.is.null`);
            } else {
              query = query.is('gemstone', null);
            }
          } else {
            query = query.in('gemstone', filters.gemstones);
          }
        }

        // Supplier filter
        if (filters.suppliers.length > 0) {
          const supplierIds = filters.suppliers.map(s => parseInt(s));
          query = query.in('supplier_id', supplierIds);
        }

        // Location filter
        if (filters.locations && filters.locations.length > 0) {
          const locationIds = filters.locations.map(l => parseInt(l));
          query = query.in('location_id', locationIds);
        }

        // Trade-in filter
        if (filters.isTradeIn && filters.isTradeIn !== 'all') {
          if (filters.isTradeIn === 'trade_in_only') {
            query = query.eq('is_trade_in', true);
          } else if (filters.isTradeIn === 'non_trade_in') {
            query = query.eq('is_trade_in', false);
          }
        }

        // Price range filter - handle zero-priced products when minimum is 0
        if (filters.priceRange.min > 0 || filters.priceRange.max < 1000000) {
          if (filters.priceRange.min > 0) {
            query = query.gte('unit_price', filters.priceRange.min);
          }
          query = query.lte('unit_price', filters.priceRange.max);
        }
      }

      // Execute the main products query
      const { data: products, error: productsError } = await query;
      
      if (productsError) throw productsError;

      // Get stock data separately - fetch ALL stock data (including 0)
      const { data: stockData, error: stockError } = await supabase
        .from('v_stock_on_hand')
        .select('product_id, qty_on_hand');

      if (stockError) throw stockError;

      // Get active deposit reservations to count reserved quantities per product
      const { data: reservedData, error: reservedError } = await supabase
        .from('deposit_order_items')
        .select(`
          product_id,
          quantity,
          deposit_order:deposit_orders!inner(id, status, customer_name)
        `)
        .not('deposit_order.status', 'in', '(completed,cancelled)');

      if (reservedError) throw reservedError;

      // Create a map of reserved products with their count and order info
      const reservedMap = new Map<number, { 
        reserved_count: number; 
        orders: Array<{ deposit_order_id: number; customer_name: string; quantity: number }> 
      }>();
      reservedData?.forEach((item: any) => {
        if (item.product_id && item.deposit_order) {
          const existing = reservedMap.get(item.product_id);
          const orderInfo = {
            deposit_order_id: item.deposit_order.id,
            customer_name: item.deposit_order.customer_name,
            quantity: item.quantity || 1
          };
          if (existing) {
            existing.reserved_count += (item.quantity || 1);
            existing.orders.push(orderInfo);
          } else {
            reservedMap.set(item.product_id, {
              reserved_count: item.quantity || 1,
              orders: [orderInfo]
            });
          }
        }
      });

      // Create stock lookup map
      const stockMap = new Map(stockData?.map(s => [s.product_id, s]) || []);
      
      // Filter products: show if qty > 0 OR has reservations
      const productsWithStock = products.filter(p => {
        const stock = stockMap.get(p.id)?.qty_on_hand || 0;
        const reservationInfo = reservedMap.get(p.id);
        const reservedCount = reservationInfo?.reserved_count || 0;
        // Show if there's any stock OR any active reservations
        return stock > 0 || reservedCount > 0;
      });

      // Get inventory data separately
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('v_inventory_value')
        .select('product_id, inventory_value, avg_cost');

      if (inventoryError) throw inventoryError;

      // Create inventory lookup map
      const inventoryMap = new Map(inventoryData?.map(i => [i.product_id, i]) || []);

      // Process the data to match ProductWithStock interface
      const processedProducts = productsWithStock.map((product: any) => {
        const stockInfo = stockMap.get(product.id);
        const inventoryInfo = inventoryMap.get(product.id);
        const reservationInfo = reservedMap.get(product.id);
        
        const qtyOnHand = stockInfo?.qty_on_hand || 0;
        const avgCost = inventoryInfo?.avg_cost || product.unit_cost;
        const inventoryValue = inventoryInfo?.inventory_value || (qtyOnHand * avgCost);
        
        // Calculate reservation quantities
        const qtyReserved = reservationInfo?.reserved_count || 0;
        const qtyAvailable = Math.max(0, qtyOnHand - qtyReserved);
        const isFullyReserved = qtyReserved > 0 && qtyAvailable === 0;
        const isPartiallyReserved = qtyReserved > 0 && qtyAvailable > 0;
        
        // Calculate markup percentage (Profit / Cost * 100) - jewellery industry standard
        const margin = product.unit_cost > 0 
          ? ((product.unit_price - product.unit_cost) / product.unit_cost) * 100 
          : 0;

        return {
          ...product,
          qty_on_hand: qtyOnHand,
          qty_available: qtyAvailable,
          qty_reserved: qtyReserved,
          inventory_value: inventoryValue,
          avg_cost: avgCost,
          margin: Math.round(margin * 100) / 100, // Round to 2 decimal places
          is_reserved: qtyReserved > 0,
          is_fully_reserved: isFullyReserved,
          is_partially_reserved: isPartiallyReserved,
          reserved_orders: reservationInfo?.orders || [],
        };
      });

      // Apply post-processing filters that need calculated values
      let filteredProducts = processedProducts;

      if (filters) {
        // Inventory age filter using purchase_date if available
        if (filters.inventoryAge && filters.inventoryAge !== 'all') {
          const now = new Date();
          const ageThreshold = parseInt(filters.inventoryAge);
          
          filteredProducts = filteredProducts.filter(product => {
            if (!product.qty_on_hand || product.qty_on_hand === 0) return false;
            const purchaseDate = (product as any).purchase_date 
              ? new Date((product as any).purchase_date)
              : new Date(product.created_at);
            const daysInInventory = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysInInventory >= ageThreshold;
          });
        }

        // Margin range filter
        if (filters.marginRange.min > 0 || filters.marginRange.max < 100) {
          filteredProducts = filteredProducts.filter(product => 
            product.margin >= filters.marginRange.min && 
            product.margin <= filters.marginRange.max
          );
        }

        // Reservation status filter
        if (filters.reservationStatus && filters.reservationStatus !== 'all') {
          if (filters.reservationStatus === 'reserved_only') {
            filteredProducts = filteredProducts.filter(product => product.is_reserved);
          } else if (filters.reservationStatus === 'available_only') {
            filteredProducts = filteredProducts.filter(product => product.qty_available > 0);
          } else if (filters.reservationStatus === 'fully_reserved') {
            filteredProducts = filteredProducts.filter(product => product.is_fully_reserved);
          }
        }
      }

      // Apply sorting
      const sortBy = filters?.sortBy || 'newest';
      
      filteredProducts.sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'name_asc':
            return a.name.localeCompare(b.name);
          case 'name_desc':
            return b.name.localeCompare(a.name);
          case 'price_high':
            return Number(b.unit_price) - Number(a.unit_price);
          case 'price_low':
            return Number(a.unit_price) - Number(b.unit_price);
          case 'margin_high':
            return b.margin - a.margin;
          case 'margin_low':
            return a.margin - b.margin;
          default:
            return 0;
        }
      });

      return filteredProducts;
    },
    enabled: !!user && !!session,
  });
};
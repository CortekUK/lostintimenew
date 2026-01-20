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

      // Get stock data separately - filter for qty > 0 to exclude sold items
      const { data: stockData, error: stockError } = await supabase
        .from('v_stock_on_hand')
        .select('product_id, qty_on_hand')
        .gt('qty_on_hand', 0);

      if (stockError) throw stockError;
      
      // Filter products to only include those with stock > 0
      const productsWithStock = products.filter(p => 
        stockData?.some(s => s.product_id === p.id)
      );

      // Get inventory data separately
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('v_inventory_value')
        .select('product_id, inventory_value, avg_cost');

      if (inventoryError) throw inventoryError;

      // Create lookup maps for performance
      const stockMap = new Map(stockData?.map(s => [s.product_id, s]) || []);
      const inventoryMap = new Map(inventoryData?.map(i => [i.product_id, i]) || []);

      // Process the data to match ProductWithStock interface
      const processedProducts = productsWithStock.map((product: any) => {
        const stockInfo = stockMap.get(product.id);
        const inventoryInfo = inventoryMap.get(product.id);
        
        const qtyOnHand = stockInfo?.qty_on_hand || 0;
        const avgCost = inventoryInfo?.avg_cost || product.unit_cost;
        const inventoryValue = inventoryInfo?.inventory_value || (qtyOnHand * avgCost);
        
        // Calculate markup percentage (Profit / Cost * 100) - jewellery industry standard
        const margin = product.unit_cost > 0 
          ? ((product.unit_price - product.unit_cost) / product.unit_cost) * 100 
          : 0;

        return {
          ...product,
          qty_on_hand: qtyOnHand,
          inventory_value: inventoryValue,
          avg_cost: avgCost,
          margin: Math.round(margin * 100) / 100, // Round to 2 decimal places
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
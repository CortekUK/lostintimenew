import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  ProductWithStock, 
  ProductInsert, 
  ProductUpdate,
  SupplierInsert, 
  SupplierUpdate,
  SaleInsert, 
  SaleItemInsert,
  SaleItemCreate,
  ExpenseInsert, 
  ExpenseUpdate,
  StockMovementInsert,
  StockAdjustment,
  DateRange,
  DashboardStats,
  ProductFilters,
  ExpenseFilters,
  SaleFilters
} from '@/types';

// Product-related hooks
export const useProducts = () => {
  const { user, session } = useAuth();
  
  // Fetch products with suppliers
  const productsQuery = useQuery({
    queryKey: ['products-base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          supplier:suppliers!supplier_id(name),
          consignment_supplier:suppliers!consignment_supplier_id(name),
          location:locations(id, name)
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session
  });

  // Fetch stock data
  const stockQuery = useQuery({
    queryKey: ['stock-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_stock_on_hand')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session
  });

  // Fetch inventory values
  const inventoryQuery = useQuery({
    queryKey: ['inventory-values'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_inventory_value')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session
  });

  // Return combined result with proper loading/error states
  const isLoading = productsQuery.isLoading || stockQuery.isLoading || inventoryQuery.isLoading;
  const isError = productsQuery.isError || stockQuery.isError || inventoryQuery.isError;
  const error = productsQuery.error || stockQuery.error || inventoryQuery.error;

  let data = [];
  if (productsQuery.data && stockQuery.data && inventoryQuery.data) {
    const products = productsQuery.data;
    const stockData = stockQuery.data;
    const inventoryData = inventoryQuery.data;

    // Create lookup maps for efficient merging
    const stockMap = new Map(stockData.map(s => [s.product_id, s]));
    const inventoryMap = new Map(inventoryData.map(i => [i.product_id, i]));

    // Merge data
    data = products.map(product => ({
      ...product,
      stock: stockMap.get(product.id) ? [stockMap.get(product.id)] : [],
      value: inventoryMap.get(product.id) ? [inventoryMap.get(product.id)] : []
    }));
  }

  return {
    data,
    isLoading,
    isError,
    error
  };
};

// Product search hook
export const useProductSearch = (query: string, limit = 20) => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['product-search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          supplier:suppliers!supplier_id(name),
          consignment_supplier:suppliers!consignment_supplier_id(name)
        `)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%,internal_sku.ilike.%${query}%`)
        .limit(limit);
      
      if (error) throw error;
      
      // Get stock data separately and merge
      const productIds = data?.map(p => p.id) || [];
      if (productIds.length === 0) return [];
      
      const { data: stockData } = await supabase
        .from('v_stock_on_hand')
        .select('*')
        .in('product_id', productIds);
      
      // Create stock lookup map
      const stockMap = new Map(stockData?.map(s => [s.product_id, s]) || []);

      // Merge data and filter out out-of-stock products
      return data
        .map(product => ({
          ...product,
          stock_on_hand: stockMap.get(product.id)?.qty_on_hand || 0
        }))
        .filter(product => !product.track_stock || product.stock_on_hand > 0);
    },
    enabled: !!user && !!session && query.length > 0
  });
};

// Weighted cost hook
export const useWeightedCost = (productId?: number) => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['weighted-cost', productId],
    queryFn: async () => {
      if (!productId) return null;
      
      const { data, error } = await supabase
        .from('v_weighted_cost')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session && !!productId
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: ProductInsert) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-base'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-data'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-values'] });
      queryClient.invalidateQueries({ queryKey: ['filter-options'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-products'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-stats'] });
      toast({
        title: "Success",
        description: "Product created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: ProductUpdate }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-base'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-products'] });
      queryClient.invalidateQueries({ queryKey: ['filter-options'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-products'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-stats'] });
      toast({
        title: "Success",
        description: "Product updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-base'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-data'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-values'] });
      queryClient.invalidateQueries({ queryKey: ['filter-options'] });
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  });
};

// Supplier-related hooks
export const useSuppliers = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (supplier: SupplierInsert) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplier)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: "Success",
        description: "Supplier created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to create supplier",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: SupplierUpdate }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: "Success",
        description: "Supplier updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: "Success",
        description: "Supplier deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive"
      });
    }
  });
};

// Sales-related hooks
export const useSales = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          staff:profiles!sales_staff_id_fkey(full_name),
          items:sale_items(
            *,
            product:products(name, sku, internal_sku, category, metal)
          )
        `)
        .order('sold_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session
  });
};

// New hooks for transactions and sold items
export const useTransactions = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id, sold_at, subtotal, tax_total, discount_total, total, payment,
          staff_id, customer_name, customer_email, is_voided, voided_at, void_reason,
          edited_at, edit_reason,
          profiles!fk_sales_staff_id ( full_name ),
          sale_items ( 
            id,
            products:product_id ( id, name, sku, internal_sku )
          )
        `)
        .order('sold_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session
  });
};

export const useTransactionDetails = (saleId?: number) => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['transaction-details', saleId],
    queryFn: async () => {
      if (!saleId) return null;
      
      // Fetch sale items with enhanced data including serial numbers and consignment info
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          id, quantity, unit_price, discount, tax_rate, unit_cost, product_id, sale_id,
          products:product_id ( 
            id, name, internal_sku, sku, category, metal, is_trade_in, is_consignment, is_registered,
            consignment_supplier_id,
            consignment_supplier:suppliers!products_consignment_supplier_id_fkey ( id, name )
          ),
          sales:sale_id (
            id, sold_at, staff_id, payment, customer_name, customer_email, signature_data, notes,
            subtotal, discount_total, tax_total, total, part_exchange_total,
            is_voided, voided_at, voided_by, void_reason, edited_at, edited_by, edit_reason,
            profiles!fk_sales_staff_id ( full_name )
          )
        `)
        .eq('sale_id', saleId);
      
      if (itemsError) throw itemsError;
      
      // Fetch part exchanges with serial numbers
      const { data: partExchanges, error: pxError } = await supabase
        .from('part_exchanges')
        .select('*')
        .eq('sale_id', saleId);
      
      if (pxError) throw pxError;
      
      // Fetch consignment settlements for these items
      const productIds = saleItems?.map(item => item.product_id) || [];
      let settlements: any[] = [];
      
      if (productIds.length > 0) {
        const { data: settlementsData } = await supabase
          .from('consignment_settlements')
          .select('*')
          .eq('sale_id', saleId)
          .in('product_id', productIds);
        
        settlements = settlementsData || [];
      }
      
      return {
        items: saleItems || [],
        partExchanges: partExchanges || [],
        settlements
      };
    },
    enabled: !!user && !!session && !!saleId
  });
};

export const useSoldItemsReport = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['sold-items-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          id, sale_id, quantity, unit_price, unit_cost, discount, tax_rate,
          product_id,
          products ( 
            name, internal_sku, sku, category, metal, karat, is_trade_in, is_consignment, is_registered,
            supplier_id, consignment_supplier_id,
            suppliers!products_supplier_id_fkey ( id, name, supplier_type ),
            consignment_supplier:suppliers!products_consignment_supplier_id_fkey ( id, name, supplier_type )
          ),
          sales ( id, sold_at, staff_id, staff_member_name, total, profiles!fk_sales_staff_id ( full_name ) )
        `)
        .order('sales(sold_at)', { ascending: false });
      
      if (error) throw error;
      
      // Fetch part exchanges to get serial numbers and allowances
      const saleIds = data?.map(item => item.sale_id).filter(Boolean) || [];
      const { data: partExchanges } = await supabase
        .from('part_exchanges')
        .select('sale_id, serial, allowance, customer_supplier_id, customer_name, suppliers!part_exchanges_customer_supplier_id_fkey ( id, name, supplier_type )')
        .in('sale_id', saleIds);
      
      const pxBySaleId = (partExchanges || []).reduce((acc: any, px: any) => {
        if (!acc[px.sale_id]) acc[px.sale_id] = [];
        acc[px.sale_id].push(px);
        return acc;
      }, {});
      
      // Fetch consignment settlements for COGS
      const productIds = data?.map(item => item.product_id).filter(Boolean) || [];
      const { data: settlements } = await supabase
        .from('consignment_settlements')
        .select('product_id, payout_amount, agreed_price')
        .in('product_id', productIds);
      
      const settlementByProductId = (settlements || []).reduce((acc: any, s: any) => {
        acc[s.product_id] = s;
        return acc;
      }, {});
      
      // Transform the data to match the expected structure
      return data?.map(item => {
        const product = item.products;
        const isTradeIn = product?.is_trade_in;
        const isConsignment = product?.is_consignment;
        
        // Get part exchange data for this sale
        const pxItems = pxBySaleId[item.sale_id] || [];
        const serial = pxItems.length > 0 ? pxItems[0].serial : null;
        
        // Determine supplier: for PX use customer supplier, otherwise use regular supplier
        let supplier = null;
        let supplierName = null;
        if (isTradeIn && pxItems.length > 0 && pxItems[0].suppliers) {
          supplier = pxItems[0].suppliers;
          supplierName = pxItems[0].customer_name || pxItems[0].suppliers.name;
        } else if (isConsignment && product?.consignment_supplier) {
          supplier = product.consignment_supplier;
          supplierName = supplier.name;
        } else if (product?.suppliers) {
          supplier = product.suppliers;
          supplierName = supplier.name;
        }
        
        // Calculate COGS
        let lineCogs = item.quantity * item.unit_cost;
        if (isTradeIn && pxItems.length > 0) {
          // For PX items, COGS is the allowance
          lineCogs = pxItems.reduce((sum: number, px: any) => sum + (Number(px.allowance) || 0), 0);
        } else if (isConsignment) {
          // For consignment, COGS is the payout amount if settled
          const settlement = settlementByProductId[item.product_id];
          if (settlement) {
            lineCogs = item.quantity * (Number(settlement.payout_amount) || Number(settlement.agreed_price) || 0);
          }
        }
        
        const lineRevenue = item.quantity * item.unit_price - (item.discount || 0);
        const lineGrossProfit = lineRevenue - lineCogs;
        
        return {
          sale_item_id: item.id,
          sale_id: item.sale_id,
          sold_at: item.sales?.sold_at,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.unit_cost,
          discount: item.discount || 0,
          tax_rate: item.tax_rate || 0,
          line_revenue: lineRevenue,
          line_cogs: lineCogs,
          line_gross_profit: lineGrossProfit,
          products: product,
          sales: item.sales,
          supplier: supplier,
          supplier_name: supplierName,
          serial: serial,
          part_exchanges: pxItems
        };
      }).filter(Boolean) || [];
    },
    enabled: !!user && !!session
  });
};

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sale, items }: { sale: SaleInsert, items: SaleItemCreate[] }) => {
      // Create sale first
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert(sale)
        .select()
        .single();
      
      if (saleError) throw saleError;
      
      // Create sale items
      const itemsWithSaleId: SaleItemInsert[] = items.map(item => ({
        ...item,
        sale_id: saleData.id
      }));
      
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsWithSaleId);
      
      if (itemsError) throw itemsError;
      
      return saleData;
    },
    onSuccess: async () => {
      // Force comprehensive cache invalidation
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['sold-items-report'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['products-base'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['enhanced-products'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['stock-data'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['inventory-values'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['filter-options'], refetchType: 'all' })
      ]);
      
      toast({
        title: "Success",
        description: "Sale completed successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete sale",
        variant: "destructive"
      });
    }
  });
};

// Expense-related hooks
export const useExpenses = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          staff:profiles(full_name),
          supplier:suppliers(name)
        `)
        .order('incurred_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expense: ExpenseInsert) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'filtered'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: "Success",
        description: "Expense recorded successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record expense",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: ExpenseUpdate }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'filtered'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: "Success",
        description: "Expense updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'filtered'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: "Success",
        description: "Expense deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive"
      });
    }
  });
};

// Stock management hooks
export const useStockAdjustment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (adjustment: StockAdjustment) => {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert({
          product_id: adjustment.product_id,
          movement_type: 'adjustment',
          quantity: adjustment.quantity,
          unit_cost: null,
          note: adjustment.note,
          occurred_at: new Date().toISOString(),
        } as StockMovementInsert)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-data'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-values'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: "Success",
        description: "Stock adjustment recorded successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record stock adjustment",
        variant: "destructive"
      });
    }
  });
};

// Dashboard analytics hooks
export const useDashboardStats = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get total inventory value
      const { data: inventoryData } = await supabase
        .from('v_inventory_value')
        .select('inventory_value');
      
      const inventory_value = inventoryData?.reduce((sum, item) => 
        sum + (Number(item.inventory_value) || 0), 0
      ) || 0;
      
      // Get today's sales
      const { data: todaySalesData } = await supabase
        .from('sales')
        .select('total')
        .gte('sold_at', todayStart.toISOString());
      
      const today_sales = todaySalesData?.reduce((sum, sale) => 
        sum + (Number(sale.total) || 0), 0
      ) || 0;
      
      // Get 7-day gross profit
      const { data: profitData } = await supabase
        .from('v_sales_with_profit')
        .select('line_gross_profit')
        .gte('sold_at', sevenDaysAgo.toISOString());
      
      const gross_profit_7d = profitData?.reduce((sum, item) => 
        sum + (Number(item.line_gross_profit) || 0), 0
      ) || 0;
      
      // Get 7-day expenses (non-COGS)
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('is_cogs', false)
        .gte('incurred_at', sevenDaysAgo.toISOString());
      
      const expenses_7d = expenseData?.reduce((sum, expense) => 
        sum + (Number(expense.amount) || 0), 0
      ) || 0;
      
      // Get low stock items
      const { data: lowStockData } = await supabase
        .from('v_stock_on_hand')
        .select('*')
        .lt('qty_on_hand', 5);
      
      // Get total product count
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      // Get consignment stats
      const { data: consignmentData } = await supabase
        .from('products')
        .select('id')
        .eq('is_consignment', true)
        .eq('track_stock', true);

      const { data: unsettledData } = await supabase
        .from('consignment_settlements')
        .select('payout_amount')
        .is('paid_at', null);

      const consignment_stock_count = consignmentData?.length || 0;
      const unsettled_consignments_value = unsettledData?.reduce((sum, item) => 
        sum + (Number(item.payout_amount) || 0), 0) || 0;

      return {
        today_sales,
        inventory_value,
        gross_profit_7d,
        expenses_7d,
        low_stock_count: lowStockData?.length || 0,
        total_products: totalProducts || 0,
        consignment_stock_count,
        unsettled_consignments_value,
      };
    },
    enabled: !!user && !!session
  });
};

// Reports hooks with date filtering
export const useReportsData = (dateRange?: DateRange) => {
  const { user, session } = useAuth();
  
  const defaultRange = {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString()
  };
  
  const range = dateRange || defaultRange;
  
  return useQuery({
    queryKey: ['reports', range],
    queryFn: async () => {
      // Get profit and loss data
      const { data: pnlData, error: pnlError } = await supabase
        .from('v_pnl_daily')
        .select('*')
        .gte('day', range.from)
        .lte('day', range.to)
        .order('day', { ascending: false });
      
      if (pnlError) throw pnlError;

      // Get operating expenses (non-COGS)
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('category, amount, incurred_at')
        .eq('is_cogs', false)
        .gte('incurred_at', range.from)
        .lte('incurred_at', range.to);
      
      if (expenseError) throw expenseError;

      // Get sales with profit data
      const { data: salesProfitData, error: salesError } = await supabase
        .from('v_sales_with_profit')
        .select('*')
        .gte('sold_at', range.from)
        .lte('sold_at', range.to);
      
      if (salesError) throw salesError;

      return {
        pnlData,
        expenseData,
        salesProfitData
      };
    },
    enabled: !!user && !!session
  });
};

// Expense filtering hook
export const useFilteredExpenses = (filters?: ExpenseFilters) => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['expenses-filtered', filters],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          staff:profiles(full_name),
          supplier:suppliers(name)
        `);
      
      if (filters?.date_range) {
        query = query
          .gte('incurred_at', filters.date_range.from)
          .lte('incurred_at', filters.date_range.to);
      }
      
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }
      
      if (filters?.is_cogs !== undefined) {
        query = query.eq('is_cogs', filters.is_cogs);
      }
      
      const { data, error } = await query.order('incurred_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session
  });
};

// Sales filtering hook
export const useFilteredSales = (filters?: SaleFilters) => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['sales-filtered', filters],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(`
          *,
          staff:profiles(full_name),
          items:sale_items(
            *,
            product:products(name, sku)
          )
        `);
      
      if (filters?.date_range) {
        query = query
          .gte('sold_at', filters.date_range.from)
          .lte('sold_at', filters.date_range.to);
      }
      
      if (filters?.payment_method) {
        query = query.eq('payment', filters.payment_method);
      }
      
      if (filters?.staff_id) {
        query = query.eq('staff_id', filters.staff_id);
      }
      
      const { data, error } = await query.order('sold_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session
  });
};
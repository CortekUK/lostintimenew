import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

// Pickup date utility functions
export function isPickupApproaching(expectedDate: string | null): boolean {
  if (!expectedDate) return false;
  const expected = new Date(expectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expected.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

export function isPickupOverdue(expectedDate: string | null): boolean {
  if (!expectedDate) return false;
  const expected = new Date(expectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expected.setHours(0, 0, 0, 0);
  return expected < today;
}

export function getDaysUntilPickup(expectedDate: string | null): number | null {
  if (!expectedDate) return null;
  const expected = new Date(expectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expected.setHours(0, 0, 0, 0);
  return Math.ceil((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Types from Supabase
type DepositOrder = Database['public']['Tables']['deposit_orders']['Row'];
type DepositOrderUpdate = Database['public']['Tables']['deposit_orders']['Update'];
type DepositOrderItem = Database['public']['Tables']['deposit_order_items']['Row'];
type DepositPayment = Database['public']['Tables']['deposit_payments']['Row'];
type DepositOrderSummary = Database['public']['Views']['v_deposit_order_summary']['Row'];

export type DepositOrderStatus = 'active' | 'completed' | 'cancelled' | 'voided' | 'expired';
export type PaymentMethod = Database['public']['Enums']['payment_method'];

// Extended types with relations
export interface DepositOrderPartExchange {
  id: number;
  deposit_order_id: number;
  product_name: string;
  category?: string | null;
  serial?: string | null;
  allowance: number;
  notes?: string | null;
  created_at: string;
}

export interface DepositOrderWithDetails extends DepositOrder {
  deposit_order_items?: (DepositOrderItem & { product?: { name: string; sku: string; internal_sku: string } | null })[];
  deposit_payments?: DepositPayment[];
  deposit_order_part_exchanges?: DepositOrderPartExchange[];
  customer?: { name: string; email?: string; phone?: string } | null;
}

export interface CreateDepositOrderParams {
  customer_id?: number | null;
  customer_name: string;
  notes?: string;
  location_id?: number | null;
  items: {
    product_id?: number | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    unit_cost?: number;
    is_custom_order?: boolean;
  }[];
  part_exchanges?: {
    product_name: string;
    category?: string;
    serial?: string;
    allowance: number;
    notes?: string;
  }[];
  initial_payment?: {
    amount: number;
    payment_method: PaymentMethod;
  };
}

export interface RecordPaymentParams {
  deposit_order_id: number;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string;
}

// Fetch all deposit orders with summary view
export function useDepositOrders(status?: DepositOrderStatus | 'all') {
  return useQuery({
    queryKey: ['deposit-orders', status],
    queryFn: async () => {
      let query = supabase
        .from('v_deposit_order_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DepositOrderSummary[];
    },
  });
}

// Fetch a single deposit order with full details
export function useDepositOrderDetails(orderId: number | null) {
  return useQuery({
    queryKey: ['deposit-order', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data: order, error: orderError } = await supabase
        .from('deposit_orders')
        .select(`
          *,
          deposit_order_items (
            *,
            product:products (name, sku, internal_sku)
          ),
          deposit_payments (*),
          deposit_order_part_exchanges (*),
          customer:customers (name, email, phone)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      return order as DepositOrderWithDetails;
    },
    enabled: !!orderId,
  });
}

// Create a new deposit order
export function useCreateDepositOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateDepositOrderParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate total amount from items
      const totalAmount = params.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      );

      // Calculate part exchange total
      const partExchangeTotal = params.part_exchanges?.reduce(
        (sum, px) => sum + px.allowance,
        0
      ) || 0;

      // Create the deposit order
      const { data: order, error: orderError } = await supabase
        .from('deposit_orders')
        .insert({
          customer_id: params.customer_id || 0,
          customer_name: params.customer_name || 'Walk-in Customer',
          total_amount: totalAmount,
          amount_paid: 0,
          part_exchange_total: partExchangeTotal,
          status: 'active',
          notes: params.notes,
          location_id: params.location_id,
          staff_id: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const itemsToInsert = params.items.map((item) => ({
        deposit_order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost || 0,
        is_custom_order: item.is_custom_order || !item.product_id,
      }));

      const { error: itemsError } = await supabase
        .from('deposit_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Create part exchange records if provided
      if (params.part_exchanges && params.part_exchanges.length > 0) {
        const pxToInsert = params.part_exchanges.map((px) => ({
          deposit_order_id: order.id,
          product_name: px.product_name,
          category: px.category || null,
          serial: px.serial || null,
          allowance: px.allowance,
          notes: px.notes || null,
        }));

        const { error: pxError } = await supabase
          .from('deposit_order_part_exchanges')
          .insert(pxToInsert);

        if (pxError) throw pxError;
      }

      // Reserve stock for products
      for (const item of params.items) {
        if (item.product_id) {
          const { error: stockError } = await supabase
            .from('stock_movements')
          .insert({
            product_id: item.product_id,
            quantity: -item.quantity,
            movement_type: 'reserve',
            note: `Deposit Order #${order.id}`,
            created_by: user.id,
          });
          if (stockError) throw stockError;
        }
      }

      // Record initial payment if provided
      if (params.initial_payment && params.initial_payment.amount > 0) {
        const { error: paymentError } = await supabase
          .from('deposit_payments')
          .insert({
            deposit_order_id: order.id,
            amount: params.initial_payment.amount,
            payment_method: params.initial_payment.payment_method,
            received_by: user.id,
          });

        if (paymentError) throw paymentError;
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Deposit order created',
        description: 'The deposit order has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating deposit order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Record a payment on an existing deposit order
export function useRecordDepositPayment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordPaymentParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the current order to check balance
      const { data: order, error: orderError } = await supabase
        .from('deposit_orders')
        .select('total_amount, amount_paid, status')
        .eq('id', params.deposit_order_id)
        .single();

      if (orderError) throw orderError;
      if (order.status === 'completed' || order.status === 'cancelled') {
        throw new Error('Cannot add payment to a completed or cancelled order');
      }

      const balanceDue = order.total_amount - order.amount_paid;
      if (params.amount > balanceDue) {
        throw new Error(`Payment amount exceeds balance due (£${balanceDue.toFixed(2)})`);
      }

      // Record the payment
      const { data: payment, error: paymentError } = await supabase
        .from('deposit_payments')
        .insert({
          deposit_order_id: params.deposit_order_id,
          amount: params.amount,
          payment_method: params.payment_method,
          notes: params.notes,
          received_by: user.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      return payment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deposit-orders'] });
      queryClient.invalidateQueries({ queryKey: ['deposit-order', variables.deposit_order_id] });
      toast({
        title: 'Payment recorded',
        description: 'The payment has been recorded successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error recording payment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update cost/details for a custom deposit order item
export function useUpdateDepositOrderItemCost() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      itemId: number;
      unit_cost: number;
      category?: string;
      description?: string;
    }) => {
      const { error } = await supabase
        .from('deposit_order_items')
        .update({
          unit_cost: params.unit_cost,
          category: params.category || null,
          description: params.description || null,
        })
        .eq('id', params.itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-order'] });
      queryClient.invalidateQueries({ queryKey: ['deposit-orders'] });
      toast({
        title: 'Cost updated',
        description: 'The item cost has been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating cost',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Complete a deposit order (convert to sale)
export function useCompleteDepositOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the order with items and part exchanges
      const { data: order, error: orderError } = await supabase
        .from('deposit_orders')
        .select(`
          *,
          deposit_order_items (*),
          deposit_payments (*),
          deposit_order_part_exchanges (*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (order.status !== 'active') {
        throw new Error('Only active orders can be completed');
      }
      if (order.balance_due > 0) {
        throw new Error(`Cannot complete order with outstanding balance of £${order.balance_due.toFixed(2)}`);
      }

      // Get customer details if we have customer_id
      let customerName = order.customer_name;
      let customerEmail: string | undefined;
      let customerPhone: string | undefined;
      
      if (order.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('name, email, phone')
          .eq('id', order.customer_id)
          .single();
        if (customer) {
          customerName = customer.name;
          customerEmail = customer.email || undefined;
          customerPhone = customer.phone || undefined;
        }
      }

      // Get "Customer Trade-In" supplier for PX items
      let tradeInSupplierId: number | null = null;
      if (order.deposit_order_part_exchanges && order.deposit_order_part_exchanges.length > 0) {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('name', 'Customer Trade-In')
          .single();
        tradeInSupplierId = supplier?.id || null;
      }

      // Create a sale from this deposit order
      const partExchangeTotal = order.part_exchange_total || 0;
      const netTotal = order.total_amount - partExchangeTotal;
      
      // Determine payment method from the deposit payments
      // Use the most recent payment's method, or 'cash' as default
      const payments = order.deposit_payments || [];
      let paymentMethod: Database['public']['Enums']['payment_method'] = 'cash';
      if (payments.length > 0) {
        // Sort by received_at descending to get the most recent payment
        const sortedPayments = [...payments].sort((a, b) => 
          new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
        );
        paymentMethod = sortedPayments[0].payment_method || 'cash';
      }
      
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: order.customer_id,
          customer_name: customerName,
          customer_email: customerEmail,
          subtotal: order.total_amount,
          discount_total: 0,
          tax_total: 0,
          total: order.total_amount,
          part_exchange_total: partExchangeTotal,
          payment: paymentMethod,
          notes: `Converted from Deposit Order #${order.id}`,
          staff_id: user.id,
          location_id: order.location_id,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items - handle both regular and custom orders
      for (const item of order.deposit_order_items || []) {
        // For custom items, create a product first
        let productId = item.product_id;
        
        if (item.is_custom_order) {
          // Create product record for custom item
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert({
              name: item.product_name,
              category: item.category || null,
              description: item.description || null,
              unit_cost: item.unit_cost || 0,
              unit_price: item.unit_price,
              supplier_id: null,
              is_trade_in: false,
              track_stock: true,
              location_id: order.location_id,
              // internal_sku omitted - DB trigger auto-generates unique SKU
            } as any)
            .select()
            .single();

          if (productError) throw productError;
          productId = newProduct.id;

          // Create stock movement for receiving the custom item (purchase)
          await supabase.from('stock_movements').insert({
            product_id: newProduct.id,
            quantity: item.quantity,
            movement_type: 'purchase',
            unit_cost: item.unit_cost,
            note: `Custom order from Deposit #${order.id}`,
            created_by: user.id,
          });

          // Create sale movement for selling the custom item
          await supabase.from('stock_movements').insert({
            product_id: newProduct.id,
            quantity: item.quantity,
            movement_type: 'sale',
            related_sale_id: sale.id,
            note: `Sale #${sale.id}`,
            created_by: user.id,
          });
        }

        // Create sale item with proper product reference
        const { error: itemError } = await supabase
          .from('sale_items')
          .insert({
            sale_id: sale.id,
            product_id: productId || null,
            product_name: item.product_name,
            is_custom_order: item.is_custom_order || false,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_cost: item.unit_cost || 0,
            tax_rate: 0,
            discount: 0,
          });

        if (itemError) throw itemError;

        // Only handle regular stock movements for non-custom items with a product_id
        if (!item.is_custom_order && item.product_id) {
          // Release the reserve
          await supabase.from('stock_movements').insert({
            product_id: item.product_id,
            quantity: item.quantity,
            movement_type: 'release',
            note: `Deposit Order #${order.id} completed`,
            created_by: user.id,
          });

          // Record the sale movement
          await supabase.from('stock_movements').insert({
            product_id: item.product_id,
            quantity: item.quantity,
            movement_type: 'sale',
            related_sale_id: sale.id,
            note: `Sale #${sale.id}`,
            created_by: user.id,
          });
        }
      }

      // Create part exchange records and products
      const pxItems = order.deposit_order_part_exchanges as DepositOrderPartExchange[] | undefined;
      if (pxItems && pxItems.length > 0) {
        for (const px of pxItems) {
          // Create product for the trade-in item
          // Note: internal_sku is auto-generated by database trigger
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert({
              name: px.product_name,
              category: px.category || null,
              unit_price: 0,
              unit_cost: px.allowance,
              supplier_id: tradeInSupplierId,
              is_trade_in: true,
              track_stock: true,
              location_id: order.location_id,
              // internal_sku omitted - DB trigger auto-generates unique SKU
            } as any)
            .select()
            .single();

          if (productError) throw productError;

          // Create stock movement for receiving the trade-in
          await supabase.from('stock_movements').insert([{
            product_id: newProduct.id,
            quantity: 1,
            movement_type: 'purchase' as const,
            unit_cost: px.allowance,
            note: `Trade-in from Sale #${sale.id}`,
            created_by: user.id,
          }]);

          // Create part_exchanges record linked to sale
          await supabase.from('part_exchanges').insert([{
            sale_id: sale.id,
            product_id: newProduct.id,
            title: px.product_name,
            category: px.category,
            serial: px.serial,
            allowance: px.allowance,
            notes: px.notes,
            customer_name: customerName,
            status: 'pending',
          }]);
        }
      }

      // Create consignment settlements for consignment products
      const productIds = (order.deposit_order_items || [])
        .filter(item => item.product_id && !item.is_custom_order)
        .map(item => item.product_id);

      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, is_consignment, consignment_supplier_id, unit_cost')
          .in('id', productIds);

        const consignmentProducts = productsData?.filter(p => p.is_consignment) || [];
        
        if (consignmentProducts.length > 0) {
          const consignmentProductMap = new Map(
            consignmentProducts.map(p => [p.id, p])
          );
          
          const settlementRecords = (order.deposit_order_items || [])
            .filter(item => item.product_id && consignmentProductMap.has(item.product_id))
            .map(item => {
              const product = consignmentProductMap.get(item.product_id)!;
              return {
                product_id: item.product_id,
                sale_id: sale.id,
                supplier_id: product.consignment_supplier_id,
                sale_price: item.unit_price * item.quantity,
                payout_amount: (product.unit_cost || item.unit_cost || 0) * item.quantity,
                paid_at: null
              };
            });

          if (settlementRecords.length > 0) {
            const { error: settlementError } = await supabase
              .from('consignment_settlements')
              .insert(settlementRecords);

            if (settlementError) throw settlementError;
          }
        }
      }

      // Update the deposit order status
      const { error: updateError } = await supabase
        .from('deposit_orders')
        .update({
          status: 'completed',
          sale_id: sale.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      return { order, sale };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-orders'] });
      queryClient.invalidateQueries({ queryKey: ['deposit-order'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['part-exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-products'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sold-items-report'] });
      queryClient.invalidateQueries({ queryKey: ['commission-payments'] });
      toast({
        title: 'Order completed',
        description: 'The deposit order has been converted to a sale.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error completing order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Void a deposit order
export function useVoidDepositOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the order with items
      const { data: order, error: orderError } = await supabase
        .from('deposit_orders')
        .select(`*, deposit_order_items (*)`)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (order.status !== 'active') {
        throw new Error('Only active orders can be voided');
      }

      // Release reserved stock
      for (const item of order.deposit_order_items || []) {
        if (item.product_id) {
          const { error: stockError } = await supabase
            .from('stock_movements')
          .insert({
            product_id: item.product_id,
            quantity: item.quantity,
            movement_type: 'release',
            note: `Deposit Order #${order.id} voided`,
            created_by: user.id,
          });
          if (stockError) throw stockError;
        }
      }

      // Update the order status
      const { error: updateError } = await supabase
        .from('deposit_orders')
        .update({
          status: 'voided',
          notes: reason ? `${order.notes || ''}\n\nVoid reason: ${reason}`.trim() : order.notes,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Order voided',
        description: 'The deposit order has been voided and stock released.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error voiding order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update deposit order details (for managers)
export function useUpdateDepositOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & DepositOrderUpdate) => {
      const { data, error } = await supabase
        .from('deposit_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deposit-orders'] });
      queryClient.invalidateQueries({ queryKey: ['deposit-order', data.id] });
      toast({
        title: 'Order updated',
        description: 'The deposit order has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Get deposit order stats
export function useDepositOrderStats() {
  return useQuery({
    queryKey: ['deposit-order-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_orders')
        .select('status, total_amount, amount_paid, balance_due, expected_date');

      if (error) throw error;

      const stats = {
        pending: { count: 0, totalValue: 0, totalPaid: 0, balanceDue: 0 },
        completed: { count: 0, totalValue: 0 },
        cancelled: { count: 0 },
        approaching: 0,
        overdue: 0,
      };

      for (const order of data || []) {
        if (order.status === 'active') {
          stats.pending.count++;
          stats.pending.totalValue += order.total_amount || 0;
          stats.pending.totalPaid += order.amount_paid || 0;
          stats.pending.balanceDue += order.balance_due || 0;
          
          // Check pickup date status for active orders
          if (order.expected_date) {
            if (isPickupOverdue(order.expected_date)) {
              stats.overdue++;
            } else if (isPickupApproaching(order.expected_date)) {
              stats.approaching++;
            }
          }
        } else if (order.status === 'completed') {
          stats.completed.count++;
          stats.completed.totalValue += order.total_amount || 0;
        } else if (order.status === 'cancelled') {
          stats.cancelled.count++;
        }
      }

      return stats;
    },
  });
}

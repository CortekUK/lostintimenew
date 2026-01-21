import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

// Types from Supabase
type DepositOrder = Database['public']['Tables']['deposit_orders']['Row'];
type DepositOrderUpdate = Database['public']['Tables']['deposit_orders']['Update'];
type DepositOrderItem = Database['public']['Tables']['deposit_order_items']['Row'];
type DepositPayment = Database['public']['Tables']['deposit_payments']['Row'];
type DepositOrderSummary = Database['public']['Views']['v_deposit_order_summary']['Row'];

export type DepositOrderStatus = 'pending' | 'completed' | 'cancelled';
export type PaymentMethod = Database['public']['Enums']['payment_method'];

// Extended types with relations
export interface DepositOrderWithDetails extends DepositOrder {
  deposit_order_items?: (DepositOrderItem & { product?: { name: string; sku: string } | null })[];
  deposit_payments?: DepositPayment[];
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
  initial_payment?: {
    amount: number;
    payment_method: PaymentMethod;
    reference?: string;
  };
}

export interface RecordPaymentParams {
  deposit_order_id: number;
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
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
            product:products (name, sku)
          ),
          deposit_payments (*),
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

      // Calculate total amount
      const totalAmount = params.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      );

      // Create the deposit order
      const { data: order, error: orderError } = await supabase
        .from('deposit_orders')
        .insert({
          customer_id: params.customer_id || 0,
          customer_name: params.customer_name || 'Walk-in Customer',
          total_amount: totalAmount,
          amount_paid: 0,
          status: 'pending',
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

      // Reserve stock for products
      for (const item of params.items) {
        if (item.product_id) {
          const { error: stockError } = await supabase
            .from('stock_movements')
            .insert({
              product_id: item.product_id,
              quantity: -item.quantity,
              movement_type: 'reserve',
              reference: `Deposit Order #${order.id}`,
              staff_id: user.id,
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
            reference: params.initial_payment.reference,
            recorded_by: user.id,
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
          reference: params.reference,
          notes: params.notes,
          recorded_by: user.id,
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

// Complete a deposit order (convert to sale)
export function useCompleteDepositOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the order with items
      const { data: order, error: orderError } = await supabase
        .from('deposit_orders')
        .select(`
          *,
          deposit_order_items (*),
          deposit_payments (*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (order.status !== 'pending') {
        throw new Error('Only pending orders can be completed');
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

      // Create a sale from this deposit order
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: order.customer_id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          subtotal: order.total_amount,
          discount: 0,
          tax: 0,
          total: order.total_amount,
          payment_method: 'other' as PaymentMethod,
          notes: `Converted from Deposit Order #${order.id}`,
          staff_id: user.id,
          location_id: order.location_id,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      for (const item of order.deposit_order_items || []) {
        if (item.product_id) {
          const { error: itemError } = await supabase
            .from('sale_items')
            .insert({
              sale_id: sale.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              unit_cost: item.unit_cost || 0,
              tax_rate: 0,
              discount: 0,
            });

          if (itemError) throw itemError;

          // Convert reserved stock to sold (release reserve, then record sale movement)
          // First, release the reserve
          await supabase.from('stock_movements').insert({
            product_id: item.product_id,
            quantity: item.quantity,
            movement_type: 'release',
            reference: `Deposit Order #${order.id} completed`,
            staff_id: user.id,
          });

          // Then record the sale movement
          await supabase.from('stock_movements').insert({
            product_id: item.product_id,
            quantity: -item.quantity,
            movement_type: 'sale',
            reference: `Sale #${sale.id}`,
            staff_id: user.id,
          });
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
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
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

// Cancel a deposit order
export function useCancelDepositOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the order with items
      const { data: order, error: orderError } = await supabase
        .from('deposit_orders')
        .select(`
          *,
          deposit_order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (order.status !== 'pending') {
        throw new Error('Only pending orders can be cancelled');
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
              reference: `Deposit Order #${order.id} cancelled`,
              staff_id: user.id,
            });
          if (stockError) throw stockError;
        }
      }

      // Update the order status
      const { error: updateError } = await supabase
        .from('deposit_orders')
        .update({
          status: 'cancelled',
          notes: reason ? `${order.notes || ''}\n\nCancellation reason: ${reason}`.trim() : order.notes,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Order cancelled',
        description: 'The deposit order has been cancelled and stock released.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error cancelling order',
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
        .select('status, total_amount, amount_paid, balance_due');

      if (error) throw error;

      const stats = {
        pending: { count: 0, totalValue: 0, totalPaid: 0, balanceDue: 0 },
        completed: { count: 0, totalValue: 0 },
        cancelled: { count: 0 },
      };

      for (const order of data || []) {
        if (order.status === 'pending') {
          stats.pending.count++;
          stats.pending.totalValue += order.total_amount || 0;
          stats.pending.totalPaid += order.amount_paid || 0;
          stats.pending.balanceDue += order.balance_due || 0;
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

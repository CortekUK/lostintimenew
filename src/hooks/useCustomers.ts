import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  ring_size: string | null;
  bracelet_size: string | null;
  necklace_length: string | null;
  metal_preference: string | null;
  style_preference: string | null;
  birthday: string | null;
  anniversary: string | null;
  vip_tier: 'standard' | 'silver' | 'gold' | 'platinum';
  lifetime_spend: number;
  total_purchases: number;
  notes: string | null;
  status: 'active' | 'inactive';
  demo_session_id: string | null;
}

export interface CustomerInsert {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  ring_size?: string | null;
  bracelet_size?: string | null;
  necklace_length?: string | null;
  metal_preference?: string | null;
  style_preference?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  notes?: string | null;
  status?: 'active' | 'inactive';
}

export interface CustomerUpdate extends Partial<CustomerInsert> {
  vip_tier?: 'standard' | 'silver' | 'gold' | 'platinum';
}

export interface CustomerWithSummary extends Customer {
  last_purchase_date?: string | null;
  sale_count?: number;
}

// Fetch all customers
export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });
}

// Fetch single customer with full details
export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Customer;
    },
    enabled: !!id,
  });
}

// Fetch customer purchase history
export function useCustomerPurchaseHistory(customerId: number | null) {
  return useQuery({
    queryKey: ['customer-purchases', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            product:products (id, name, internal_sku, category)
          )
        `)
        .eq('customer_id', customerId)
        .eq('is_voided', false)
        .order('sold_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

// Search customers for autocomplete
export function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: ['customer-search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, vip_tier')
        .eq('status', 'active')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data as Pick<Customer, 'id' | 'name' | 'email' | 'phone' | 'vip_tier'>[];
    },
    enabled: query.length >= 2,
  });
}

// Create customer
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customer: CustomerInsert) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Customer created',
        description: 'New customer has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update customer
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CustomerUpdate & { id: number }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Unable to update customer. You may not have permission.');
      }
      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', data.id] });
      toast({
        title: 'Customer updated',
        description: 'Customer details have been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Delete customer (soft delete by setting status to inactive)
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('customers')
        .update({ status: 'inactive' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Customer archived',
        description: 'Customer has been archived successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error archiving customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Fetch upcoming reminders
export function useCustomerReminders() {
  return useQuery({
    queryKey: ['customer-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_customer_reminders')
        .select('*');

      if (error) throw error;
      return data;
    },
  });
}

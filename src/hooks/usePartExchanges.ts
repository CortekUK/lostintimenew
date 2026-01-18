import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PartExchange, PartExchangeInsert, PartExchangeUpdate } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Get part exchanges where a specific product was the trade-in item
export const usePartExchangesByProduct = (productId: number) => {
  return useQuery({
    queryKey: ['part-exchanges', 'product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_exchanges')
        .select(`
          *,
          sale:sales(sold_at, staff_id)
        `)
        .eq('product_id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - product is not from a part exchange
          return null;
        }
        throw error;
      }
      return data;
    },
    enabled: !!productId,
  });
};

// Get part exchanges for a specific sale
export const usePartExchangesBySale = (saleId: number) => {
  return useQuery({
    queryKey: ['part-exchanges', 'sale', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_exchanges')
        .select(`
          *,
          product:products(*),
          sale:sales(sold_at)
        `)
        .eq('sale_id', saleId);

      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });
};

// Get all part exchanges with product details for reporting
export const usePartExchanges = () => {
  return useQuery({
    queryKey: ['part-exchanges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_exchanges')
        .select(`
          *,
          product:products(*),
          sale:sales(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

// Get pending part exchanges stats for dashboard
export const usePendingPartExchangesStats = () => {
  return useQuery({
    queryKey: ['part-exchanges', 'pending-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_exchanges')
        .select('allowance')
        .eq('status', 'pending');

      if (error) throw error;
      
      const count = data?.length || 0;
      const totalValue = data?.reduce((sum, px) => sum + Number(px.allowance), 0) || 0;
      
      return { count, totalValue };
    },
  });
};

// Create a new part exchange
export const useCreatePartExchange = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (partExchange: PartExchangeInsert) => {
      const { data, error } = await supabase
        .from('part_exchanges')
        .insert(partExchange)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-exchanges'] });
      toast({
        title: "Part exchange created",
        description: "Trade-in item has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating part exchange",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Update part exchange
export const useUpdatePartExchange = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: PartExchangeUpdate }) => {
      const { data, error } = await supabase
        .from('part_exchanges')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-exchanges'] });
      toast({
        title: "Part exchange updated",
        description: "Trade-in details have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating part exchange",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Delete part exchange
export const useDeletePartExchange = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('part_exchanges')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-exchanges'] });
      toast({
        title: "Part exchange deleted",
        description: "Trade-in item has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting part exchange",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Put part exchange on hold
export const useHoldPartExchange = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('part_exchanges')
        .update({
          status: 'hold',
          hold_reason: reason,
          hold_at: new Date().toISOString(),
          hold_by: user?.id || null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['pending-part-exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['hold-part-exchanges'] });
      toast({
        title: "Trade-in on hold",
        description: "Item has been placed on hold.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error placing on hold",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Release part exchange from hold back to pending
export const useReleaseHold = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('part_exchanges')
        .update({
          status: 'pending',
          hold_reason: null,
          hold_at: null,
          hold_by: null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['pending-part-exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['hold-part-exchanges'] });
      toast({
        title: "Hold released",
        description: "Item is back in the pending queue.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error releasing hold",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
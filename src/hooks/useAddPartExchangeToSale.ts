import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddPartExchangeParams {
  saleId: number;
  title: string;
  category?: string;
  description?: string;
  serial?: string;
  allowance: number;
  notes?: string;
  customerName?: string;
  customerContact?: string;
  customerSupplierId?: number;
  lateAdditionReason?: string;
}

export function useAddPartExchangeToSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: AddPartExchangeParams) => {
      const {
        saleId,
        title,
        category,
        description,
        serial,
        allowance,
        notes,
        customerName,
        customerContact,
        customerSupplierId,
        lateAdditionReason,
      } = params;

      // Get the current sale to update totals
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('total, part_exchange_total')
        .eq('id', saleId)
        .single();

      if (saleError) throw new Error(`Failed to fetch sale: ${saleError.message}`);

      // Combine notes with late addition reason
      const combinedNotes = [
        notes,
        lateAdditionReason ? `[Late addition: ${lateAdditionReason}]` : null,
      ]
        .filter(Boolean)
        .join('\n');

      // Create the part exchange record
      const { data: partExchange, error: pxError } = await supabase
        .from('part_exchanges')
        .insert({
          sale_id: saleId,
          title,
          category: category || null,
          description: description || null,
          serial: serial || null,
          allowance,
          notes: combinedNotes || null,
          customer_name: customerName || null,
          customer_contact: customerContact || null,
          customer_supplier_id: customerSupplierId || null,
          status: 'pending',
        })
        .select()
        .single();

      if (pxError) throw new Error(`Failed to create part exchange: ${pxError.message}`);

      // Update the sale's part_exchange_total and total
      const currentPxTotal = Number(sale.part_exchange_total) || 0;
      const newPxTotal = currentPxTotal + allowance;
      const newTotal = Number(sale.total) - allowance;

      const { error: updateError } = await supabase
        .from('sales')
        .update({
          part_exchange_total: newPxTotal,
          total: newTotal,
        })
        .eq('id', saleId);

      if (updateError) throw new Error(`Failed to update sale totals: ${updateError.message}`);

      return partExchange;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['receipt', variables.saleId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['part-exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['pending-px-stats'] });

      toast({
        title: 'Part exchange added',
        description: 'The trade-in has been added to this sale and is now in the intake queue.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add part exchange',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

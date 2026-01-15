import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ExpenseTemplate {
  id: number;
  description: string;
  amount: number;
  category: string;
  supplier_id: number | null;
  payment_method: string;
  vat_rate: number | null;
  notes: string | null;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  next_due_date: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  last_generated_at: string | null;
}

export function useExpenseTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all active templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['expense-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_templates')
        .select('*')
        .eq('is_active', true)
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      return data as ExpenseTemplate[];
    },
    enabled: !!user,
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (template: Omit<ExpenseTemplate, 'id' | 'created_at' | 'created_by' | 'last_generated_at' | 'is_active'>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('expense_templates').insert({
        ...template,
        created_by: userData.user?.id,
        is_active: true,
      }).select().single();

      if (error) throw error;
      return data as ExpenseTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-templates'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ExpenseTemplate> }) => {
      const { error } = await supabase
        .from('expense_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-templates'] });
      toast({
        title: 'Template updated',
        description: 'Recurring expense template has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete (deactivate) template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('expense_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-templates'] });
      toast({
        title: 'Template deactivated',
        description: 'Recurring expense template has been deactivated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Deactivation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    templates: templates || [],
    isLoading,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

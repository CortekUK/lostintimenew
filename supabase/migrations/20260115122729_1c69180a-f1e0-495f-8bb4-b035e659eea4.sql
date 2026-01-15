-- Add template_id column to link expenses with their recurring templates
ALTER TABLE public.expenses ADD COLUMN template_id bigint REFERENCES public.expense_templates(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX idx_expenses_template_id ON public.expenses(template_id);
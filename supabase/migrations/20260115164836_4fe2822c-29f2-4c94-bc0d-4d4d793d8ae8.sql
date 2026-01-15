-- Create staff commission overrides table for per-user rates
CREATE TABLE public.staff_commission_overrides (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  staff_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  commission_rate numeric NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_basis text NOT NULL DEFAULT 'revenue' CHECK (commission_basis IN ('revenue', 'profit')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(staff_id)
);

-- Add commission override columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS commission_override numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS commission_override_reason text DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.staff_commission_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies - only owners can manage commission overrides
CREATE POLICY "Owners can view commission overrides"
ON public.staff_commission_overrides
FOR SELECT
USING (public.is_owner(auth.uid()));

CREATE POLICY "Owners can create commission overrides"
ON public.staff_commission_overrides
FOR INSERT
WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owners can update commission overrides"
ON public.staff_commission_overrides
FOR UPDATE
USING (public.is_owner(auth.uid()));

CREATE POLICY "Owners can delete commission overrides"
ON public.staff_commission_overrides
FOR DELETE
USING (public.is_owner(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER set_staff_commission_overrides_updated_at
BEFORE UPDATE ON public.staff_commission_overrides
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Add audit trigger
CREATE TRIGGER audit_staff_commission_overrides
AFTER INSERT OR UPDATE OR DELETE ON public.staff_commission_overrides
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
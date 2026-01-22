-- Drop the old constraint
ALTER TABLE public.deposit_orders DROP CONSTRAINT IF EXISTS deposit_orders_status_check;

-- Add updated constraint with 'voided' included
ALTER TABLE public.deposit_orders ADD CONSTRAINT deposit_orders_status_check 
  CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text, 'expired'::text, 'voided'::text]));
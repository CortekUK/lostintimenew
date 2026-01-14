-- Create commission_payments table for tracking staff commission payments
CREATE TABLE public.commission_payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  sales_count integer NOT NULL DEFAULT 0,
  revenue_total numeric NOT NULL DEFAULT 0,
  profit_total numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL,
  commission_basis text NOT NULL CHECK (commission_basis IN ('revenue', 'profit')),
  commission_amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  notes text,
  paid_by uuid REFERENCES public.profiles(user_id),
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- Staff can view their own payment history
CREATE POLICY "Staff can view own commission payments"
ON public.commission_payments
FOR SELECT
USING (auth.uid() = staff_id);

-- Owners can view all commission payments
CREATE POLICY "Owners can view all commission payments"
ON public.commission_payments
FOR SELECT
USING (is_owner(auth.uid()));

-- Owners can insert commission payments
CREATE POLICY "Owners can insert commission payments"
ON public.commission_payments
FOR INSERT
WITH CHECK (is_owner(auth.uid()));

-- Owners can update commission payments
CREATE POLICY "Owners can update commission payments"
ON public.commission_payments
FOR UPDATE
USING (is_owner(auth.uid()));

-- Owners can delete commission payments
CREATE POLICY "Owners can delete commission payments"
ON public.commission_payments
FOR DELETE
USING (is_owner(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_commission_payments_staff_id ON public.commission_payments(staff_id);
CREATE INDEX idx_commission_payments_period ON public.commission_payments(period_start, period_end);
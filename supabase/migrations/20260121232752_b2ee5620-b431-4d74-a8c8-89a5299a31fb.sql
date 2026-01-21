-- Step 1: Add part_exchange_total column to deposit_orders
ALTER TABLE public.deposit_orders 
ADD COLUMN part_exchange_total NUMERIC NOT NULL DEFAULT 0;

-- Step 2: Create table for part exchanges on deposit orders
CREATE TABLE public.deposit_order_part_exchanges (
  id BIGSERIAL PRIMARY KEY,
  deposit_order_id BIGINT NOT NULL REFERENCES public.deposit_orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category TEXT,
  serial TEXT,
  allowance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Enable RLS
ALTER TABLE public.deposit_order_part_exchanges ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
CREATE POLICY "Staff can view deposit order part exchanges" 
  ON public.deposit_order_part_exchanges FOR SELECT 
  USING (public.is_any_staff(auth.uid()));

CREATE POLICY "Staff can create deposit order part exchanges" 
  ON public.deposit_order_part_exchanges FOR INSERT 
  WITH CHECK (public.is_any_staff(auth.uid()));

CREATE POLICY "Managers can update deposit order part exchanges" 
  ON public.deposit_order_part_exchanges FOR UPDATE 
  USING (public.is_owner_or_manager(auth.uid()));

CREATE POLICY "Owners can delete deposit order part exchanges" 
  ON public.deposit_order_part_exchanges FOR DELETE 
  USING (public.is_owner(auth.uid()));

-- Step 5: Create index
CREATE INDEX idx_deposit_order_part_exchanges_order_id 
  ON public.deposit_order_part_exchanges(deposit_order_id);

-- Step 6: Drop and recreate the view
DROP VIEW IF EXISTS public.v_deposit_order_summary;

CREATE VIEW public.v_deposit_order_summary AS
SELECT 
  d.id,
  d.customer_id,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  d.total_amount,
  d.amount_paid,
  d.part_exchange_total,
  (d.total_amount - d.amount_paid - d.part_exchange_total) as balance_due,
  d.status,
  d.notes,
  d.created_at,
  d.expected_date,
  d.completed_at,
  d.sale_id,
  d.staff_id,
  p.full_name as staff_name,
  d.location_id,
  l.name as location_name,
  (SELECT COUNT(*) FROM public.deposit_order_items WHERE deposit_order_id = d.id) as item_count,
  (SELECT COUNT(*) FROM public.deposit_payments WHERE deposit_order_id = d.id) as payment_count,
  (SELECT COUNT(*) FROM public.deposit_order_part_exchanges WHERE deposit_order_id = d.id) as part_exchange_count
FROM public.deposit_orders d
LEFT JOIN public.customers c ON c.id = d.customer_id
LEFT JOIN public.profiles p ON p.user_id = d.staff_id
LEFT JOIN public.locations l ON l.id = d.location_id;
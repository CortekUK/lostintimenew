-- Create customers table
CREATE TABLE public.customers (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  ring_size text,
  bracelet_size text,
  necklace_length text,
  metal_preference text,
  style_preference text,
  birthday date,
  anniversary date,
  vip_tier text NOT NULL DEFAULT 'standard' CHECK (vip_tier IN ('standard', 'silver', 'gold', 'platinum')),
  lifetime_spend numeric NOT NULL DEFAULT 0,
  total_purchases integer NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  demo_session_id text
);

-- Create customer_preferences table
CREATE TABLE public.customer_preferences (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer_id bigint NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  preference_type text NOT NULL,
  preference_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, preference_type, preference_value)
);

-- Add customer_id to sales table
ALTER TABLE public.sales ADD COLUMN customer_id bigint REFERENCES public.customers(id);
CREATE INDEX idx_sales_customer ON public.sales(customer_id);

-- Create indexes for customers table
CREATE INDEX idx_customers_name ON public.customers USING gin(name gin_trgm_ops);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_vip_tier ON public.customers(vip_tier);
CREATE INDEX idx_customers_status ON public.customers(status);

-- Create view for customer purchase summary
CREATE OR REPLACE VIEW public.v_customer_summary AS
SELECT 
  c.id as customer_id,
  c.name,
  c.email,
  c.vip_tier,
  c.lifetime_spend,
  c.total_purchases,
  c.birthday,
  c.anniversary,
  MAX(s.sold_at) as last_purchase_date,
  COUNT(DISTINCT s.id) as sale_count
FROM public.customers c
LEFT JOIN public.sales s ON s.customer_id = c.id AND s.is_voided = false
GROUP BY c.id, c.name, c.email, c.vip_tier, c.lifetime_spend, c.total_purchases, c.birthday, c.anniversary;

-- Create simpler view for upcoming reminders
CREATE OR REPLACE VIEW public.v_customer_reminders AS
SELECT 
  c.id as customer_id,
  c.name,
  c.email,
  c.phone,
  c.vip_tier,
  'birthday'::text as reminder_type,
  c.birthday as event_date
FROM public.customers c
WHERE c.birthday IS NOT NULL AND c.status = 'active'
UNION ALL
SELECT 
  c.id as customer_id,
  c.name,
  c.email,
  c.phone,
  c.vip_tier,
  'anniversary'::text as reminder_type,
  c.anniversary as event_date
FROM public.customers c
WHERE c.anniversary IS NOT NULL AND c.status = 'active';

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Authenticated users can view customers"
ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can create customers"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (public.is_owner_or_manager(auth.uid()) OR public.is_staff(auth.uid()));

CREATE POLICY "Owner and manager can update customers"
ON public.customers FOR UPDATE TO authenticated
USING (public.is_owner_or_manager(auth.uid()));

CREATE POLICY "Owner can delete customers"
ON public.customers FOR DELETE TO authenticated
USING (public.is_owner(auth.uid()));

-- RLS Policies for customer_preferences
CREATE POLICY "Authenticated users can view customer preferences"
ON public.customer_preferences FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage customer preferences"
ON public.customer_preferences FOR ALL TO authenticated
USING (public.is_owner_or_manager(auth.uid()) OR public.is_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to update customer stats after sale
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NOT NEW.is_voided THEN
    UPDATE public.customers SET 
      lifetime_spend = lifetime_spend + NEW.total,
      total_purchases = total_purchases + 1,
      vip_tier = CASE 
        WHEN lifetime_spend + NEW.total >= 5000 THEN 'platinum'
        WHEN lifetime_spend + NEW.total >= 2000 THEN 'gold'
        WHEN lifetime_spend + NEW.total >= 500 THEN 'silver'
        ELSE 'standard'
      END
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for customer stats
CREATE TRIGGER update_customer_stats_on_sale
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats();

-- Audit trigger
CREATE TRIGGER audit_customers
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
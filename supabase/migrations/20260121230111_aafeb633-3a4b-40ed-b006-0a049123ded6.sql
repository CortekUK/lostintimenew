-- Fix the function search_path for security
CREATE OR REPLACE FUNCTION public.update_deposit_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.deposit_orders
    SET amount_paid = COALESCE((
      SELECT SUM(amount) FROM public.deposit_payments WHERE deposit_order_id = OLD.deposit_order_id
    ), 0)
    WHERE id = OLD.deposit_order_id;
    RETURN OLD;
  ELSE
    UPDATE public.deposit_orders
    SET amount_paid = COALESCE((
      SELECT SUM(amount) FROM public.deposit_payments WHERE deposit_order_id = NEW.deposit_order_id
    ), 0)
    WHERE id = NEW.deposit_order_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
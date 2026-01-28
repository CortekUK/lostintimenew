-- Update check_stock_availability function to skip validation for custom orders
-- This fixes the "Insufficient stock" error when completing deposit orders with custom items

CREATE OR REPLACE FUNCTION public.check_stock_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  available_stock INTEGER;
  product_tracks_stock BOOLEAN;
BEGIN
  -- Skip validation for custom orders (stock handled separately)
  IF NEW.is_custom_order = TRUE THEN
    RETURN NEW;
  END IF;

  -- Skip validation if no product_id
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if the product tracks stock
  SELECT track_stock INTO product_tracks_stock
  FROM public.products
  WHERE id = NEW.product_id;

  -- If the product doesn't track stock, allow the sale
  IF NOT COALESCE(product_tracks_stock, FALSE) THEN
    RETURN NEW;
  END IF;

  -- Get the current available stock from the view
  SELECT COALESCE(qty_on_hand, 0) INTO available_stock
  FROM public.v_stock_on_hand
  WHERE product_id = NEW.product_id;

  -- Check if there's enough stock
  IF available_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product ID %. Available: %, Requested: %',
      NEW.product_id, available_stock, NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$;
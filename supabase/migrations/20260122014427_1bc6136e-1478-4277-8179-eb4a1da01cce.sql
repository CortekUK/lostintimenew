-- Fix v_stock_on_hand view to account for reserve/release movements from deposit orders
-- This ensures products with active deposits show as unavailable in POS

CREATE OR REPLACE VIEW public.v_stock_on_hand AS
SELECT
  p.id as product_id,
  p.sku,
  p.name,
  COALESCE(SUM(CASE
    WHEN sm.movement_type IN ('purchase','return_in') THEN sm.quantity
    WHEN sm.movement_type IN ('sale','return_out') THEN -sm.quantity
    WHEN sm.movement_type = 'adjustment' THEN sm.quantity
    WHEN sm.movement_type IN ('reserve', 'release') THEN sm.quantity
    ELSE 0 END), 0) as qty_on_hand
FROM public.products p
LEFT JOIN public.stock_movements sm ON sm.product_id = p.id
GROUP BY p.id, p.sku, p.name;
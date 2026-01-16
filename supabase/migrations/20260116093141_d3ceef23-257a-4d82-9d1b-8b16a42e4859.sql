-- Fix: Exclude voided sales from all financial views

-- 1. Update v_sales_with_profit to exclude voided sales
DROP VIEW IF EXISTS public.v_pnl_daily CASCADE;
DROP VIEW IF EXISTS public.v_sales_with_profit CASCADE;

CREATE VIEW public.v_sales_with_profit
WITH (security_invoker = on) AS
SELECT 
  si.id AS sale_item_id,
  si.sale_id,
  si.product_id,
  si.quantity,
  si.unit_price,
  si.unit_cost,
  (((si.quantity)::numeric * si.unit_price) - COALESCE(si.discount, (0)::numeric)) AS line_revenue,
  ((si.quantity)::numeric * si.unit_cost) AS line_cogs,
  ((((si.quantity)::numeric * si.unit_price) - COALESCE(si.discount, (0)::numeric)) - ((si.quantity)::numeric * si.unit_cost)) AS line_gross_profit,
  s.sold_at
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE s.is_voided = false;

-- 2. Recreate v_pnl_daily (depends on v_sales_with_profit)
CREATE VIEW public.v_pnl_daily
WITH (security_invoker = on) AS
SELECT 
  date_trunc('day', s.sold_at) AS day,
  sum(sw.line_revenue) AS revenue,
  sum(sw.line_cogs) AS cogs,
  sum(sw.line_gross_profit) AS gross_profit
FROM v_sales_with_profit sw
JOIN sales s ON s.id = sw.sale_id
WHERE s.is_voided = false
GROUP BY date_trunc('day', s.sold_at)
ORDER BY day;

-- 3. Update v_product_mix to exclude voided sales
DROP VIEW IF EXISTS public.v_product_mix;

CREATE VIEW public.v_product_mix
WITH (security_invoker = on) AS
SELECT 
  si.product_id,
  p.sku,
  p.name,
  p.category,
  p.metal,
  p.karat,
  sum(si.quantity) AS units_sold,
  sum((((si.quantity)::numeric * si.unit_price) - si.discount)) AS revenue,
  sum(((si.quantity)::numeric * si.unit_cost)) AS cogs,
  sum(((((si.quantity)::numeric * si.unit_price) - si.discount) - ((si.quantity)::numeric * si.unit_cost))) AS gross_profit
FROM sale_items si
JOIN products p ON p.id = si.product_id
JOIN sales s ON s.id = si.sale_id
WHERE s.is_voided = false
GROUP BY si.product_id, p.sku, p.name, p.category, p.metal, p.karat;

-- 4. Update v_consign_unsettled to exclude voided sales
DROP VIEW IF EXISTS public.v_consign_unsettled;

CREATE VIEW public.v_consign_unsettled
WITH (security_invoker = on) AS
SELECT 
  cs.id AS settlement_id,
  cs.product_id,
  cs.sale_id,
  cs.payout_amount,
  cs.paid_at,
  cs.agreed_price,
  cs.sale_price,
  cs.notes,
  p.name AS product_name,
  p.internal_sku,
  s.sold_at,
  s.total AS sale_total,
  sup.name AS supplier_name
FROM consignment_settlements cs
JOIN products p ON p.id = cs.product_id
JOIN sales s ON s.id = cs.sale_id
LEFT JOIN suppliers sup ON sup.id = cs.supplier_id
WHERE cs.paid_at IS NULL AND s.is_voided = false;

-- 5. Update v_pnl_px_consign to exclude voided sales
DROP VIEW IF EXISTS public.v_pnl_px_consign;

CREATE VIEW public.v_pnl_px_consign
WITH (security_invoker = on) AS
SELECT 
  si.id AS sale_item_id,
  si.sale_id,
  si.product_id,
  p.is_trade_in,
  p.is_consignment,
  (((si.quantity)::numeric * si.unit_price) - COALESCE(si.discount, (0)::numeric)) AS revenue,
  ((si.quantity)::numeric * si.unit_cost) AS cogs,
  CASE
    WHEN p.is_trade_in THEN 'px'
    WHEN p.is_consignment THEN 'consignment'
    ELSE 'owned'
  END AS kind,
  s.sold_at,
  p.name AS product_name,
  p.internal_sku,
  si.quantity,
  si.unit_price,
  si.unit_cost,
  si.discount
FROM sale_items si
JOIN products p ON p.id = si.product_id
JOIN sales s ON s.id = si.sale_id
WHERE s.is_voided = false;
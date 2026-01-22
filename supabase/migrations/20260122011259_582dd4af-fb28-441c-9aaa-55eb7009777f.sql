DROP VIEW IF EXISTS v_deposit_order_summary;

CREATE VIEW v_deposit_order_summary AS
SELECT 
  d.id,
  d.customer_id,
  d.customer_name,
  c.email AS customer_email,
  c.phone AS customer_phone,
  d.total_amount,
  d.amount_paid,
  d.part_exchange_total,
  d.balance_due,
  d.status,
  d.notes,
  d.created_at,
  d.expected_date,
  d.completed_at,
  d.sale_id,
  d.staff_id,
  p.full_name AS staff_name,
  d.location_id,
  l.name AS location_name,
  COALESCE(items.item_count, 0) AS item_count,
  items.item_names,
  COALESCE(payments.payment_count, 0) AS payment_count,
  COALESCE(px.part_exchange_count, 0) AS part_exchange_count
FROM deposit_orders d
LEFT JOIN customers c ON d.customer_id = c.id
LEFT JOIN profiles p ON d.staff_id = p.user_id
LEFT JOIN locations l ON d.location_id = l.id
LEFT JOIN (
  SELECT 
    deposit_order_id,
    COUNT(*) AS item_count,
    STRING_AGG(product_name, ', ' ORDER BY id) AS item_names
  FROM deposit_order_items
  GROUP BY deposit_order_id
) items ON d.id = items.deposit_order_id
LEFT JOIN (
  SELECT deposit_order_id, COUNT(*) AS payment_count
  FROM deposit_payments
  GROUP BY deposit_order_id
) payments ON d.id = payments.deposit_order_id
LEFT JOIN (
  SELECT deposit_order_id, COUNT(*) AS part_exchange_count
  FROM deposit_order_part_exchanges
  GROUP BY deposit_order_id
) px ON d.id = px.deposit_order_id;
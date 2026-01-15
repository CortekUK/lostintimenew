-- Backfill missing expense entries for existing commission payments
-- Map payment methods: bank_transfer -> transfer, cheque -> other
INSERT INTO expenses (
  description,
  category,
  amount,
  amount_inc_vat,
  is_cogs,
  payment_method,
  incurred_at,
  staff_id
)
SELECT 
  'Commission payment: Staff (' || cp.period_start || ' to ' || cp.period_end || ')' as description,
  'commission' as category,
  cp.commission_amount as amount,
  cp.commission_amount as amount_inc_vat,
  false as is_cogs,
  CASE 
    WHEN cp.payment_method = 'bank_transfer' THEN 'transfer'
    WHEN cp.payment_method = 'cheque' THEN 'other'
    ELSE 'other'
  END::payment_method as payment_method,
  cp.paid_at as incurred_at,
  cp.paid_by as staff_id
FROM commission_payments cp
LEFT JOIN expenses e ON 
  e.category = 'commission' 
  AND e.amount = cp.commission_amount 
  AND e.description ILIKE '%' || cp.period_start || '%'
WHERE e.id IS NULL;
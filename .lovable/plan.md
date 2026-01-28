
# Fix: Stock Validation Trigger for Custom Orders

## Problem

When completing a deposit order with custom items, the database trigger fails with:
```
Insufficient stock for product ID 99. Available: 0, Requested: 1
```

## Root Cause Analysis

The sequence of operations for custom items creates a timing issue:

```text
1. Create new product              → Product ID 99 created
2. Create purchase movement (+1)   → Stock = 1
3. Create sale movement (-1)       → Stock = 0
4. Insert sale_item                → TRIGGER checks stock = 0, FAILS
```

The `trg_check_stock_before_sale` trigger on `sale_items` validates stock availability but doesn't account for custom orders where stock is managed differently.

## Solution

Modify the database trigger to skip validation when:
- `is_custom_order = TRUE` (custom orders have special stock handling)
- `product_id IS NULL` (no product to validate)

## Database Migration

Create a new migration to update the `check_stock_availability()` function:

```sql
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
```

## Additional Code Fix

Also update `useDepositOrders.ts` to NOT create a separate sale stock movement for custom items since the sale_item creation handles this:

**File**: `src/hooks/useDepositOrders.ts`

Remove lines 509-517 (sale movement for custom items) because:
1. The sale_item will be created with the new product_id
2. Stock is managed via the purchase movement (to add stock) and the sale record
3. Creating a sale movement + sale_item would double-decrement stock

Instead, let the normal sale flow handle the stock deduction when the sale_item is created (same as regular products).

## Changes Summary

| Location | Change |
|----------|--------|
| Database trigger | Skip validation for `is_custom_order = TRUE` or `product_id IS NULL` |
| `src/hooks/useDepositOrders.ts` | Remove duplicate sale movement creation for custom items (lines 509-517) |

## Expected Behavior After Fix

1. Custom order completion creates product + purchase movement
2. Sale item is inserted with `is_custom_order = TRUE`
3. Trigger sees `is_custom_order = TRUE`, skips validation
4. Sale completes successfully
5. Stock movements properly reflect: +1 (purchase) and -1 (via sale) = 0 final stock

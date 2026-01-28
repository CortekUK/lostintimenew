
# Fix: Display Reservation Counts in POS and Product Inventory

## Problem Summary
When an item is reserved via a deposit order, the stock display should show "5 available, 1 reserved" instead of "6 available". Currently:
- **Product Inventory page** - Uses `useEnhancedProducts` which fetches reservation data correctly but shows "In Stock" instead of the breakdown
- **POS Product Search** - Uses `useProductSearch` which doesn't fetch reservation data at all

## Root Cause
The `useProductSearch` hook in `src/hooks/useDatabase.ts` only queries `v_stock_on_hand` for stock counts but doesn't query `deposit_order_items` to calculate reserved quantities.

## Solution

### 1. Update `useProductSearch` hook (`src/hooks/useDatabase.ts`)

Add reservation data fetching to match how `useEnhancedProducts` does it:

```typescript
// After fetching stock data, also fetch reservations
const { data: reservedData } = await supabase
  .from('deposit_order_items')
  .select(`
    product_id,
    quantity,
    deposit_order:deposit_orders!inner(id, status, customer_name)
  `)
  .not('deposit_order.status', 'in', '(completed,cancelled)')
  .in('product_id', productIds);

// Build reservation map
const reservedMap = new Map();
reservedData?.forEach(item => {
  if (item.product_id && item.deposit_order) {
    const existing = reservedMap.get(item.product_id);
    if (existing) {
      existing.reserved_count += (item.quantity || 1);
    } else {
      reservedMap.set(item.product_id, { reserved_count: item.quantity || 1 });
    }
  }
});

// Include in returned product data
return data.map(product => {
  const stockOnHand = stockMap.get(product.id)?.qty_on_hand || 0;
  const reservationInfo = reservedMap.get(product.id);
  const qtyReserved = reservationInfo?.reserved_count || 0;
  const qtyAvailable = Math.max(0, stockOnHand - qtyReserved);
  
  return {
    ...product,
    stock_on_hand: stockOnHand,
    qty_available: qtyAvailable,
    qty_reserved: qtyReserved
  };
});
```

### 2. Update Product Inventory Display

The `useEnhancedProducts` hook already returns the correct reservation data, but I need to verify the display in ProductTable is working. From my analysis, it appears the logic is correct but may not be triggering because `is_partially_reserved` might not be set on the product objects when they reach the ProductTable.

Double-check that products from `useEnhancedProducts` include:
- `qty_available`
- `qty_reserved`
- `is_fully_reserved`
- `is_partially_reserved`
- `reserved_orders`

These are all calculated in lines 190-211 of `useEnhancedProducts.ts`, so this should already work. Let me verify the Products page is passing the correct data to ProductTable.

### 3. Update `useProducts` hook (optional enhancement)

The basic `useProducts` hook (used by ProductSearch when no query is entered) also doesn't include reservation data. This should be updated for consistency.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useDatabase.ts` | Update `useProductSearch` to fetch and calculate reservation quantities |
| `src/hooks/useDatabase.ts` | Update `useProducts` to include reservation data for the initial product list |

## Expected Result After Fix

**POS Product Search:**
- Shows "5 available" badge (primary, gold)
- Shows "1 reserved" badge (secondary, amber)

**Product Inventory:**
- Shows "5 available" badge (primary)
- Shows "1 reserved" badge (secondary, amber)
- Tooltip shows which customer/order has the reservation

## Technical Note
The UI components (`ProductSearch.tsx` lines 87-123 and `ProductTable.tsx` lines 130-164) already have the logic to display reservation info - they just need the data (`qty_available`, `qty_reserved`) to be populated by the hooks.

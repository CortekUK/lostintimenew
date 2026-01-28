

# Fix Commission Attribution for Deposit Orders

## Problem
When a deposit order is completed, the resulting sale is attributed to whoever clicks "Complete Order" rather than the staff member who originally created the deposit order and made the sale.

## Current Behavior
```tsx
// src/hooks/useDepositOrders.ts, line 464
staff_id: user.id,  // Uses current user (whoever completes the order)
```

## Fix
Change the sale creation to use the original deposit order creator:

```tsx
staff_id: order.staff_id,  // Use original salesperson from deposit order
```

## Technical Details

### File: `src/hooks/useDepositOrders.ts`
**Line 464**: Change from `user.id` to `order.staff_id`

| Before | After |
|--------|-------|
| `staff_id: user.id` | `staff_id: order.staff_id` |

This ensures commission is correctly attributed to the salesperson who originally took the deposit, regardless of who processes the final completion.

## Impact
- Commission will go to the original deposit creator
- Audit trail still shows who completed the order (via `completed_by` field on the deposit order)
- No database changes required


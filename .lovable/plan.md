
# Display Payment Attribution in Deposit Order Payment History

## Overview
Enhance the deposit order payment history to show who received each payment and the running balance after each payment. The data is already being logged in the database - we just need to display it.

## Current State
- The `deposit_payments` table has a `received_by` column storing the staff member's user ID
- This information is captured on every payment but not shown in the UI
- Payment history currently shows: amount, payment method, timestamp, and notes

## Proposed Changes

### 1. Update Hook to Fetch Staff Names for Payments
**File**: `src/hooks/useDepositOrders.ts`

Modify the `useDepositOrderDetails` hook to fetch the staff member's name for each payment by joining with the profiles table.

Update the `DepositPayment` interface:
```typescript
export interface DepositPayment {
  id: number;
  deposit_order_id: number;
  amount: number;
  payment_method: PaymentMethod;
  received_at: string;
  received_by: string | null;
  received_by_name?: string | null;  // Add this
  notes?: string | null;
}
```

### 2. Enhance Payment History Display
**File**: `src/pages/DepositOrderDetail.tsx`

Add to each payment entry:
- **Received By**: Staff member who recorded the payment
- **Balance After**: Running balance after this payment was made

```text
Current Display:
┌─────────────────────────────────────┐
│ £500.00                       Cash  │
│ 28 Jan 2026, 14:30                  │
└─────────────────────────────────────┘

Enhanced Display:
┌─────────────────────────────────────┐
│ £500.00                       Cash  │
│ 28 Jan 2026, 14:30                  │
│ Received by: John Smith             │
│ Balance After: £1,500.00            │
└─────────────────────────────────────┘
```

## Technical Implementation

### Step 1: Update DepositPayment Interface
Add `received_by_name` field to track the staff member's name.

### Step 2: Fetch Staff Names in Hook
After fetching payments, query the profiles table to get names for all unique `received_by` IDs and map them back to the payments.

### Step 3: Calculate Running Balance
For each payment in the history, calculate what the balance was after that payment:
```typescript
const runningTotal = payments.reduce((acc, p) => acc + p.amount, 0);
const balanceAfter = order.total_amount - runningTotal;
```

### Step 4: Update UI
Display "Received by" and "Balance After" for each payment in the payment history card.

## Impact
- Provides full audit trail visibility for deposit payments
- Shows who processed each payment for accountability
- Displays running balance to help staff understand payment progression
- No database changes required - data already exists


# Owner-Only Commission Column - IMPLEMENTED ✅

The Sold Items Report now displays per-item commission breakdown **only for owner accounts**.

## What Was Added

### For Owners Only:
1. **Commission column** in the table showing calculated commission per item
2. **Commission stat card** (5th card) showing total commission for the period
3. **Commission total** in the bottom totals bar

### Commission Calculation Logic:
- Uses historical rate lookup via `getRateForSaleDate` to match monthly commission reports
- Respects staff-specific rates and the date the sale was made
- Falls back to default settings if no historical rate exists
- Voided sales show £0 commission with strikethrough styling

## Visual Impact

### Owners see:
- 5-column stat card grid (Items, Revenue, COGS, Profit, **Commission**)
- Commission column in table between Location and Actions
- Commission total in the bottom summary bar

### Managers/Staff see:
- Same 4-column layout as before
- No Commission column visible
- No Commission stat card or total

## Files Modified
- `src/pages/SoldItemsReport.tsx` - Added conditional commission column, stat card, and totals

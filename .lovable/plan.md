
# Fix: Trade-In Products Appearing in Sold Items Report

## Problem
When a product marked as `is_trade_in: true` is sold (either through POS or deposit order completion), the sale does NOT appear in the Sold Items Report. This is because line 177 in `SoldItemsReport.tsx` explicitly filters out all trade-in products:

```tsx
// Exclude trade-in products from sold items report
if (item?.products?.is_trade_in === true) return false;
```

## Why This Is Wrong
The `is_trade_in` flag indicates the product's **origin** (received as a part exchange from a customer), NOT that it shouldn't count as a sale. When you sell a trade-in item to another customer, that's a legitimate sale that should be tracked in reporting.

Your recent completed deposit order for James Jones (Rolex Submariner, Sale #81) is in the database but hidden from the Sold Items view because of this filter.

## Solution
Remove the trade-in exclusion filter from the sold items report. Trade-in products that are sold should appear in the report just like any other product.

### File: `src/pages/SoldItemsReport.tsx`
**Line 176-177**: Remove the trade-in filter

```text
Before:
// Exclude trade-in products from sold items report
if (item?.products?.is_trade_in === true) return false;

After:
(lines removed)
```

## Impact
- Sales of trade-in products will now appear in the Sold Items Report
- The report will show all actual sales, regardless of the product's origin
- Trade-in products will still be identifiable via the "Trade-In" badge in the Product column
- Revenue, COGS, and profit calculations will include trade-in product sales

## Verification
After this fix, your completed order (Sale #81 - Rolex Submariner for James Jones) will appear in the Sold Items Report.

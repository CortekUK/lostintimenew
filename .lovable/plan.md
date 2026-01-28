
# Add Owner-Only Commission Column to Sold Items Report

## Problem
When owners drill down from the commission report to see specific items, there's no commission breakdown per item. They can see revenue and profit but not the commission earned by staff on each sale.

## Solution
Add a conditional "Commission" column to the Sold Items table that **only renders for owner accounts**. This keeps the existing table intact for managers and staff while giving owners the detailed commission visibility they need.

## Why This Approach?
- **No impact on other users**: Managers and staff see exactly the same table as before
- **Leverages existing logic**: Commission calculation uses the same rate lookup as the monthly report
- **Consistent with codebase patterns**: The page already uses `userRole` checks (e.g., for CSV export)
- **Single source of truth**: All users access the same page, just with role-appropriate columns

## Technical Implementation

### File: `src/pages/SoldItemsReport.tsx`

1. **Import the rate history helper**:
   ```typescript
   import { useAllStaffRateHistory, getRateForSaleDate } from '@/hooks/useStaffCommissionRateHistory';
   ```

2. **Add the rate history query**:
   ```typescript
   const { data: rateHistory = [] } = useAllStaffRateHistory();
   ```

3. **Get commission settings**:
   ```typescript
   const { settings } = useSettings();
   const commissionRate = settings.commissionSettings?.defaultRate ?? 5;
   const commissionBasis = settings.commissionSettings?.calculationBasis ?? 'revenue';
   ```

4. **Create helper function to calculate item commission**:
   ```typescript
   const calculateItemCommission = (item: any): number => {
     const saleDate = new Date(item.sold_at);
     const staffId = item.sales?.staff_id;
     
     const historicalRate = getRateForSaleDate(rateHistory, staffId, saleDate);
     const rate = historicalRate?.rate ?? commissionRate;
     const basis = historicalRate?.basis ?? commissionBasis;
     
     const base = basis === 'profit' 
       ? (item.line_gross_profit || 0) 
       : (item.line_revenue || 0);
     
     return base * (rate / 100);
   };
   ```

5. **Conditionally add Commission column** (only when `isOwner`):
   ```typescript
   const columns = [
     // ... existing columns ...
     
     // Commission column - owner only
     ...(isOwner ? [{
       key: 'commission',
       title: 'Commission',
       sortable: true,
       width: 110,
       render: (value: any, row: any) => {
         const commission = calculateItemCommission(row);
         const isVoided = row?.sales?.is_voided;
         return (
           <span className={`font-mono text-primary ${isVoided ? 'line-through text-muted-foreground' : ''}`}>
             £{commission.toFixed(2)}
           </span>
         );
       }
     }] : []),
     
     // Actions column (stays last)
     { key: 'actions', ... }
   ];
   ```

6. **Add Commission to totals** (owner-only stat card):
   ```typescript
   const totals = useMemo(() => {
     // ... existing calculations ...
     const totalCommission = isOwner 
       ? filteredItems.reduce((sum, item) => sum + calculateItemCommission(item), 0)
       : 0;
     
     return { ...existingTotals, commission: totalCommission };
   }, [filteredItems, isOwner, rateHistory, commissionRate, commissionBasis]);
   ```

7. **Add Commission summary card** (conditional render):
   ```jsx
   {isOwner && (
     <Card>
       <CardHeader>
         <CardTitle>Commission</CardTitle>
         <Coins className="h-4 w-4" />
       </CardHeader>
       <CardContent>
         <div className="text-2xl font-bold text-primary">
           £{totals.commission.toFixed(0)}
         </div>
         <p className="text-xs text-muted-foreground">Total for period</p>
       </CardContent>
     </Card>
   )}
   ```

## Visual Result

### For Owners
| Date | Product | Cost | Revenue | Markup | **Commission** | Staff | Actions |
|------|---------|------|---------|--------|----------------|-------|---------|
| Jan 28 | Rolex Submariner | £5,000 | £8,500 | 70% | **£425** | John | ... |

Plus a summary card showing total commission for the filtered period.

### For Managers/Staff
Same table as before - no Commission column visible, no commission stat card.

## Files Modified
| File | Change |
|------|--------|
| `src/pages/SoldItemsReport.tsx` | Add conditional commission column, commission calculation helper, commission totals, and owner-only stat card |

## Additional Imports Needed
- `useAllStaffRateHistory`, `getRateForSaleDate` from `@/hooks/useStaffCommissionRateHistory`
- `useSettings` from `@/contexts/SettingsContext`
- `Coins` icon from `lucide-react`
- `usePermissions` hook (already using `useAuth`, but `usePermissions` provides `isOwner` helper)


# Fix Title Casing on Commission Report Page

## Summary
Update all lowercase status labels in the Commission tab to use consistent Title Case formatting, matching the established UI pattern throughout the application.

## Changes Required

### File: `src/components/reports/MonthlyCommissionView.tsx`

| Location | Current Text | Updated Text |
|----------|--------------|--------------|
| Line 165 (month badge) | `£{outstanding.toFixed(0)} outstanding` | `£{outstanding.toFixed(0)} Outstanding` |
| Line 171 (month badge) | `£{owed.toFixed(0)} owed` | `£{owed.toFixed(0)} Owed` |
| Line 188 (staff badge) | `£{staff.outstanding.toFixed(2)} due` | `£{staff.outstanding.toFixed(2)} Due` |
| Line 218 (header badge) | `£{grandTotals.outstanding.toFixed(0)} total outstanding` | `£{grandTotals.outstanding.toFixed(0)} Total Outstanding` |
| Line 373 (month summary) | `<span className="text-muted-foreground">owed</span>` | `<span className="text-muted-foreground">Owed</span>` |
| Line 376 (month summary) | `<span className="text-muted-foreground">paid</span>` | `<span className="text-muted-foreground">Paid</span>` |

## Visual Impact
- Badge labels will display as "£350 Total Outstanding" instead of "£350 total outstanding"
- Month summaries will show "£2610.00 Owed" and "£6670.00 Paid" with capital letters
- Staff status badges will show "£100.00 Due" instead of "£100.00 due"

## Consistency Check
These changes align with:
- The "Paid" badge already using Title Case
- "Unpaid" badge already using Title Case
- "All Paid" badge already using Title Case
- Memory guidance on UK English and label formatting standards

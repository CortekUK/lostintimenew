
# Make "Set Cost" Button More Prominent

## Summary
Update the "Set Cost" button styling to make it feel more actionable and prominent when the cost hasn't been set, drawing attention to the required action.

## Current State
The button uses `variant="ghost"` which makes it appear as subtle text, not clearly indicating that action is needed.

## Proposed Change

### File: `src/components/deposits/EditDepositOrderModal.tsx`

Change the button to use different styling based on whether cost is set:

| State | Current | Proposed |
|-------|---------|----------|
| Cost not set | Ghost button, plain "Set Cost" text | `outline` variant with amber/warning styling |
| Cost set | Ghost button with pencil icon | Keep subtle ghost variant |

**Code change (lines 168-179)**:
```tsx
{isCustom && (
  <Button
    variant={hasCost ? "ghost" : "outline"}
    size="sm"
    className={cn(
      "h-7 px-2 text-xs",
      !hasCost && "border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
    )}
    onClick={() => setEditingItem(item as DepositOrderItem)}
  >
    {hasCost ? (
      <><Pencil className="h-3 w-3 mr-1" /> Edit</>
    ) : (
      'Set Cost'
    )}
  </Button>
)}
```

## Visual Result
- **No cost**: Button has an amber/warning outline border, making it stand out as something that needs attention
- **Cost set**: Subtle ghost button with "Edit" text, since it's just for optional edits

## Files Modified
| File | Change |
|------|--------|
| `src/components/deposits/EditDepositOrderModal.tsx` | Update button variant and add conditional amber styling |


# Add Custom Item Cost Editing to Edit Deposit Order Modal

## Current State

The `EditDepositOrderModal` shows:
- Order items as a read-only summary with just names and prices
- Expected pickup date (editable)
- Order notes (editable)

Custom items cannot be edited from this modal - users must navigate to the full detail page.

## Proposed Enhancement

Add the ability to edit custom item costs directly within this modal by integrating with the existing `SetCustomItemCostModal`.

## Changes to EditDepositOrderModal.tsx

### 1. Add Visual Indicators for Custom Items

Show which items are custom orders and their cost status:
- Warning icon (amber) for custom items with no cost set
- Green checkmark for custom items with cost already set
- Display current cost for items that have one

### 2. Add "Set Cost" / "Edit" Button for Custom Items

Each custom item row will have a button to open the `SetCustomItemCostModal`:

```
Before:
┌─────────────────────────────────────────────┐
│ Order Items                                  │
│  Custom Diamond Pendant        £15,000      │
│  Order Total                   £15,000      │
└─────────────────────────────────────────────┘

After:
┌─────────────────────────────────────────────┐
│ Order Items                                  │
│  ⚠ Custom Diamond Pendant     £15,000 [Set Cost]
│     Custom • Cost: Not set                   │
│                                              │
│  Order Total                   £15,000      │
└─────────────────────────────────────────────┘
```

### 3. Import and Integrate SetCustomItemCostModal

- Add state to track which item is being edited
- Import the `SetCustomItemCostModal` component
- Import the `useUpdateDepositOrderItemCost` hook
- Handle save callback to update item costs

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/deposits/EditDepositOrderModal.tsx` | Add custom item cost editing UI and modal integration |

### Code Changes Summary

1. **New State Variables**:
   - `editingItem` - tracks the custom item being edited
   - `showCostModal` - controls SetCustomItemCostModal visibility

2. **New Imports**:
   - `SetCustomItemCostModal` component
   - `useUpdateDepositOrderItemCost` hook
   - `AlertCircle`, `Check` icons from lucide-react

3. **Enhanced Item Display**:
   - Detect `is_custom_order` flag on items
   - Show cost status (set/not set)
   - Add "Set Cost" or "Edit" button for custom items

4. **Modal Integration**:
   - Render `SetCustomItemCostModal` when editing
   - Handle save to update item cost via the hook
   - Refresh order data after successful update

## User Experience

1. Open "Edit Deposit Order" modal from list view
2. See custom items clearly marked with cost status
3. Click "Set Cost" on any custom item
4. SetCustomItemCostModal opens on top
5. Enter cost, category, description
6. Save - modal closes, item shows updated cost
7. Continue editing notes/date or save all changes


# Complete Custom Item Workflow for Deposit Orders

## Overview

This implementation creates a seamless workflow where custom/bespoke items in deposit orders are properly tracked from order creation through to sale completion, with accurate cost recording and automatic product creation.

## Current Problem

1. Custom items are created with `unit_cost: 0` because actual cost is unknown at order time
2. No way to update the cost once the item is sourced/made
3. When completed, sale records have `unit_cost: 0`, inflating profit and commission
4. Custom items don't become real products, creating gaps in inventory and sales tracking

## Solution Summary

**Phase 1**: Add ability to set/edit costs for custom items before completion
**Phase 2**: Validate costs before allowing completion (with warning option)
**Phase 3**: Automatically create product records for custom items upon completion
**Phase 4**: Navigate to sale detail page after completion for immediate verification

---

## Detailed Implementation

### 1. New Component: SetCustomItemCostModal

A modal to edit the cost of custom items after they've been sourced/manufactured.

**Location**: `src/components/deposits/SetCustomItemCostModal.tsx`

**Features**:
- Input for actual cost (whole numbers, no decimals per style guide)
- Shows sell price and calculates margin preview
- Optional category and description fields (for product creation)
- "Recording as [Staff Name]" attribution in footer
- Follows modal design standard with `font-luxury` title, separator, grouped sections

**UI Snippet**:
```
┌─────────────────────────────────────────────────────┐
│ Set Item Cost                                    [X]│
├─────────────────────────────────────────────────────┤
│ Item: Custom Diamond Pendant                        │
│ Sell Price: £15,000                                 │
│                                                     │
│ ┌─ Cost Details ──────────────────────────────────┐ │
│ │ Actual Cost*        [£ ________]                │ │
│ │ Category            [Select category      v]    │ │
│ │ Description         [________________________]  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Margin Preview: £7,000 (47%)                        │
│                                                     │
│ Recording as: Super              [Cancel] [Save]    │
└─────────────────────────────────────────────────────┘
```

### 2. Update DepositOrderDetail.tsx

Modify the order items display to show cost status and edit button for custom items.

**Changes**:
- Add warning icon (amber) next to custom items with £0 cost
- Add "Set Cost" button for custom items
- Show "Cost: £X" for items with costs already set
- State to manage which item is being edited

**Updated Item Row**:
```
┌─────────────────────────────────────────────────────┐
│ ⚠ Custom Diamond Pendant           £15,000         │
│   Custom │ Cost: Not set              [Set Cost]   │
├─────────────────────────────────────────────────────┤
│ ✓ Custom Gold Ring                    £8,000       │
│   Custom │ Cost: £4,500                   [Edit]   │
├─────────────────────────────────────────────────────┤
│   Vintage Rolex Submariner           £25,000       │
│   Item #00234 │ SKU: ROL-001                       │
└─────────────────────────────────────────────────────┘
```

### 3. New Hook: useUpdateDepositOrderItemCost

**Location**: Add to `src/hooks/useDepositOrders.ts`

**Function**:
```typescript
export function useUpdateDepositOrderItemCost() {
  return useMutation({
    mutationFn: async (params: {
      itemId: number;
      unit_cost: number;
      category?: string;
      description?: string;
    }) => {
      const { error } = await supabase
        .from('deposit_order_items')
        .update({ 
          unit_cost: params.unit_cost,
          // Store category/description for product creation
        })
        .eq('id', params.itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposit-order'] });
    }
  });
}
```

### 4. Database Schema Update

Add columns to `deposit_order_items` for storing additional product details:

```sql
ALTER TABLE deposit_order_items 
ADD COLUMN category text,
ADD COLUMN description text;
```

This allows capturing category and description at cost-setting time, which will be used when creating the product.

### 5. Update Complete Order Dialog

Add validation and warning for custom items without costs.

**Logic**:
```typescript
const customItemsWithoutCost = order.deposit_order_items?.filter(
  item => item.is_custom_order && (!item.unit_cost || item.unit_cost === 0)
) || [];

const hasUnsetCosts = customItemsWithoutCost.length > 0;
```

**Updated Dialog**:
- If no issues: Standard completion dialog
- If unset costs: Warning dialog with two options:
  - "Set Costs First" - Dismisses dialog to let user set costs
  - "Complete Anyway" - Proceeds with warning about inaccurate tracking

### 6. Update useCompleteDepositOrder - Product Creation

The most critical change - create real products for custom items during completion.

**Updated Flow in completion mutation**:

```typescript
// For each custom item, create a product
for (const item of order.deposit_order_items || []) {
  if (item.is_custom_order) {
    // Create product record
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({
        name: item.product_name,
        category: item.category || null,
        description: item.description || null,
        unit_cost: item.unit_cost || 0,
        unit_price: item.unit_price,
        supplier_id: null, // Or could be set if known
        is_trade_in: false,
        track_stock: true,
        location_id: order.location_id,
        internal_sku: '', // Auto-generated by trigger
      })
      .select()
      .single();

    if (productError) throw productError;

    // Create stock movement for receiving the item
    await supabase.from('stock_movements').insert({
      product_id: newProduct.id,
      quantity: item.quantity,
      movement_type: 'purchase',
      unit_cost: item.unit_cost,
      note: `Custom order from Deposit #${order.id}`,
      created_by: user.id,
    });

    // Create sale movement
    await supabase.from('stock_movements').insert({
      product_id: newProduct.id,
      quantity: item.quantity,
      movement_type: 'sale',
      related_sale_id: sale.id,
      note: `Sale #${sale.id}`,
      created_by: user.id,
    });

    // Update sale_item to reference the new product
    await supabase
      .from('sale_items')
      .update({ product_id: newProduct.id })
      .eq('sale_id', sale.id)
      .eq('product_name', item.product_name)
      .is('product_id', null);
  }
}
```

### 7. Update Navigation After Completion

Change post-completion navigation to go to sale detail page instead of deposits list.

**Current**: `navigate('/deposits')`
**Updated**: `navigate(`/sales/${sale.id}`)`

This requires returning the sale ID from the mutation and using it in the onSuccess callback.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/deposits/SetCustomItemCostModal.tsx` | Create | New modal for setting item costs |
| `src/pages/DepositOrderDetail.tsx` | Modify | Add cost status UI, edit buttons, completion validation |
| `src/hooks/useDepositOrders.ts` | Modify | Add useUpdateDepositOrderItemCost hook, update completion logic |
| Database migration | Create | Add category/description columns to deposit_order_items |

---

## User Workflow After Implementation

1. **Create Order**: Staff creates deposit order with custom item "Diamond Pendant" at £15,000 sell price
2. **Source Item**: Staff sources/makes the item, cost is £8,000
3. **Set Cost**: Return to order, click "Set Cost", enter £8,000 and optionally select category
4. **Record Payments**: Customer makes final payment, order shows "Fully Paid"
5. **Complete Order**: Click "Complete" - system validates costs are set
6. **Automatic Actions**:
   - Creates product "Diamond Pendant" with cost £8,000, price £15,000
   - Creates stock purchase movement
   - Creates sale record with proper cost data
   - Creates stock sale movement
   - Links sale item to new product
7. **Redirect**: User lands on Sale Detail page showing the completed transaction
8. **Commission**: Staff commission calculates correctly on £7,000 profit

---

## Benefits

- **Complete Audit Trail**: Every custom item becomes a trackable product
- **Accurate Commission**: Based on real profit, not inflated figures
- **Inventory Consistency**: All sold items have product records for reporting
- **Clear Workflow**: Visual indicators guide staff through cost entry
- **Flexible**: Can complete without cost if truly needed (with warning)

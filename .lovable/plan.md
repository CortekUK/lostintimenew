
# Add Line-Item Price Editing at Checkout

## Current Behavior
- Products are added to the cart at their catalog `unit_price`
- Users can only apply global discounts (percentage or fixed) to reduce prices
- No way to increase prices or adjust individual line items

## Proposed Solution
Add a click-to-edit price feature for each item in the shopping cart, allowing staff to:
- Increase prices (for premium service, negotiation, etc.)
- Decrease prices per item (as an alternative to global discount)
- See original price alongside adjusted price for transparency

## User Experience
- Each cart item will show the current price with a small edit (pencil) icon
- Clicking the price or icon opens an inline input to edit
- If price differs from catalog price, show the original price crossed out
- Visual indicators: price increases in blue, decreases in green

## Technical Implementation

### 1. Update ShoppingCart Component Props
Add a new callback for price updates:
```typescript
interface ShoppingCartProps {
  // ... existing props
  onUpdateItemPrice?: (productId: number, newPrice: number) => void;
}
```

### 2. Add Inline Price Editor UI
For each cart item in `ShoppingCartComponent`:
- Replace static price display with an editable component
- Show original price (struck through) when price has been modified
- Use `CurrencyInput` component for consistent formatting

### 3. Update EnhancedSales Page
Add handler function to update cart item prices:
```typescript
const updateItemPrice = (productId: number, newPrice: number) => {
  setCart(cart.map(item =>
    item.product.id === productId
      ? { ...item, unit_price: newPrice }
      : item
  ));
};
```

### 4. Visual Design
- Original price: Small, struck-through, muted color
- Adjusted price: Primary color, editable
- Price increase indicator: Blue text or badge
- Price decrease indicator: Green text (like discount)

## Files to Modify

| File | Change |
|------|--------|
| `src/components/pos/ShoppingCart.tsx` | Add `onUpdateItemPrice` prop, inline price editing UI, original vs adjusted price display |
| `src/pages/EnhancedSales.tsx` | Add `updateItemPrice` handler, pass to ShoppingCart |

## Edge Cases Handled
- Prevent negative prices (minimum £0)
- No maximum limit (allows premium pricing)
- Price changes properly flow to checkout totals
- Original catalog price preserved for reference

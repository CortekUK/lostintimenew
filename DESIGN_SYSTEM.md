# Lost in Time - Design System

This document establishes the styling standards for the application to ensure visual consistency throughout.

---

## Color Usage

### Semantic Color Tokens

All colors must use CSS variables defined in `index.css`. Never use hardcoded hex values in components.

| Purpose | Class | Usage |
|---------|-------|-------|
| Primary brand (gold) | `text-primary` | Primary action buttons, important currency values, branding |
| Muted/secondary | `text-muted-foreground` | Section header icons, secondary text, labels |
| Success (positive) | `text-success` | Profit values, positive changes, success states |
| Destructive (negative) | `text-destructive` | Loss values, negative changes, errors, delete actions |
| Warning | `text-warning` | Alerts, pending states, caution indicators |
| Foreground | `text-foreground` | Primary body text, headings |

### Icon Colors

| Context | Color Class | Example |
|---------|-------------|---------|
| Section/card headers | `text-muted-foreground` | `<Package className="h-5 w-5 text-muted-foreground" />` |
| KPI card icons | `text-muted-foreground` | Revenue, profit, stock icons |
| Primary actions | `text-primary` | Only when icon IS the action |
| Status indicators | Semantic colors | Success/warning/destructive based on state |

### Currency Values

| Context | Color Class |
|---------|-------------|
| Primary amounts (price, total) | `text-primary` |
| Profit/positive values | `text-success` |
| Loss/negative values | `text-destructive` |
| Neutral/secondary amounts | `text-foreground` or `text-muted-foreground` |

---

## Button Variants

Use the appropriate button variant based on action type:

| Variant | Usage | Example Actions |
|---------|-------|-----------------|
| `premium` | Primary CTA, main actions | Add Product, Create Sale, Submit |
| `default` | Standard primary actions | Save, Confirm |
| `outline` | Secondary actions | Export, Filter, Cancel |
| `ghost` | Navigation, subtle actions | View, Edit (in tables) |
| `destructive` | Dangerous actions | Delete, Void, Remove |
| `link` | Inline text links | Learn more, View details |

### Button Sizing

| Context | Size |
|---------|------|
| Page header actions | `default` or `sm` |
| Table row actions | `sm` or `icon` |
| Modal actions | `default` |
| Inline actions | `sm` |

---

## Badge Variants

### Standard Variants (in badge.tsx)

| Variant | Usage | Appearance |
|---------|-------|------------|
| `default` | Primary status, active | Gold background |
| `secondary` | Neutral status | Gray background |
| `destructive` | Error, voided, deleted | Red background |
| `outline` | Subtle, bordered | Transparent with border |
| `customer` | Customer type indicator | Custom styling |

### Status-Specific Badges

| Status | Styling Pattern |
|--------|-----------------|
| Trade-in / Part Exchange | `bg-blue-500/10 text-blue-600 border-blue-500/50` |
| Consignment | `bg-amber-500/10 text-amber-600 border-amber-500/50` |
| Registered Watch | `bg-green-500/10 text-green-600 border-green-500/50` |
| Sold | `bg-muted text-muted-foreground` |
| In Stock | `bg-success/10 text-success` |

---

## Spacing Scale

### Standard Spacing Values

| Token | Value | Usage |
|-------|-------|-------|
| `gap-2` | 8px | Tight inline elements, icon + text |
| `gap-3` | 12px | List items, compact sections |
| `gap-4` | 16px | Standard section spacing |
| `gap-6` | 24px | Major section divisions |

### Card Padding

| Context | Classes |
|---------|---------|
| Standard cards | `p-4 md:p-6` |
| Compact cards | `p-4` |
| Dense tables | `p-3` or `p-4` |
| Modal content | `p-4 md:p-6` |

### Content Spacing

| Context | Classes |
|---------|---------|
| Section content | `space-y-4` |
| Dense lists | `space-y-2` |
| Form fields | `space-y-4` |
| Major sections | `space-y-6` |

---

## Icon Sizing

### Standard Sizes

| Context | Size Classes |
|---------|--------------|
| Inline with text | `h-4 w-4` |
| Section headers | `h-5 w-5` |
| KPI cards | `h-8 w-8` or `h-10 w-10` |
| Empty states | `h-12 w-12` or `h-16 w-16` |
| Large decorative | `h-20 w-20` |

### Icon Containers

Standard icon container pattern:
```tsx
<div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
  <Icon className="h-5 w-5 text-muted-foreground" />
</div>
```

For KPI cards:
```tsx
<div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
  <Icon className="h-6 w-6 text-muted-foreground" />
</div>
```

---

## Typography

### Headings

| Element | Classes |
|---------|---------|
| Page title | `text-2xl md:text-3xl font-bold tracking-tight` |
| Section title | `text-lg font-semibold` |
| Card title | `text-base font-medium` |
| Subsection | `text-sm font-medium` |

### Body Text

| Context | Classes |
|---------|---------|
| Primary body | `text-sm text-foreground` |
| Secondary/muted | `text-sm text-muted-foreground` |
| Small labels | `text-xs text-muted-foreground` |
| Currency large | `text-2xl font-bold text-primary` |

---

## Border Radius

| Context | Classes |
|---------|---------|
| Cards | `rounded-lg` (default from Card component) |
| Buttons | `rounded-md` (default from Button component) |
| Badges | `rounded-full` or `rounded-md` |
| Avatar/icons | `rounded-full` |
| Inputs | `rounded-md` |

---

## Shadows

| Context | Classes |
|---------|---------|
| Cards | Default from Card component |
| Elevated cards | `shadow-md` |
| Dropdowns | `shadow-lg` |
| Modals | `shadow-xl` |

---

## Dark Mode Considerations

All color tokens automatically support dark mode via CSS variables. When adding custom colors:

```tsx
// ✅ Correct - uses semantic tokens
className="bg-muted text-muted-foreground"

// ✅ Correct - explicit dark mode variant
className="bg-blue-500/10 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"

// ❌ Incorrect - hardcoded colors without dark variant
className="bg-[#D4AF37]"
```

---

## Component Patterns

### Section Header

```tsx
<div className="flex items-center gap-2">
  <Icon className="h-5 w-5 text-muted-foreground" />
  <h2 className="text-lg font-semibold">Section Title</h2>
</div>
```

### KPI Card

```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Metric Label
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold text-primary">£1,234</p>
        <p className="text-xs text-muted-foreground">+12% from last period</p>
      </div>
    </div>
  </CardContent>
</Card>
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
    <Icon className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-medium mb-1">No items found</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Get started by creating your first item.
  </p>
  <Button variant="premium">Add Item</Button>
</div>
```

---

## Checklist for New Components

When creating new components, verify:

- [ ] Icons use `text-muted-foreground` for headers/decorative
- [ ] Currency values use `text-primary` (not hardcoded hex)
- [ ] Primary actions use `variant="premium"`
- [ ] Spacing follows the standard scale (gap-2, gap-4, gap-6)
- [ ] Card padding uses `p-4 md:p-6` pattern
- [ ] Colors support dark mode via tokens or explicit variants
- [ ] Badge variants match the established patterns

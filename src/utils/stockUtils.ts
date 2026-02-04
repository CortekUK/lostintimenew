/**
 * Centralized utilities for stock data consistency
 */

export interface StockStatusResult {
  variant: 'destructive' | 'secondary' | 'outline' | 'default';
  text: string;
  color: string;
}

/**
 * Get standardized stock status for display
 */
export function getStockStatus(qty: number, reorderThreshold = 0): StockStatusResult {
  if (qty === 0) {
    return { 
      variant: 'destructive', 
      text: 'Out of Stock', 
      color: 'text-destructive' 
    };
  }
  
  if (qty <= reorderThreshold) {
    return { 
      variant: 'secondary', 
      text: 'Low Stock', 
      color: 'text-warning' 
    };
  }
  
  return { 
    variant: 'outline', 
    text: 'In Stock', 
    color: 'text-success' 
  };
}

/**
 * Format stock quantity for display
 */
export function formatStockQuantity(qty: number): string {
  return qty.toString();
}

/**
 * Calculate profit and markup from prices
 * Markup = (Profit / Cost) * 100 - standard retail industry metric
 */
export function calculateProfitMetrics(unitPrice: number, unitCost: number) {
  const profit = unitPrice - unitCost;
  const markup = unitCost > 0 ? ((profit / unitCost) * 100) : 0;
  
  return {
    profit: profit.toFixed(2),
    markup: markup.toFixed(1)
  };
}

/**
 * Ensure product has flattened stock and inventory data
 */
export function normalizeProductStockData(product: any, stockData?: any, inventoryData?: any) {
  // Use explicit null/undefined checks - 0 is a valid stock value!
  const qty_on_hand = stockData?.qty_on_hand !== undefined && stockData?.qty_on_hand !== null 
    ? stockData.qty_on_hand 
    : (product.qty_on_hand ?? 0);
  const inventory_value = inventoryData?.inventory_value !== undefined && inventoryData?.inventory_value !== null
    ? inventoryData.inventory_value
    : (product.inventory_value ?? 0);
  const avg_cost = inventoryData?.avg_cost !== undefined && inventoryData?.avg_cost !== null
    ? inventoryData.avg_cost
    : (product.avg_cost ?? product.unit_cost ?? 0);
  
  return {
    ...product,
    qty_on_hand,
    inventory_value,
    avg_cost,
    // Keep nested structure for backward compatibility
    stock: {
      qty_on_hand,
      inventory_value
    }
  };
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Payment method formatting (centralised for consistency)
export function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    transfer: 'Bank Transfer',
    bank_transfer: 'Bank Transfer',
    check: 'Cheque',
    cheque: 'Cheque',
    other: 'Other',
  };
  return methods[method?.toLowerCase()] || method?.charAt(0).toUpperCase() + method?.slice(1) || 'Unknown';
}

// Currency formatting
export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Number formatting  
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Percentage formatting
export function formatPercentage(value: number, decimals = 1): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

// Date formatting
export function formatDate(date: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'numeric',
        year: '2-digit',
      });
    case 'long':
      return dateObj.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    default:
      return dateObj.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  }
}

// Date and time formatting
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
}

// Time formatting
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
}

// Date range period types
export type DateRangePeriod = 
  | 'today' 
  | 'week' 
  | 'month' 
  | '7d' 
  | '30d'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'last-quarter'
  | 'this-year'
  | 'last-year'
  | 'all-time';

// Get date range for common periods
export function getDateRange(period: DateRangePeriod): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  switch (period) {
    case 'today':
      return { from: formatDate(today), to: formatDate(today) };
    
    case 'week':
    case 'this-week': {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      return { from: formatDate(startOfWeek), to: formatDate(today) };
    }
    
    case 'last-week': {
      const dayOfWeek = today.getDay();
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - dayOfWeek);
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);
      return { from: formatDate(startOfLastWeek), to: formatDate(endOfLastWeek) };
    }
    
    case 'month':
    case 'this-month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatDate(startOfMonth), to: formatDate(today) };
    }
    
    case 'last-month': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: formatDate(startOfLastMonth), to: formatDate(endOfLastMonth) };
    }
    
    case 'this-quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      return { from: formatDate(startOfQuarter), to: formatDate(today) };
    }
    
    case 'last-quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfLastQuarter = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      const endOfLastQuarter = new Date(now.getFullYear(), quarter * 3, 0);
      return { from: formatDate(startOfLastQuarter), to: formatDate(endOfLastQuarter) };
    }
    
    case 'this-year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { from: formatDate(startOfYear), to: formatDate(today) };
    }
    
    case 'last-year': {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      return { from: formatDate(startOfLastYear), to: formatDate(endOfLastYear) };
    }
    
    case 'all-time':
      return { from: '2000-01-01', to: formatDate(today) };
    
    case '7d': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return { from: formatDate(sevenDaysAgo), to: formatDate(today) };
    }
    
    case '30d': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return { from: formatDate(thirtyDaysAgo), to: formatDate(today) };
    }
    
    default:
      return { from: formatDate(today), to: formatDate(today) };
  }
}

// Number validation
export function isValidNumber(value: string | number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && isFinite(num);
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation (basic UK format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(?:(?:\+44\s?|0)(?:\d{2}\s?\d{4}\s?\d{4}|\d{3}\s?\d{3}\s?\d{4}|\d{4}\s?\d{3}\s?\d{3}))$/;
  return phoneRegex.test(phone);
}

// Generate random ID for temporary use
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Extract individual seller info from description
export function extractIndividualSeller(description: string | null): string | null {
  if (!description) return null;
  
  const match = description.match(/^Individual:\s*(.+?)(?:\n|$)/);
  return match ? match[1].trim() : null;
}

// Get cleaned description without individual seller info
export function getCleanedDescription(description: string | null): string | null {
  if (!description) return null;
  
  // Remove the "Individual: [Name]" part from the beginning
  const cleaned = description.replace(/^Individual:\s*.+?(?:\n|$)/, '').trim();
  return cleaned || null;
}

// Get supplier display name (registered supplier, individual seller, or fallback)
export function getSupplierDisplayName(product: any): string {
  // First check for registered supplier
  if (product.supplier?.name) {
    return product.supplier.name;
  }
  
  // Then check for individual seller in description
  const individualSeller = extractIndividualSeller(product.description);
  if (individualSeller) {
    return `${individualSeller} (Ind.)`;
  }
  
  return 'No supplier';
}

// Calculate markup percentage (profit / cost * 100)
// This is the standard jewellery industry metric
export function calculateMarkup(sellPrice: number, cost: number): number {
  if (cost <= 0) return 0;
  return ((sellPrice - cost) / cost) * 100;
}

// Calculate cart totals
export function calculateCartTotals(items: Array<{
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
}>): {
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discount_total = items.reduce((sum, item) => sum + item.discount, 0);
  const taxable_amount = subtotal - discount_total;
  const tax_total = items.reduce((sum, item) => {
    const item_subtotal = item.quantity * item.unit_price;
    const item_discount = item.discount;
    const taxable_item_amount = item_subtotal - item_discount;
    return sum + (taxable_item_amount * (item.tax_rate / 100));
  }, 0);
  
  return {
    subtotal,
    tax_total,
    discount_total,
    total: subtotal + tax_total - discount_total,
  };
}

export interface CSVParseResult<T = any> {
  ok: boolean;
  rows: T[];
  errors: string[];
  headers: string[];
}

export function toCSV(rows: any[], headers?: string[]): string {
  if (!rows || rows.length === 0) return '';

  const finalHeaders = headers || Object.keys(rows[0]);
  
  // Escape and quote CSV values
  const escapeValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = finalHeaders.map(escapeValue).join(',');
  const dataRows = rows.map(row => 
    finalHeaders.map(header => escapeValue(row[header])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

export function fromCSV<T = any>(
  text: string, 
  expectedHeaders?: string[],
  typeCoercion?: Record<string, (value: string) => any>
): CSVParseResult<T> {
  const errors: string[] = [];
  const rows: T[] = [];

  if (!text.trim()) {
    return { ok: false, rows: [], errors: ['CSV content is empty'], headers: [] };
  }

  try {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return { ok: false, rows: [], errors: ['No data found'], headers: [] };
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    if (headers.length === 0) {
      return { ok: false, rows: [], errors: ['No headers found'], headers: [] };
    }

    // Validate headers if expected headers provided
    if (expectedHeaders) {
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = parseCSVLine(line);
        const row: any = {};

        headers.forEach((header, index) => {
          let value = values[index] || '';
          
          // Apply type coercion if provided
          if (typeCoercion && typeCoercion[header]) {
            try {
              value = typeCoercion[header](value);
            } catch (err) {
              errors.push(`Row ${i}: Invalid ${header} value "${value}"`);
              return;
            }
          }

          row[header] = value;
        });

        rows.push(row as T);
      } catch (err) {
        errors.push(`Row ${i}: ${err instanceof Error ? err.message : 'Parse error'}`);
      }
    }

    return {
      ok: errors.length === 0,
      rows,
      errors,
      headers
    };
  } catch (err) {
    return {
      ok: false,
      rows: [],
      errors: [`Parse error: ${err instanceof Error ? err.message : 'Unknown error'}`],
      headers: []
    };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  result.push(current.trim());
  return result;
}

// Product-specific CSV utilities
export const productCSVHeaders = [
  'sku', 'name', 'category', 'material', 'size', 'color', 
  'supplier_name', 'unit_cost', 'unit_price', 'tax_rate', 'track_stock'
];

export const supplierCSVHeaders = [
  'name', 'contact_name', 'phone', 'email', 'notes'
];

export const expenseCSVHeaders = [
  'incurred_at', 'category', 'description', 'amount', 'supplier_name', 'is_cogs'
];

export const productTypeCoercion = {
  unit_cost: (val: string) => parseFloat(val) || 0,
  unit_price: (val: string) => parseFloat(val) || 0,
  tax_rate: (val: string) => parseFloat(val) || 0,
  track_stock: (val: string) => val.toLowerCase() === 'true' || val === '1'
};

export const expenseTypeCoercion = {
  amount: (val: string) => parseFloat(val) || 0,
  is_cogs: (val: string) => val.toLowerCase() === 'true' || val === '1',
  incurred_at: (val: string) => val ? new Date(val).toISOString() : new Date().toISOString()
};

// Enhanced CSV export functions
export function formatCurrency(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

export function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function arrayToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) return headers.join(',');
  
  const headerRow = headers.map(escapeCSVField).join(',');
  const dataRows = data.map(row => 
    headers.map(header => escapeCSVField(row[header])).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Transactions CSV export
export function exportTransactionsCSV(transactionsData: any[], filename: string = 'transactions.csv'): void {
  const csvData = transactionsData.map(transaction => ({
    sold_at: formatDateTime(transaction.sold_at),
    sale_id: transaction.id,
    items_count: transaction.sale_items?.length || 0,
    subtotal: formatCurrency(Number(transaction.subtotal) || 0),
    discount: formatCurrency(Number(transaction.discount_total) || 0),
    tax: formatCurrency(Number(transaction.tax_total) || 0),
    total: formatCurrency(Number(transaction.total) || 0),
    payment: transaction.payment,
    staff_name: transaction.profiles?.full_name || 'Unknown'
  }));

  const headers = [
    'sold_at', 'sale_id', 'items_count', 'subtotal', 'discount', 'tax', 'total', 'payment', 'staff_name'
  ];

  const csvContent = arrayToCSV(csvData, headers);
  downloadCSV(csvContent, filename);
}

// Enhanced sold items CSV export
export function exportSoldItemsCSV(soldItemsData: any[], filename: string = 'sold-items.csv'): void {
  const csvData = soldItemsData.map(item => ({
    sold_at: formatDateTime(item.sold_at),
    sale_id: item.sale_id,
    sale_item_id: item.sale_item_id,
    product_id: item.product_id,
    product_name: item.products?.name || 'Unknown Product',
    internal_sku: item.products?.internal_sku || '',
    sku: item.products?.sku || '',
    supplier_name: item.products?.supplier?.name || '',
    category: item.products?.category || '',
    material: item.products?.material || '',
    qty: item.quantity,
    unit_price: formatCurrency(Number(item.unit_price) || 0),
    discount: formatCurrency(Number(item.discount) || 0),
    line_revenue: formatCurrency(Number(item.line_revenue) || 0),
    line_cogs: formatCurrency(Number(item.line_cogs) || 0),
    line_gross_profit: formatCurrency(Number(item.line_gross_profit) || 0),
    staff_name: item.sales?.profiles?.full_name || 'Unknown',
    is_trade_in: item.products?.is_trade_in ? 'Yes' : 'No',
    is_consignment: item.products?.is_consignment ? 'Yes' : 'No'
  }));

  const headers = [
    'sold_at', 'sale_id', 'sale_item_id', 'product_id', 'product_name', 'internal_sku', 'sku', 
    'supplier_name', 'category', 'material', 'qty', 'unit_price', 'discount', 'line_revenue', 
    'line_cogs', 'line_gross_profit', 'staff_name', 'is_trade_in', 'is_consignment'
  ];

  const csvContent = arrayToCSV(csvData, headers);
  downloadCSV(csvContent, filename);
}

// Legacy sales history export (for compatibility)
export function exportSalesHistoryCSV(salesData: any[], filename: string = 'sales-history.csv'): void {
  exportTransactionsCSV(salesData, filename);
}
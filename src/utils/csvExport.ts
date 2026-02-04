// CSV Export Utilities for Sales Data

export const formatCurrency = (amount: number): string => {
  return `£${amount.toFixed(2)}`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

export const escapeCSVField = (field: any): string => {
  if (field === null || field === undefined) return '';
  
  const stringField = String(field);
  
  // If field contains comma, newline, or quote, wrap in quotes and escape existing quotes
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  
  return stringField;
};

export const arrayToCSV = (data: any[], headers: string[]): string => {
  const csvHeaders = headers.map(escapeCSVField).join(',');
  const csvRows = data.map(row => 
    headers.map(header => escapeCSVField(row[header])).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Sales History CSV Export
export const exportSalesHistoryCSV = (salesData: any[], filename: string = 'sales-history.csv'): void => {
  const headers = [
    'saleId',
    'date',
    'time', 
    'itemCount',
    'subtotal',
    'tax',
    'discount',
    'total',
    'paymentMethod',
    'staffName',
    'customerNotes'
  ];
  
  const csvData = salesData.map(sale => ({
    saleId: sale.id,
    date: formatDate(sale.sold_at),
    time: new Date(sale.sold_at).toLocaleTimeString(),
    itemCount: sale.items?.length || 0,
    subtotal: formatCurrency(Number(sale.subtotal)),
    tax: formatCurrency(Number(sale.tax_total)),
    discount: formatCurrency(Number(sale.discount_total)),
    total: formatCurrency(Number(sale.total)),
    paymentMethod: sale.payment,
    staffName: sale.staff?.full_name || 'Unknown',
    customerNotes: sale.notes || ''
  }));
  
  const csvContent = arrayToCSV(csvData, headers);
  downloadCSV(csvContent, filename);
};

// Sold Items CSV Export
export const exportSoldItemsCSV = (soldItemsData: any[], filename: string = 'sold-items.csv'): void => {
  const headers = [
    'saleDate',
    'saleId',
    'productName',
    'internalSku',
    'sku',
    'serial',
    'supplier',
    'category',
    'material',
    'size',
    'quantity',
    'unitPrice',
    'discount',
    'lineRevenue',
    'lineCost',
    'grossProfit',
    'profitMargin',
    'staffName',
    'flags'
  ];
  
  const csvData = soldItemsData.map((item: any) => {
    const margin = item.line_revenue > 0 ? ((item.line_gross_profit / item.line_revenue) * 100).toFixed(1) : '0';
    const flags = [];
    if (item?.products?.is_consignment) flags.push('Consignment');
    if (item?.products?.is_trade_in) flags.push('Part Exchange');
    if (item?.products?.is_registered) flags.push('Registered');
    
    return {
      saleDate: formatDate(item.sold_at),
      saleId: item.sale_id,
      productName: item?.products?.name || '',
      internalSku: item?.products?.internal_sku || '',
      sku: item?.products?.sku || '',
      serial: item?.serial || '',
      supplier: item?.supplier_name || item?.supplier?.name || '',
      category: item?.products?.category || '',
      material: item?.products?.material || '',
      size: item?.products?.size || '',
      quantity: item.quantity,
      unitPrice: formatCurrency(item.unit_price),
      discount: formatCurrency(item.discount),
      lineRevenue: formatCurrency(item.line_revenue),
      lineCost: formatCurrency(item.line_cogs),
      grossProfit: formatCurrency(item.line_gross_profit),
      profitMargin: `${margin}%`,
      staffName: item?.sales?.profiles?.full_name || '',
      flags: flags.join(', ')
    };
  });
  
  const csvContent = arrayToCSV(csvData, headers);
  downloadCSV(csvContent, filename);
};

// Transactions CSV export for new Transactions page
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
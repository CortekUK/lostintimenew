import { formatCurrency, formatDateTime } from '@/lib/utils';

interface ReceiptExportData {
  sale: {
    id: number;
    sold_at: string;
    payment: string;
    subtotal: number;
    tax_total: number;
    discount_total: number;
    total: number;
    part_exchange_total?: number;
    notes?: string;
    customer_email?: string;
  };
  items: Array<{
    product: {
      name: string;
      internal_sku?: string;
      sku?: string;
    };
    quantity: number;
    unit_price: number;
  }>;
  partExchanges: Array<{
    product_name: string;
    allowance: number;
    customer_name?: string;
  }>;
  staff?: {
    full_name: string;
  };
}

export function exportReceiptCSV(data: ReceiptExportData, storeName: string = 'Sourced Clothing') {
  const { sale, items, partExchanges, staff } = data;
  
  // Create CSV header
  const headers = [
    'Store Name',
    'Receipt Number',
    'Date & Time',
    'Staff Member',
    'Payment Method',
    'Item/Description',
    'SKU',
    'Quantity',
    'Unit Price',
    'Line Total',
    'Type'
  ];

  // Create rows for items
  const rows: string[][] = [];
  
  items.forEach((item, index) => {
    const lineTotal = item.quantity * item.unit_price;
    rows.push([
      index === 0 ? storeName : '',
      index === 0 ? `#${sale.id}` : '',
      index === 0 ? formatDateTime(sale.sold_at) : '',
      index === 0 ? (staff?.full_name || 'Unknown') : '',
      index === 0 ? sale.payment.toUpperCase() : '',
      item.product.name,
      item.product.internal_sku || item.product.sku || 'N/A',
      item.quantity.toString(),
      formatCurrency(item.unit_price),
      formatCurrency(lineTotal),
      'Sale Item'
    ]);
  });

  // Add part exchanges
  partExchanges.forEach((px) => {
    rows.push([
      '', '', '', '', '',
      `Part Exchange - ${px.product_name}`,
      'N/A',
      '1',
      formatCurrency(-px.allowance),
      formatCurrency(-px.allowance),
      'Part Exchange'
    ]);
  });

  // Add totals section
  rows.push(['', '', '', '', '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '', 'Subtotal:', formatCurrency(sale.subtotal), '']);
  
  if (sale.discount_total > 0) {
    rows.push(['', '', '', '', '', '', '', '', 'Discount:', formatCurrency(-sale.discount_total), '']);
  }
  
  if (sale.tax_total > 0) {
    rows.push(['', '', '', '', '', '', '', '', 'Tax:', formatCurrency(sale.tax_total), '']);
  }
  
  if (sale.part_exchange_total && sale.part_exchange_total > 0) {
    rows.push(['', '', '', '', '', '', '', '', 'Part Exchange:', formatCurrency(-sale.part_exchange_total), '']);
  }
  
  const netTotal = sale.total - (sale.part_exchange_total || 0);
  rows.push(['', '', '', '', '', '', '', '', 'Net Total:', formatCurrency(netTotal), '']);

  // Add notes if present
  if (sale.notes) {
    rows.push(['', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Notes:', sale.notes, '', '', '', '', '', '', '', '', '']);
  }

  // Add customer email if present
  if (sale.customer_email) {
    rows.push(['Customer Email:', sale.customer_email, '', '', '', '', '', '', '', '', '']);
  }

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `receipt_${sale.id}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportMultipleReceiptsCSV(
  receipts: ReceiptExportData[],
  storeName: string = 'Sourced Clothing',
  startDate?: string,
  endDate?: string
) {
  const headers = [
    'Receipt Number',
    'Date & Time',
    'Staff Member',
    'Payment Method',
    'Item Count',
    'Subtotal',
    'Tax',
    'Discount',
    'Part Exchange',
    'Net Total',
    'Customer Email'
  ];

  const rows = receipts.map(receipt => {
    const { sale, items, staff } = receipt;
    const netTotal = sale.total - (sale.part_exchange_total || 0);
    
    return [
      `#${sale.id}`,
      formatDateTime(sale.sold_at),
      staff?.full_name || 'Unknown',
      sale.payment.toUpperCase(),
      items.length.toString(),
      formatCurrency(sale.subtotal),
      formatCurrency(sale.tax_total),
      formatCurrency(sale.discount_total),
      formatCurrency(sale.part_exchange_total || 0),
      formatCurrency(netTotal),
      sale.customer_email || ''
    ];
  });

  const csvContent = [
    ['Sales Report', storeName].join(','),
    startDate && endDate ? [`Period: ${startDate} to ${endDate}`, ''].join(',') : '',
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].filter(line => line).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const filename = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

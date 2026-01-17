import { format } from 'date-fns';

interface PartExchangeExportRow {
  id: number;
  sale_id: number;
  title: string;
  category: string | null;
  serial: string | null;
  customer_name: string | null;
  customer_contact: string | null;
  allowance: number;
  notes: string | null;
  created_at: string;
  status: string;
}

export const exportPartExchangesToCSV = (data: PartExchangeExportRow[], filename?: string) => {
  const headers = [
    'Title',
    'Category',
    'Serial/SKU',
    'Customer',
    'Contact',
    'Trade-in Value',
    'Sale ID',
    'Created Date',
    'Status',
    'Notes',
  ];

  const rows = data.map((px) => [
    px.title || '',
    px.category || '',
    px.serial || '',
    px.customer_name || '',
    px.customer_contact || '',
    px.allowance.toFixed(2),
    px.sale_id.toString(),
    format(new Date(px.created_at), 'yyyy-MM-dd HH:mm'),
    px.status,
    (px.notes || '').replace(/"/g, '""'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `trade-ins-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

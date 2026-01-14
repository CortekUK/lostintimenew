import { toCSV } from '@/utils/csvUtils';

export interface StaffCommissionData {
  staffId: string;
  staffName: string;
  salesCount: number;
  revenue: number;
  profit: number;
  commission: number;
}

export function exportCommissionCSV(
  data: StaffCommissionData[],
  dateRange: { from: string; to: string },
  commissionRate: number,
  commissionBasis: 'revenue' | 'profit',
  filename: string
) {
  const formattedData = data.map(row => ({
    'Staff Member': row.staffName,
    'Sales Count': row.salesCount,
    'Revenue': `£${row.revenue.toFixed(2)}`,
    'Gross Profit': `£${row.profit.toFixed(2)}`,
    'Commission Rate': `${commissionRate}%`,
    'Commission Basis': commissionBasis === 'profit' ? 'Gross Profit' : 'Revenue',
    'Commission Owed': `£${row.commission.toFixed(2)}`
  }));

  // Add summary row
  const totals = data.reduce(
    (acc, row) => ({
      salesCount: acc.salesCount + row.salesCount,
      revenue: acc.revenue + row.revenue,
      profit: acc.profit + row.profit,
      commission: acc.commission + row.commission
    }),
    { salesCount: 0, revenue: 0, profit: 0, commission: 0 }
  );

  formattedData.push({
    'Staff Member': 'TOTAL',
    'Sales Count': totals.salesCount,
    'Revenue': `£${totals.revenue.toFixed(2)}`,
    'Gross Profit': `£${totals.profit.toFixed(2)}`,
    'Commission Rate': '',
    'Commission Basis': '',
    'Commission Owed': `£${totals.commission.toFixed(2)}`
  });

  const csv = toCSV(formattedData);
  const periodInfo = dateRange.from && dateRange.to 
    ? `Period: ${dateRange.from} to ${dateRange.to}\n` 
    : 'Period: All time\n';
  const csvWithHeader = periodInfo + csv;

  const blob = new Blob([csvWithHeader], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

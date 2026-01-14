import { toCSV } from '@/utils/csvUtils';
import { format } from 'date-fns';
import type { CommissionPayment } from '@/hooks/useCommissionPayments';

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

  downloadCSV(csvWithHeader, filename);
}

export function exportCommissionPaymentsCSV(
  payments: CommissionPayment[],
  filename: string
) {
  const formattedData = payments.map(payment => ({
    'Date': format(new Date(payment.paid_at), 'dd/MM/yyyy'),
    'Staff Member': payment.staff?.full_name || payment.staff?.email || 'Unknown',
    'Period Start': format(new Date(payment.period_start), 'dd/MM/yyyy'),
    'Period End': format(new Date(payment.period_end), 'dd/MM/yyyy'),
    'Sales Count': payment.sales_count,
    'Revenue': `£${Number(payment.revenue_total).toFixed(2)}`,
    'Profit': `£${Number(payment.profit_total).toFixed(2)}`,
    'Commission Rate': `${payment.commission_rate}%`,
    'Commission Basis': payment.commission_basis === 'profit' ? 'Gross Profit' : 'Revenue',
    'Amount Paid': `£${Number(payment.commission_amount).toFixed(2)}`,
    'Payment Method': payment.payment_method.replace('_', ' '),
    'Paid By': payment.paid_by_profile?.full_name || 'Unknown',
    'Notes': payment.notes || ''
  }));

  const csv = toCSV(formattedData);
  downloadCSV(csv, filename);
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

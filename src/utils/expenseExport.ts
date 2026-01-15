import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExpenseExportData {
  expenses: any[];
  summary: {
    thisMonthTotal: number;
    thisYearTotal: number;
    averageMonthly: number;
    totalRecords: number;
  };
  largestExpense?: any;
  yoyComparison?: {
    thisYear: number;
    lastYear: number;
    percentageChange: number;
  };
  periodLabel?: string;
}

export const generateExpenseCSV = (expenses: any[], periodLabel?: string) => {
  const headers = [
    'Date',
    'Description',
    'Category',
    'Supplier',
    'Amount',
    'VAT Rate',
    'Amount (Ex VAT)',
    'VAT Amount',
    'Amount (Inc VAT)',
    'Payment Method',
    'Type',
    'Staff',
  ];

  const rows = expenses.map(expense => [
    new Date(expense.incurred_at).toLocaleDateString(),
    expense.description || '',
    expense.category || '',
    expense.supplier?.name || '',
    Number(expense.amount).toFixed(2),
    expense.vat_rate ? `${expense.vat_rate}%` : 'N/A',
    expense.amount_ex_vat ? Number(expense.amount_ex_vat).toFixed(2) : 'N/A',
    expense.vat_amount ? Number(expense.vat_amount).toFixed(2) : 'N/A',
    expense.amount_inc_vat ? Number(expense.amount_inc_vat).toFixed(2) : 'N/A',
    expense.payment_method || '',
    expense.is_cogs ? 'COGS' : 'Operating',
    expense.staff?.full_name || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const periodSuffix = periodLabel ? `-${periodLabel.toLowerCase().replace(/\s+/g, '-')}` : '';
  link.download = `expenses${periodSuffix}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const generateExpensePDF = async (data: ExpenseExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const title = data.periodLabel ? `Expense Report - ${data.periodLabel}` : 'Expense Report';
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const summaryData = [
    ['This Month', `£${data.summary.thisMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['This Year', `£${data.summary.thisYearTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Average Monthly', `£${data.summary.averageMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Total Records', data.summary.totalRecords.toString()],
  ];

  if (data.largestExpense) {
    summaryData.push([
      'Largest Expense',
      `£${Number(data.largestExpense.amount).toLocaleString()} (${data.largestExpense.category})`,
    ]);
  }

  if (data.yoyComparison) {
    const sign = data.yoyComparison.percentageChange >= 0 ? '+' : '';
    summaryData.push([
      'Year-over-Year',
      `${sign}${data.yoyComparison.percentageChange.toFixed(1)}%`,
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [212, 175, 55] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Expenses Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Expenses', 14, yPos);
  yPos += 5;

  const tableData = data.expenses.slice(0, 100).map(expense => [
    new Date(expense.incurred_at).toLocaleDateString(),
    expense.description || '',
    expense.category || '',
    expense.supplier?.name || '—',
    `£${Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    expense.payment_method || '',
    expense.is_cogs ? 'COGS' : 'Operating',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Description', 'Category', 'Supplier', 'Amount', 'Payment', 'Type']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [212, 175, 55] },
    styles: { fontSize: 8 },
    columnStyles: {
      1: { cellWidth: 40 },
      4: { halign: 'right' },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save
  const periodSuffix = data.periodLabel ? `-${data.periodLabel.toLowerCase().replace(/\s+/g, '-')}` : '';
  doc.save(`expense-report${periodSuffix}-${new Date().toISOString().split('T')[0]}.pdf`);
};

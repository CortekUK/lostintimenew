import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateExpense, useUpdateExpense, useDeleteExpense, useSuppliers, useCreateSupplier } from '@/hooks/useDatabase';
import { ExpenseCategory } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, CRM_MODULES } from '@/hooks/usePermissions';
import { useAllExpenseCategories, useAddCustomCategory, formatCategoryDisplay } from '@/hooks/useCustomCategories';
import { ExpenseHelpTooltips } from '@/components/expenses/ExpenseHelpTooltips';
import { ExpenseCardSkeleton, StatsCardSkeleton } from '@/components/ui/loading-states';
import { QueryErrorHandler } from '@/components/ui/error-states';
import { 
  Plus, 
  PoundSterling,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
} from 'lucide-react';
import { 
  useExpenseStats, 
  useLargestExpense, 
  useYearOverYearComparison,
  ExpenseFilters
} from '@/hooks/useExpenseAnalytics';
import { CategoryBreakdownChart, MonthlyTrendsChart, ExpenseChartsLoading } from '@/components/expenses/ExpenseCharts';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
import { ExpenseFiltersEnhanced } from '@/components/expenses/ExpenseFiltersEnhanced';
import { useFilteredExpenses } from '@/hooks/useExpenseAnalytics';
import { generateExpenseCSV, generateExpensePDF } from '@/utils/expenseExport';
import { ExpenseModal } from '@/components/expenses/ExpenseModal';
import { useExpenseTemplates } from '@/hooks/useExpenseTemplates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getDateRange, DateRangePeriod } from '@/lib/utils';

export default function Expenses() {
  const { loading: authLoading } = useAuth();
  const { canCreate } = usePermissions();
  const canCreateExpenses = canCreate(CRM_MODULES.EXPENSES);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { createTemplate } = useExpenseTemplates();
  const { toast } = useToast();
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: expenses = [], isLoading: expensesLoading, error, refetch } = useFilteredExpenses(filters);
  const { data: suppliers = [] } = useSuppliers();
  const stats = useExpenseStats(filters);
  const { data: largestExpense } = useLargestExpense('month');
  const { data: yoyComparison } = useYearOverYearComparison();

  // Filter expenses by search query
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const query = searchQuery.toLowerCase();
    return expenses.filter((expense: any) => 
      expense.description?.toLowerCase().includes(query) ||
      expense.category?.toLowerCase().includes(query) ||
      expense.supplier?.name?.toLowerCase().includes(query) ||
      expense.notes?.toLowerCase().includes(query)
    );
  }, [expenses, searchQuery]);

  const handleSave = async (data: { expense: any; recurring: boolean; template: any; receiptFiles?: File[] }) => {
    try {
      if (editingExpense) {
        const { id, ...updates } = data.expense;
        await updateExpense.mutateAsync({ id, updates });
        toast({ title: 'Expense updated successfully' });
      } else {
        const createdExpense = await createExpense.mutateAsync(data.expense);

        // Upload staged receipt files
        if (data.receiptFiles && data.receiptFiles.length > 0 && createdExpense?.id) {
          for (const file of data.receiptFiles) {
            try {
              const fileExt = file.name.split('.').pop();
              const fileName = `${createdExpense.id}/${crypto.randomUUID()}.${fileExt}`;
              const filePath = `expense-receipts/${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from('expense-receipts')
                .upload(filePath, file);

              if (uploadError) throw uploadError;

              // Create receipt record
              const { error: dbError } = await supabase
                .from('expense_receipts')
                .insert({
                  expense_id: createdExpense.id,
                  file_path: filePath,
                  file_name: file.name,
                  file_size: file.size,
                  file_type: file.type.includes('pdf') ? 'pdf' : 'image',
                });

              if (dbError) throw dbError;
            } catch (uploadErr) {
              console.error('Failed to upload receipt:', uploadErr);
            }
          }
        }

        if (data.recurring && data.template) {
          const template = await createTemplate(data.template);

          // Link the created expense to the template so the table can show "Recurring" + controls
          if (template?.id && createdExpense?.id) {
            await updateExpense.mutateAsync({
              id: createdExpense.id,
              updates: { template_id: template.id },
            });
          }
        }

        toast({
          title: data.recurring
            ? 'Expense recorded. Recurring expense created.'
            : 'Expense recorded successfully',
        });
      }
      setShowModal(false);
      setEditingExpense(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save expense', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExpense.mutateAsync(id);
      setShowModal(false);
      setEditingExpense(null);
      toast({ title: 'Expense deleted successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete expense', variant: 'destructive' });
    }
  };
  
  // Fetch staff members for filter
  const staffMembers = useMemo(() => {
    const uniqueStaff = expenses.reduce((acc, expense) => {
      if (expense.staff && !acc.find((s: any) => s.user_id === expense.staff_id)) {
        acc.push({
          user_id: expense.staff_id,
          full_name: expense.staff.full_name || expense.staff.email
        });
      }
      return acc;
    }, [] as any[]);
    return uniqueStaff;
  }, [expenses]);

  const isLoading = authLoading || expensesLoading;

  const exportPeriods: { value: DateRangePeriod; label: string }[] = [
    { value: 'this-week', label: 'This Week' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-quarter', label: 'This Quarter' },
    { value: 'last-quarter', label: 'Last Quarter' },
    { value: 'this-year', label: 'This Year' },
    { value: 'last-year', label: 'Last Year' },
    { value: 'all-time', label: 'All Time' },
  ];

  const filterExpensesByPeriod = (period: DateRangePeriod) => {
    if (period === 'all-time') return expenses;
    const { from, to } = getDateRange(period);
    return expenses.filter((expense: any) => {
      const date = expense.incurred_at?.split('T')[0];
      return date >= from && date <= to;
    });
  };

  const getPeriodLabel = (period: DateRangePeriod): string => {
    return exportPeriods.find(p => p.value === period)?.label || period;
  };

  const handleExportCSV = (period: DateRangePeriod) => {
    const filteredData = filterExpensesByPeriod(period);
    generateExpenseCSV(filteredData, getPeriodLabel(period));
  };

  const handleExportPDF = (period: DateRangePeriod) => {
    const filteredData = filterExpensesByPeriod(period);
    const periodStats = {
      thisMonthTotal: filteredData.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0),
      thisYearTotal: stats.thisYearTotal,
      averageMonthly: stats.averageMonthly,
      totalRecords: filteredData.length,
    };
    generateExpensePDF({
      expenses: filteredData,
      summary: periodStats,
      largestExpense: filteredData.length > 0 ? filteredData.reduce((max: any, e: any) => 
        Number(e.amount) > Number(max?.amount || 0) ? e : max, filteredData[0]) : null,
      yoyComparison,
      periodLabel: getPeriodLabel(period),
    });
  };

  if (isLoading) {
    return (
      <AppLayout title="Expenses">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-32 h-10 bg-muted animate-pulse rounded" />
            <div className="w-32 h-10 bg-muted animate-pulse rounded" />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>

          <ExpenseChartsLoading />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ExpenseCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Expenses">
        <QueryErrorHandler 
          error={error} 
          onRetry={() => refetch()}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Expenses" subtitle="Track and manage business expenses">
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-luxury">£{stats.thisMonthTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.thisMonthCount} expenses</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Year</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-luxury">£{stats.thisYearTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.thisYearCount} expenses</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-luxury">{stats.totalRecords}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average/Month</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-luxury">£{stats.averageMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">This year</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">YoY Change</CardTitle>
              {yoyComparison && yoyComparison.percentageChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              {yoyComparison ? (
                <>
                  <div className={`text-2xl font-bold font-luxury ${yoyComparison.percentageChange >= 0 ? 'text-destructive' : 'text-success'}`}>
                    {yoyComparison.percentageChange >= 0 ? '+' : ''}{yoyComparison.percentageChange.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">vs last year</p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold font-luxury text-muted-foreground">--</div>
                  <p className="text-xs text-muted-foreground">No data</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left group: Filters */}
          <div className="flex items-center gap-3">
            <ExpenseFiltersEnhanced
              filters={filters}
              onFiltersChange={setFilters}
              suppliers={suppliers}
              staffMembers={staffMembers}
            />
          </div>

          {/* Right group: Actions */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {exportPeriods.map((period) => (
                  <DropdownMenuSub key={period.value}>
                    <DropdownMenuSubTrigger>{period.label}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleExportCSV(period.value)}>
                        CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportPDF(period.value)}>
                        PDF
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {canCreateExpenses && (
              <Button variant="premium" size="sm" onClick={() => { setShowModal(true); setEditingExpense(null); }}>
                <Plus className="mr-2 h-4 w-4" />
                Record Expense
              </Button>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <CategoryBreakdownChart filters={filters} />
          <MonthlyTrendsChart filters={filters} />
        </div>

        {/* Expenses Table */}
        {filteredExpenses.length > 0 || searchQuery.trim() ? (
          <ExpenseTable 
            expenses={filteredExpenses} 
            onEdit={setEditingExpense} 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        ) : (
          <Card className="shadow-card">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center">
                <PoundSterling className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery.trim() 
                    ? 'No expenses match your search'
                    : Object.keys(filters).length > 0 
                      ? 'Try adjusting your filters'
                      : 'Add your first expense to start tracking your business costs'
                  }
                </p>
                {!searchQuery.trim() && canCreateExpenses && (
                  <Button onClick={() => { setShowModal(true); setEditingExpense(null); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Expense
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Expense Modal */}
      <ExpenseModal
        open={showModal || !!editingExpense}
        onOpenChange={(open) => {
          if (!open) {
            setShowModal(false);
            setEditingExpense(null);
          }
        }}
        mode={editingExpense ? 'edit' : 'create'}
        expense={editingExpense}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </AppLayout>
  );
}

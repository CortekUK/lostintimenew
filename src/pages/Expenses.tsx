import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useCreateExpense, useUpdateExpense, useDeleteExpense, useSuppliers, useCreateSupplier } from '@/hooks/useDatabase';
import { ExpenseCategory } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAllExpenseCategories, useAddCustomCategory } from '@/hooks/useCustomCategories';
import { ExpenseHelpTooltips } from '@/components/expenses/ExpenseHelpTooltips';
import { ExpenseCardSkeleton, StatsCardSkeleton } from '@/components/ui/loading-states';
import { QueryErrorHandler } from '@/components/ui/error-states';
import { 
  Plus, 
  PoundSterling,
  TrendingUp,
  TrendingDown,
  FileText,
  LayoutGrid,
  List,
  Download,
  Loader2
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
import { RecurringTemplatesBanner } from '@/components/expenses/RecurringTemplatesBanner';
import { useExpenseTemplates } from '@/hooks/useExpenseTemplates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ExpenseCard = ({ expense }: { expense: any }) => (
  <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">{expense.description}</CardTitle>
          <CardDescription>
            {expense.supplier?.name} • {expense.category}
          </CardDescription>
        </div>
        <Badge variant={expense.is_cogs ? 'default' : 'outline'}>
          {expense.is_cogs ? 'COGS' : 'Operating'}
        </Badge>
      </div>
    </CardHeader>
    
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Amount</p>
          <p className="text-lg font-bold">£{Number(expense.amount).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-medium">{new Date(expense.incurred_at).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{expense.payment_method || 'cash'}</Badge>
        <span>•</span>
        <span>{expense.staff?.full_name || 'System'}</span>
      </div>
    </CardContent>
  </Card>
);

export default function Expenses() {
  const { loading: authLoading } = useAuth();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { createTemplate } = useExpenseTemplates();
  const { toast } = useToast();
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  const { data: expenses = [], isLoading: expensesLoading, error, refetch } = useFilteredExpenses(filters);
  const { data: suppliers = [] } = useSuppliers();
  const stats = useExpenseStats(filters);
  const { data: largestExpense } = useLargestExpense('month');
  const { data: yoyComparison } = useYearOverYearComparison();

  const handleSave = async (data: { expense: any; recurring: boolean; template: any }) => {
    try {
      if (editingExpense) {
        await updateExpense.mutateAsync(data.expense);
        toast({ title: 'Expense updated successfully' });
      } else {
        await createExpense.mutateAsync(data.expense);
        if (data.recurring && data.template) {
          await createTemplate(data.template);
        }
        toast({ title: data.recurring ? 'Expense recorded. Recurring template created.' : 'Expense recorded successfully' });
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

  const handleExportCSV = () => {
    generateExpenseCSV(expenses);
  };

  const handleExportPDF = () => {
    generateExpensePDF({
      expenses,
      summary: {
        thisMonthTotal: stats.thisMonthTotal,
        thisYearTotal: stats.thisYearTotal,
        averageMonthly: stats.averageMonthly,
        totalRecords: stats.totalRecords,
      },
      largestExpense,
      yoyComparison,
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
        <RecurringTemplatesBanner />
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left group: Display controls */}
          <div className="flex flex-wrap items-center gap-2">
            <ExpenseFiltersEnhanced
              filters={filters}
              onFiltersChange={setFilters}
              suppliers={suppliers}
              staffMembers={staffMembers}
            />
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
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
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="premium" size="sm" onClick={() => { setShowModal(true); setEditingExpense(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Record Expense
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.thisMonthTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.thisMonthCount} expenses</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Year</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.thisYearTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.thisYearCount} expenses</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecords}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average/Month</CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.averageMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">This year</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">YoY Change</CardTitle>
              {yoyComparison && yoyComparison.percentageChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              {yoyComparison ? (
                <>
                  <div className={`text-2xl font-bold ${yoyComparison.percentageChange >= 0 ? 'text-destructive' : 'text-success'}`}>
                    {yoyComparison.percentageChange >= 0 ? '+' : ''}{yoyComparison.percentageChange.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">vs last year</p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-muted-foreground">--</div>
                  <p className="text-xs text-muted-foreground">No data</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <CategoryBreakdownChart filters={filters} />
          <MonthlyTrendsChart filters={filters} />
        </div>

        {/* Expenses List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>
              {viewMode === 'grid' ? 'Recent Expenses' : 'All Expenses'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {expenses.slice(0, 9).map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} />
                ))}
                {expenses.length === 0 && (
                  <div className="col-span-full">
                    <div className="flex flex-col items-center justify-center py-12">
                      <PoundSterling className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        {Object.keys(filters).length > 0 
                          ? 'Try adjusting your filters'
                          : 'Add your first expense to start tracking your business costs'
                        }
                      </p>
                      <Button onClick={() => { setShowModal(true); setEditingExpense(null); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Record Expense
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <ExpenseTable expenses={expenses} onEdit={setEditingExpense} />
            )}
          </CardContent>
        </Card>
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

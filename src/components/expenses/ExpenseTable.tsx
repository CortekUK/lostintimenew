import { useState, useMemo, memo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Trash2, Check, X, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, Pause, Play, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateExpense, useDeleteExpense } from '@/hooks/useDatabase';
import { usePermissions } from '@/hooks/usePermissions';
import { useAllExpenseCategories, formatCategoryDisplay } from '@/hooks/useCustomCategories';
import { useExpenseTemplates } from '@/hooks/useExpenseTemplates';
import { EditExpenseModal } from './EditExpenseModal';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { MakeRecurringDialog } from './MakeRecurringDialog';
import { EditScheduleDialog } from './EditScheduleDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ExpenseTableProps {
  expenses: any[];
  onEdit?: (expense: any) => void;
}

// Use formatCategoryDisplay from useCustomCategories for consistent formatting

const ExpenseRow = memo(({ 
  expense, 
  isEditing, 
  isSelected,
  editData, 
  onSelect,
  onEditChange, 
  onStartEdit, 
  onSaveEdit, 
  onCancelEdit, 
  onOpenModal,
  onDelete,
  onMakeRecurring,
  onEditSchedule,
  onTogglePause,
  onStopRecurring,
  canEditExpenses,
  canDeleteExpenses,
  allCategories 
}: any) => {
  const hasTemplate = !!expense.template;
  return (
    <TableRow className={isSelected ? 'bg-muted/50' : ''}>
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(expense.id)}
        />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {format(new Date(expense.incurred_at), 'PP')}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            value={editData.description}
            onChange={(e) => onEditChange({ ...editData, description: e.target.value })}
            className="h-8"
          />
        ) : (
          <span className="font-medium">{expense.description || '-'}</span>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Select
            value={editData.category}
            onValueChange={(value) => onEditChange({ ...editData, category: value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allCategories.map((cat: string) => (
                <SelectItem key={cat} value={cat}>
                  {formatCategoryDisplay(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">{formatCategoryDisplay(expense.category)}</Badge>
        )}
      </TableCell>
      <TableCell className="text-right font-mono">
        {isEditing ? (
          <Input
            type="number"
            step="0.01"
            value={editData.amount}
            onChange={(e) => onEditChange({ ...editData, amount: e.target.value })}
            className="h-8 text-right"
          />
        ) : (
          `£${Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{formatCategoryDisplay(expense.payment_method || 'cash')}</Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {expense.supplier?.name || '-'}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {expense.is_cogs && (
            <Badge variant="default" className="text-xs w-fit">COGS</Badge>
          )}
          {expense.template ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col gap-0.5">
                    <Badge 
                      variant={expense.template.is_active ? "outline" : "secondary"} 
                      className={cn(
                        "text-xs w-fit gap-1",
                        !expense.template.is_active && "opacity-60"
                      )}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {formatCategoryDisplay(expense.template.frequency)}
                      {!expense.template.is_active && " (Paused)"}
                    </Badge>
                    {expense.template.is_active && expense.template.next_due_date && (
                      <span className="text-[10px] text-muted-foreground">
                        Next: {format(new Date(expense.template.next_due_date), 'dd MMM')}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Recurring {expense.template.frequency} expense</p>
                  {expense.template.is_active ? (
                    expense.template.next_due_date && (
                      <p className="text-xs text-muted-foreground">
                        Next due: {format(new Date(expense.template.next_due_date), 'PPP')}
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground">Schedule is paused</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-xs text-muted-foreground">One-time</span>
          )}
        </div>
      </TableCell>
        <TableCell className="text-right">
          {(canEditExpenses || canDeleteExpenses) && (
            <div className="flex items-center justify-end gap-1">
              {isEditing ? (
                <>
                  {canEditExpenses && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSaveEdit(expense.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancelEdit}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {canEditExpenses && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStartEdit(expense)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {hasTemplate ? (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditSchedule({ ...expense.template, description: expense.description })}
                                  className="h-8 w-8 p-0"
                                >
                                  <Settings className="h-4 w-4 text-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Schedule</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onTogglePause(expense.template)}
                                  className="h-8 w-8 p-0"
                                >
                                  {expense.template.is_active ? (
                                    <Pause className="h-4 w-4 text-amber-500" />
                                  ) : (
                                    <Play className="h-4 w-4 text-green-500" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {expense.template.is_active ? 'Pause Schedule' : 'Resume Schedule'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onMakeRecurring(expense)}
                                className="h-8 w-8 p-0"
                              >
                                <RefreshCw className="h-4 w-4 text-primary" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Make Recurring</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </>
                  )}
                  {canDeleteExpenses && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(expense.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </TableCell>
    </TableRow>
  );
});

ExpenseRow.displayName = 'ExpenseRow';

export function ExpenseTable({ expenses, onEdit }: ExpenseTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editModalExpense, setEditModalExpense] = useState<any>(null);
  const [recurringExpense, setRecurringExpense] = useState<any>(null);
  const [editScheduleTemplate, setEditScheduleTemplate] = useState<any>(null);
  const [stopRecurringTemplate, setStopRecurringTemplate] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { canEdit, canDelete } = usePermissions();
  const canEditExpenses = canEdit('expenses');
  const canDeleteExpenses = canDelete('expenses');
  const canManageExpenses = canEditExpenses || canDeleteExpenses;
  const { all: allCategories = [] } = useAllExpenseCategories();
  const { createTemplate, updateTemplate, deleteTemplate } = useExpenseTemplates();
  // Pagination
  const totalPages = Math.ceil(expenses.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedExpenses = useMemo(() => {
    let sorted = [...expenses];
    if (sortConfig) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [expenses, sortConfig]);

  const paginatedExpenses = sortedExpenses.slice(startIndex, endIndex);

  const startEdit = (expense: any) => {
    setEditingId(expense.id);
    setEditData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (id: number) => {
    await updateExpense.mutateAsync({ id, updates: editData });
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteExpense.mutateAsync(deleteId);
      setDeleteId(null);
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(deleteId);
        return newSet;
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedExpenses.map(e => e.id)));
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteExpense.mutateAsync(id);
    }
    setSelectedIds(new Set());
  };

  const handleBulkCategoryChange = async (category: string) => {
    for (const id of selectedIds) {
      await updateExpense.mutateAsync({ id, updates: { category: category as any } });
    }
    setSelectedIds(new Set());
  };

  const handleEditModalSave = async (id: number, updates: any) => {
    await updateExpense.mutateAsync({ id, updates });
  };

  const handleEditModalDelete = async (id: number) => {
    await deleteExpense.mutateAsync(id);
  };

  const handleTogglePause = (template: any) => {
    updateTemplate({
      id: template.id,
      updates: { is_active: !template.is_active }
    });
  };

  const handleStopRecurring = () => {
    if (stopRecurringTemplate) {
      deleteTemplate(stopRecurringTemplate.id);
      setStopRecurringTemplate(null);
    }
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground font-medium">No expenses match your filters</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting or clearing your filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === paginatedExpenses.length && paginatedExpenses.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('incurred_at')}>
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Schedule</TableHead>
                {canManageExpenses && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  isEditing={editingId === expense.id}
                  isSelected={selectedIds.has(expense.id)}
                  editData={editData}
                  onSelect={handleSelect}
                  onEditChange={setEditData}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  onOpenModal={onEdit || setEditModalExpense}
                  onDelete={setDeleteId}
                  onMakeRecurring={setRecurringExpense}
                  onEditSchedule={setEditScheduleTemplate}
                  onTogglePause={handleTogglePause}
                  onStopRecurring={setStopRecurringTemplate}
                  canEditExpenses={canEditExpenses}
                  canDeleteExpenses={canDeleteExpenses}
                  allCategories={allCategories}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <Select value={pageSize.toString()} onValueChange={(v) => {
                setPageSize(parseInt(v));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, expenses.length)} of {expenses.length} expenses
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkDelete={handleBulkDelete}
        onBulkCategoryChange={handleBulkCategoryChange}
      />

      {!onEdit && (
        <EditExpenseModal
          open={!!editModalExpense}
          onOpenChange={(open) => !open && setEditModalExpense(null)}
          expense={editModalExpense}
          onSave={handleEditModalSave}
          onDelete={handleEditModalDelete}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this expense. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MakeRecurringDialog
        open={!!recurringExpense}
        onOpenChange={(open) => !open && setRecurringExpense(null)}
        expense={recurringExpense}
        onConfirm={async (frequency, nextDueDate) => {
          if (!recurringExpense) return;
          try {
            // Create the template
            const template = await createTemplate({
              description: recurringExpense.description,
              amount: recurringExpense.amount,
              category: recurringExpense.category,
              payment_method: recurringExpense.payment_method || 'cash',
              supplier_id: recurringExpense.supplier_id,
              vat_rate: recurringExpense.vat_rate,
              notes: recurringExpense.notes,
              frequency: frequency as 'weekly' | 'monthly' | 'quarterly' | 'annually',
              next_due_date: nextDueDate.toISOString().split('T')[0],
            });

            // Link expense to template
            if (template?.id) {
              await updateExpense.mutateAsync({
                id: recurringExpense.id,
                updates: { template_id: template.id },
              });
            }

            await queryClient.invalidateQueries({ queryKey: ['expenses', 'filtered'] });

            toast.success('Recurring template created');
            setRecurringExpense(null);
          } catch (error) {
            toast.error('Failed to create recurring template');
          }
        }}
      />

      <EditScheduleDialog
        open={!!editScheduleTemplate}
        onOpenChange={(open) => !open && setEditScheduleTemplate(null)}
        template={editScheduleTemplate}
      />

      <AlertDialog open={!!stopRecurringTemplate} onOpenChange={() => setStopRecurringTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Recurring Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the recurring schedule for this expense. 
              Future expenses will no longer be auto-generated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStopRecurring} className="bg-destructive text-destructive-foreground">
              Stop Recurring
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Pencil, Pause, Play, Trash2, Plus, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useExpenseTemplates, ExpenseTemplate } from '@/hooks/useExpenseTemplates';
import { useSuppliers } from '@/hooks/useSuppliers';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Skeleton } from '@/components/ui/skeleton';
import { EditTemplateDialog } from '@/components/expenses/EditTemplateDialog';

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const frequencyColors: Record<string, string> = {
  weekly: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  monthly: 'bg-green-500/10 text-green-500 border-green-500/20',
  quarterly: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  annually: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export default function RecurringExpenses() {
  const { templates, isLoading, updateTemplate, deleteTemplate, isUpdating, isDeleting } = useExpenseTemplates();
  const { data: suppliers = [] } = useSuppliers();
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<ExpenseTemplate | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getSupplierName = (supplierId: number | null) => {
    if (!supplierId) return '—';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || '—';
  };

  const handleToggleActive = (template: ExpenseTemplate) => {
    updateTemplate({
      id: template.id,
      updates: { is_active: !template.is_active },
    });
  };

  const handleDelete = () => {
    if (deletingTemplate) {
      deleteTemplate(deletingTemplate.id);
      setDeletingTemplate(null);
    }
  };

  const activeTemplates = templates.filter(t => t.is_active);
  const pausedTemplates = templates.filter(t => !t.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/expenses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Recurring Expenses"
          description="Manage your recurring expense schedules"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Schedules</CardDescription>
            <CardTitle className="text-2xl">{activeTemplates.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Total</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(
                templates
                  .filter(t => t.is_active)
                  .reduce((sum, t) => {
                    const multiplier = t.frequency === 'weekly' ? 4.33 
                      : t.frequency === 'monthly' ? 1 
                      : t.frequency === 'quarterly' ? 0.33 
                      : 0.083;
                    return sum + t.amount * multiplier;
                  }, 0)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paused Schedules</CardDescription>
            <CardTitle className="text-2xl">{pausedTemplates.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            All Recurring Templates
          </CardTitle>
          <CardDescription>
            View and manage all recurring expense schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No recurring expenses yet</p>
              <p className="text-sm">Create recurring expenses from the Expenses page</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/expenses">Go to Expenses</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{template.description}</TableCell>
                    <TableCell>{formatCurrency(template.amount)}</TableCell>
                    <TableCell className="capitalize">{template.category}</TableCell>
                    <TableCell>{getSupplierName(template.supplier_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={frequencyColors[template.frequency]}>
                        {frequencyLabels[template.frequency]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {format(new Date(template.next_due_date), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.is_active ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Paused
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(template)}
                          disabled={isUpdating}
                        >
                          {template.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingTemplate(template)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingTemplate && (
        <EditTemplateDialog
          template={editingTemplate}
          open={!!editingTemplate}
          onOpenChange={(open) => !open && setEditingTemplate(null)}
        />
      )}

      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.description}"? This will stop all future occurrences. Existing expenses will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

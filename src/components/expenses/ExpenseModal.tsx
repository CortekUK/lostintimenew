import { useState, useEffect } from 'react';
import { format, addWeeks, addMonths, addYears } from 'date-fns';
import { Calendar, CalendarIcon, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ReceiptUpload } from './ReceiptUpload';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAllExpenseCategories, formatCategoryDisplay } from '@/hooks/useCustomCategories';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
interface ExpenseFormData {
  description: string;
  amount: string;
  date: Date;
  category: string;
  supplier_id: number | null;
  payment_method: string;
  include_vat: boolean;
  vat_rate: number;
  notes: string;
  is_cogs: boolean;
  recurring: boolean;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  next_due_date: Date;
}
interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  expense?: any;
  onSave: (data: any) => void;
  onDelete?: (id: number) => void;
}
const PAYMENT_METHODS: Array<{
  value: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  label: string;
}> = [{
  value: 'cash',
  label: 'Cash'
}, {
  value: 'card',
  label: 'Card'
}, {
  value: 'transfer',
  label: 'Bank Transfer'
}, {
  value: 'check',
  label: 'Cheque'
}, {
  value: 'other',
  label: 'Other'
}];
const VAT_RATES = [0, 5, 20];
export function ExpenseModal({
  open,
  onOpenChange,
  mode,
  expense,
  onSave,
  onDelete
}: ExpenseModalProps) {
  const {
    user
  } = useAuth();
  const isOwner = useOwnerGuard();
  const {
    data: suppliers = []
  } = useSuppliers();
  const {
    all: allCategories
  } = useAllExpenseCategories();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: '',
    amount: '',
    date: new Date(),
    category: 'other',
    supplier_id: null,
    payment_method: 'cash',
    include_vat: false,
    vat_rate: 20,
    notes: '',
    is_cogs: false,
    recurring: false,
    frequency: 'monthly',
    next_due_date: new Date()
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && expense) {
      setFormData({
        description: expense.description || '',
        amount: expense.amount_inc_vat || expense.amount || '',
        date: expense.incurred_at ? new Date(expense.incurred_at) : new Date(),
        category: expense.category || 'other',
        supplier_id: expense.supplier_id || null,
        payment_method: expense.payment_method || 'cash',
        include_vat: !!expense.vat_rate,
        vat_rate: expense.vat_rate || 20,
        notes: expense.notes || '',
        is_cogs: expense.is_cogs || false,
        recurring: false,
        frequency: 'monthly',
        next_due_date: new Date()
      });
    } else if (mode === 'create') {
      // Reset form for create mode
      setFormData({
        description: '',
        amount: '',
        date: new Date(),
        category: 'other',
        supplier_id: null,
        payment_method: 'cash',
        include_vat: false,
        vat_rate: 20,
        notes: '',
        is_cogs: false,
        recurring: false,
        frequency: 'monthly',
        next_due_date: new Date()
      });
    }
    setErrors({});
  }, [mode, expense, open]);

  // Calculate VAT breakdown
  const calculateVAT = () => {
    const amountNum = parseFloat(formData.amount) || 0;
    if (!formData.include_vat) {
      return {
        amountExVat: amountNum,
        vatAmount: 0,
        amountIncVat: amountNum
      };
    }
    const vatDecimal = formData.vat_rate / 100;
    const amountExVat = amountNum / (1 + vatDecimal);
    const vatAmount = amountNum - amountExVat;
    return {
      amountExVat: parseFloat(amountExVat.toFixed(2)),
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      amountIncVat: amountNum
    };
  };
  const vatBreakdown = calculateVAT();

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.payment_method) {
      newErrors.payment_method = 'Payment method is required';
    }
    if (formData.recurring && !formData.next_due_date) {
      newErrors.next_due_date = 'Next due date is required for recurring expenses';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSave = () => {
    if (!validate()) return;
    const saveData: any = {
      description: formData.description,
      incurred_at: formData.date.toISOString(),
      category: formData.category,
      supplier_id: formData.supplier_id,
      payment_method: formData.payment_method,
      notes: formData.notes || null,
      is_cogs: formData.is_cogs,
      staff_id: user?.id
    };
    if (formData.include_vat) {
      saveData.amount_ex_vat = vatBreakdown.amountExVat;
      saveData.vat_amount = vatBreakdown.vatAmount;
      saveData.vat_rate = formData.vat_rate;
      saveData.amount_inc_vat = vatBreakdown.amountIncVat;
      saveData.amount = vatBreakdown.amountIncVat; // For backward compatibility
    } else {
      saveData.amount = parseFloat(formData.amount);
      saveData.amount_ex_vat = null;
      saveData.vat_amount = null;
      saveData.vat_rate = null;
      saveData.amount_inc_vat = null;
    }
    if (mode === 'edit' && expense) {
      saveData.id = expense.id;
    }
    onSave({
      expense: saveData,
      recurring: formData.recurring,
      template: formData.recurring ? {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        supplier_id: formData.supplier_id,
        payment_method: formData.payment_method,
        vat_rate: formData.include_vat ? formData.vat_rate : null,
        notes: formData.notes || null,
        frequency: formData.frequency,
        next_due_date: formData.next_due_date.toISOString().split('T')[0]
      } : null
    });
  };
  const handleDelete = () => {
    if (expense && onDelete) {
      onDelete(expense.id);
      setShowDeleteDialog(false);
      onOpenChange(false);
    }
  };
  const isValid = formData.description.trim() && formData.amount && parseFloat(formData.amount) > 0 && formData.category && formData.payment_method;
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl">
              {mode === 'create' ? 'Record New Expense' : 'Edit Expense'}
            </DialogTitle>
            {mode === 'edit' && expense && <DialogDescription>
                Created by {expense.staff?.full_name || 'Unknown'} on{' '}
                {format(new Date(expense.created_at), 'MMM d, yyyy')}
              </DialogDescription>}
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input id="description" placeholder="e.g., Office rent" value={formData.description} onChange={e => setFormData({
              ...formData,
              description: e.target.value
            })} className={errors.description ? 'border-destructive' : ''} />
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            {/* Amount & VAT */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <CurrencyInput id="amount" value={formData.amount} onValueChange={value => setFormData({
                ...formData,
                amount: value
              })} error={errors.amount} />
              </div>

              {/* VAT Toggle */}
              <div className="flex items-center gap-2">
                <Switch id="include-vat" checked={formData.include_vat} onCheckedChange={checked => setFormData({
                ...formData,
                include_vat: checked
              })} />
                <Label htmlFor="include-vat" className="cursor-pointer">
                  Include VAT/Tax
                </Label>
              </div>

              {/* VAT Breakdown */}
              {formData.include_vat && <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="vat-rate">VAT Rate</Label>
                    <Select value={formData.vat_rate.toString()} onValueChange={value => setFormData({
                  ...formData,
                  vat_rate: parseInt(value)
                })}>
                      <SelectTrigger id="vat-rate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_RATES.map(rate => <SelectItem key={rate} value={rate.toString()}>
                            {rate}%
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount (Ex VAT):</span>
                      <span className="font-medium">£{vatBreakdown.amountExVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT ({formData.vat_rate}%):</span>
                      <span className="font-medium">£{vatBreakdown.vatAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-semibold">Total (Inc VAT):</span>
                      <span className="font-semibold">
                        £{vatBreakdown.amountIncVat.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Date */}
              <div className="space-y-2">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.date && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={formData.date} onSelect={date => date && setFormData({
                    ...formData,
                    date
                  })} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.category} onValueChange={value => setFormData({
                ...formData,
                category: value
              })}>
                  <SelectTrigger id="category" className={errors.category ? 'border-destructive' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map(cat => <SelectItem key={cat} value={cat}>
                        {formatCategoryDisplay(cat)}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Supplier */}
              <div className="space-y-2">
                <Label htmlFor="supplier">Vendor / Supplier (Optional)</Label>
                <Select value={formData.supplier_id?.toString() || 'none'} onValueChange={value => {
                if (value === 'none') {
                  setFormData({
                    ...formData,
                    supplier_id: null
                  });
                } else {
                  setFormData({
                    ...formData,
                    supplier_id: parseInt(value)
                  });
                }
              }}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment">
                  Payment Method <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.payment_method} onValueChange={value => setFormData({
                ...formData,
                payment_method: value
              })}>
                  <SelectTrigger id="payment" className={errors.payment_method ? 'border-destructive' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(method => <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.payment_method && <p className="text-sm text-destructive">{errors.payment_method}</p>}
              </div>
            </div>

            {/* COGS Toggle */}
            <div className="flex items-center gap-2">
              <Switch id="is-cogs" checked={formData.is_cogs} onCheckedChange={checked => setFormData({
              ...formData,
              is_cogs: checked
            })} />
              <Label htmlFor="is-cogs" className="cursor-pointer">
                This is a Cost of Goods Sold (COGS)
              </Label>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea id="notes" placeholder="Additional notes..." value={formData.notes} onChange={e => setFormData({
              ...formData,
              notes: e.target.value
            })} rows={3} />
            </div>

            {/* Receipts */}
            <div className="space-y-2">
              <Label>Receipt Upload (Optional)</Label>
              <ReceiptUpload expenseId={mode === 'edit' ? expense?.id : undefined} />
            </div>

            {/* Recurring Expenses */}
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Switch id="recurring" checked={formData.recurring} onCheckedChange={checked => {
                if (checked) {
                  // Auto-calculate next due date based on current frequency when enabling
                  const baseDate = formData.date || new Date();
                  let nextDate: Date;
                  switch (formData.frequency) {
                    case 'weekly':
                      nextDate = addWeeks(baseDate, 1);
                      break;
                    case 'monthly':
                      nextDate = addMonths(baseDate, 1);
                      break;
                    case 'quarterly':
                      nextDate = addMonths(baseDate, 3);
                      break;
                    case 'annually':
                      nextDate = addYears(baseDate, 1);
                      break;
                    default:
                      nextDate = addMonths(baseDate, 1);
                  }
                  setFormData({
                    ...formData,
                    recurring: checked,
                    next_due_date: nextDate
                  });
                } else {
                  setFormData({
                    ...formData,
                    recurring: checked
                  });
                }
              }} />
                <Label htmlFor="recurring" className="cursor-pointer font-semibold">
                  Make this a recurring expense
                </Label>
              </div>

              {formData.recurring && <div className="space-y-4 pl-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select value={formData.frequency} onValueChange={(value: 'weekly' | 'monthly' | 'quarterly' | 'annually') => {
                    // Calculate next due date based on frequency
                    const baseDate = formData.date || new Date();
                    let nextDate: Date;
                    switch (value) {
                      case 'weekly':
                        nextDate = addWeeks(baseDate, 1);
                        break;
                      case 'monthly':
                        nextDate = addMonths(baseDate, 1);
                        break;
                      case 'quarterly':
                        nextDate = addMonths(baseDate, 3);
                        break;
                      case 'annually':
                        nextDate = addYears(baseDate, 1);
                        break;
                      default:
                        nextDate = addMonths(baseDate, 1);
                    }
                    setFormData({
                      ...formData,
                      frequency: value,
                      next_due_date: nextDate
                    });
                  }}>
                        <SelectTrigger id="frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Next Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.next_due_date && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.next_due_date ? format(formData.next_due_date, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarPicker mode="single" selected={formData.next_due_date} onSelect={date => date && setFormData({
                        ...formData,
                        next_due_date: date
                      })} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>}
            </div>

            {/* Recorded By */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Recorded by:</span>
              <Badge variant="outline">{user?.email}</Badge>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {mode === 'edit' && isOwner && <Button type="button" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                Delete
              </Button>}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!isValid}>
              {mode === 'create' ? 'Record Expense' : 'Update Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}
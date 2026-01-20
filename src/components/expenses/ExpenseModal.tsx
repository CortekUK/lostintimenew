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
  manual_vat_override: boolean;
  manual_vat_amount: string;
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
  const [stagedReceipts, setStagedReceipts] = useState<File[]>([]);
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: '',
    amount: '',
    date: new Date(),
    category: 'other',
    supplier_id: null,
    payment_method: 'cash',
    include_vat: false,
    vat_rate: 20,
    manual_vat_override: false,
    manual_vat_amount: '',
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
        include_vat: !!expense.vat_rate || !!expense.vat_amount,
        vat_rate: expense.vat_rate || 20,
        manual_vat_override: false,
        manual_vat_amount: expense.vat_amount?.toString() || '',
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
        manual_vat_override: false,
        manual_vat_amount: '',
        notes: '',
        is_cogs: false,
        recurring: false,
        frequency: 'monthly',
        next_due_date: new Date()
      });
      setStagedReceipts([]);
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
    
    // If manual override is enabled, use the manually entered VAT amount
    if (formData.manual_vat_override) {
      const manualVat = parseFloat(formData.manual_vat_amount) || 0;
      const amountExVat = amountNum - manualVat;
      return {
        amountExVat: parseFloat(amountExVat.toFixed(2)),
        vatAmount: parseFloat(manualVat.toFixed(2)),
        amountIncVat: amountNum
      };
    }
    
    // Standard calculation based on VAT rate
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
    // Validate manual VAT amount
    if (formData.include_vat && formData.manual_vat_override) {
      const manualVat = parseFloat(formData.manual_vat_amount) || 0;
      const totalAmount = parseFloat(formData.amount) || 0;
      if (manualVat < 0) {
        newErrors.manual_vat = 'VAT amount cannot be negative';
      } else if (manualVat >= totalAmount) {
        newErrors.manual_vat = 'VAT amount must be less than total';
      }
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
      } : null,
      receiptFiles: stagedReceipts
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
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="font-luxury text-2xl">
              {mode === 'create' ? 'Record New Expense' : 'Edit Expense'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'edit' && expense 
                ? `Created by ${expense.staff?.full_name || 'Unknown'} on ${format(new Date(expense.created_at), 'MMM d, yyyy')}`
                : 'Add a new expense to track your business costs'}
            </DialogDescription>
          </DialogHeader>

          <Separator />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Basic Details Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Basic Details</h4>
              
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="font-medium">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="description" 
                  placeholder="e.g., Office rent, Equipment purchase..." 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  className={cn("h-11", errors.description && 'border-destructive')} 
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount" className="font-medium">
                    Amount <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="include-vat" className="text-sm text-muted-foreground cursor-pointer">
                      Include VAT
                    </Label>
                    <Switch 
                      id="include-vat" 
                      checked={formData.include_vat} 
                      onCheckedChange={checked => setFormData({ ...formData, include_vat: checked })} 
                    />
                  </div>
                </div>
                <CurrencyInput 
                  id="amount" 
                  value={formData.amount} 
                  onValueChange={value => setFormData({ ...formData, amount: value })} 
                  error={errors.amount} 
                />
              </div>

              {/* VAT Breakdown Panel */}
              {formData.include_vat && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="vat-rate" className="text-sm">VAT Rate</Label>
                      <Select 
                        value={formData.vat_rate.toString()} 
                        onValueChange={value => setFormData({
                          ...formData,
                          vat_rate: parseInt(value),
                          manual_vat_override: false,
                          manual_vat_amount: ''
                        })}
                        disabled={formData.manual_vat_override}
                      >
                        <SelectTrigger id="vat-rate" className={cn("h-10", formData.manual_vat_override && 'opacity-50')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VAT_RATES.map(rate => (
                            <SelectItem key={rate} value={rate.toString()}>{rate}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Manual VAT Override */}
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="manual-vat-override" 
                      checked={formData.manual_vat_override} 
                      onCheckedChange={checked => {
                        if (checked && !formData.manual_vat_amount) {
                          setFormData({
                            ...formData,
                            manual_vat_override: checked,
                            manual_vat_amount: vatBreakdown.vatAmount.toFixed(2)
                          });
                        } else {
                          setFormData({ ...formData, manual_vat_override: checked });
                        }
                      }} 
                    />
                    <Label htmlFor="manual-vat-override" className="cursor-pointer text-sm text-muted-foreground">
                      Override calculated VAT amount
                    </Label>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1.5 px-3 rounded-md bg-background">
                      <span className="text-muted-foreground">Amount (Ex VAT):</span>
                      <span className="font-medium">£{vatBreakdown.amountExVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 px-3 rounded-md bg-background">
                      <span className="text-muted-foreground">
                        VAT {formData.manual_vat_override ? '(Manual)' : `(${formData.vat_rate}%)`}:
                      </span>
                      {formData.manual_vat_override ? (
                        <div className="w-28">
                          <CurrencyInput
                            value={formData.manual_vat_amount}
                            onValueChange={value => setFormData({ ...formData, manual_vat_amount: value })}
                            error={errors.manual_vat}
                          />
                        </div>
                      ) : (
                        <span className="font-medium">£{vatBreakdown.vatAmount.toFixed(2)}</span>
                      )}
                    </div>
                    {errors.manual_vat && <p className="text-sm text-destructive px-3">{errors.manual_vat}</p>}
                    <div className="flex justify-between items-center py-2 px-3 rounded-md bg-primary/5 border-t mt-2">
                      <span className="font-semibold">Total (Inc VAT):</span>
                      <span className="font-semibold">£{vatBreakdown.amountIncVat.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Classification Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Classification</h4>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Date */}
                <div className="space-y-2">
                  <Label className="font-medium">Date <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn('w-full justify-start text-left font-normal h-11', !formData.date && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(formData.date, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker 
                        mode="single" 
                        selected={formData.date} 
                        onSelect={date => date && setFormData({ ...formData, date })} 
                        initialFocus 
                        className="pointer-events-auto" 
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="font-medium">Category <span className="text-destructive">*</span></Label>
                  <Select value={formData.category} onValueChange={value => setFormData({ ...formData, category: value })}>
                    <SelectTrigger id="category" className={cn("h-11", errors.category && 'border-destructive')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{formatCategoryDisplay(cat)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                </div>

                {/* Supplier */}
                <div className="space-y-2">
                  <Label htmlFor="supplier" className="font-medium">Vendor / Supplier</Label>
                  <Select 
                    value={formData.supplier_id?.toString() || 'none'} 
                    onValueChange={value => setFormData({ 
                      ...formData, 
                      supplier_id: value === 'none' ? null : parseInt(value) 
                    })}
                  >
                    <SelectTrigger id="supplier" className="h-11">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>{supplier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label htmlFor="payment" className="font-medium">Payment Method <span className="text-destructive">*</span></Label>
                  <Select value={formData.payment_method} onValueChange={value => setFormData({ ...formData, payment_method: value })}>
                    <SelectTrigger id="payment" className={cn("h-11", errors.payment_method && 'border-destructive')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.payment_method && <p className="text-sm text-destructive">{errors.payment_method}</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Options Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Options</h4>
              
              {/* COGS Toggle */}
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-4 border">
                <div>
                  <Label htmlFor="is-cogs" className="font-medium cursor-pointer">
                    Cost of Goods Sold (COGS)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Include in cost of goods calculations
                  </p>
                </div>
                <Switch 
                  id="is-cogs" 
                  checked={formData.is_cogs} 
                  onCheckedChange={checked => setFormData({ ...formData, is_cogs: checked })} 
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="font-medium">Notes</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Add any additional details..." 
                  value={formData.notes} 
                  onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                  rows={3} 
                  className="resize-none"
                />
              </div>
            </div>

            {/* Receipt Upload Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Receipt</h4>
              <ReceiptUpload 
                expenseId={mode === 'edit' ? expense?.id : undefined}
                onStagedFilesChange={setStagedReceipts}
              />
            </div>

            {/* Recurring Expense Section */}
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="recurring" className="font-medium cursor-pointer">
                    Make this a recurring expense
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Automatically track this expense on a schedule
                  </p>
                </div>
                <Switch 
                  id="recurring" 
                  checked={formData.recurring} 
                  onCheckedChange={checked => {
                    if (checked) {
                      const baseDate = formData.date || new Date();
                      let nextDate: Date;
                      switch (formData.frequency) {
                        case 'weekly': nextDate = addWeeks(baseDate, 1); break;
                        case 'monthly': nextDate = addMonths(baseDate, 1); break;
                        case 'quarterly': nextDate = addMonths(baseDate, 3); break;
                        case 'annually': nextDate = addYears(baseDate, 1); break;
                        default: nextDate = addMonths(baseDate, 1);
                      }
                      setFormData({ ...formData, recurring: checked, next_due_date: nextDate });
                    } else {
                      setFormData({ ...formData, recurring: checked });
                    }
                  }} 
                />
              </div>

              {formData.recurring && (
                <div className="space-y-4 pt-3 border-t">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="frequency" className="text-sm">Frequency</Label>
                      <Select 
                        value={formData.frequency} 
                        onValueChange={(value: 'weekly' | 'monthly' | 'quarterly' | 'annually') => {
                          const baseDate = formData.date || new Date();
                          let nextDate: Date;
                          switch (value) {
                            case 'weekly': nextDate = addWeeks(baseDate, 1); break;
                            case 'monthly': nextDate = addMonths(baseDate, 1); break;
                            case 'quarterly': nextDate = addMonths(baseDate, 3); break;
                            case 'annually': nextDate = addYears(baseDate, 1); break;
                            default: nextDate = addMonths(baseDate, 1);
                          }
                          setFormData({ ...formData, frequency: value, next_due_date: nextDate });
                        }}
                      >
                        <SelectTrigger id="frequency" className="h-10">
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
                      <Label className="text-sm">Next Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className={cn('w-full justify-start text-left font-normal h-10', !formData.next_due_date && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.next_due_date ? format(formData.next_due_date, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarPicker 
                            mode="single" 
                            selected={formData.next_due_date} 
                            onSelect={date => date && setFormData({ ...formData, next_due_date: date })} 
                            initialFocus 
                            className="pointer-events-auto" 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <DialogFooter className="px-6 py-4 bg-muted/30 shrink-0">
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Recording as:</span>
                <Badge variant="outline" className="font-normal">{user?.email}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {mode === 'edit' && isOwner && (
                  <Button type="button" variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                    Delete
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={!isValid} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {mode === 'create' ? 'Record Expense' : 'Update Expense'}
                </Button>
              </div>
            </div>
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
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
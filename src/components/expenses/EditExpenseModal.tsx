import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2, Clock } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useAllExpenseCategories } from '@/hooks/useCustomCategories';
import { useSuppliers } from '@/hooks/useDatabase';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface EditExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: any;
  onSave: (id: number, updates: any) => void;
  onDelete: (id: number) => void;
}

const PAYMENT_METHODS: Array<{ value: 'cash' | 'card' | 'transfer' | 'check' | 'other'; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const VAT_RATES = [0, 5, 20];

const formatCategoryName = (category: string) => {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function EditExpenseModal({ open, onOpenChange, expense, onSave, onDelete }: EditExpenseModalProps) {
  const isOwner = useOwnerGuard();
  const { data: suppliers = [] } = useSuppliers();
  const { all: allCategories, custom: customCategories } = useAllExpenseCategories();
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'other',
    payment_method: 'cash',
    supplier_id: '',
    incurred_at: new Date(),
    is_cogs: false,
    notes: '',
    include_vat: false,
    vat_rate: 20,
    manual_vat_override: false,
    manual_vat_amount: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (expense && open) {
      const hasVat = !!expense.vat_rate || !!expense.vat_amount;
      setFormData({
        description: expense.description || '',
        amount: (expense.amount_inc_vat || expense.amount)?.toString() || '',
        category: expense.category || 'other',
        payment_method: expense.payment_method || 'cash',
        supplier_id: expense.supplier_id?.toString() || '',
        incurred_at: expense.incurred_at ? new Date(expense.incurred_at) : new Date(),
        is_cogs: expense.is_cogs || false,
        notes: expense.notes || '',
        include_vat: hasVat,
        vat_rate: expense.vat_rate || 20,
        manual_vat_override: false,
        manual_vat_amount: expense.vat_amount?.toString() || ''
      });
      setErrors({});
    }
  }, [expense, open]);

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
    
    const updates: any = {
      description: formData.description.trim(),
      category: formData.category,
      payment_method: formData.payment_method,
      supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
      incurred_at: formData.incurred_at.toISOString(),
      is_cogs: formData.is_cogs,
      notes: formData.notes.trim() || null
    };
    
    if (formData.include_vat) {
      updates.amount_ex_vat = vatBreakdown.amountExVat;
      updates.vat_amount = vatBreakdown.vatAmount;
      updates.vat_rate = formData.manual_vat_override ? null : formData.vat_rate;
      updates.amount_inc_vat = vatBreakdown.amountIncVat;
      updates.amount = vatBreakdown.amountIncVat;
    } else {
      updates.amount = parseFloat(formData.amount);
      updates.amount_ex_vat = null;
      updates.vat_amount = null;
      updates.vat_rate = null;
      updates.amount_inc_vat = null;
    }
    
    onSave(expense.id, updates);
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(expense.id);
    setShowDeleteDialog(false);
    onOpenChange(false);
  };

  if (!expense) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            {expense.created_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Clock className="h-3 w-3" />
                <span>Created {format(new Date(expense.created_at), 'PPp')}</span>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Office supplies"
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (Inc VAT if applicable) *</Label>
                <CurrencyInput
                  value={formData.amount}
                  onValueChange={(value) => setFormData({ ...formData, amount: value })}
                  error={errors.amount}
                />
              </div>
            </div>

            {/* VAT Toggle */}
            <div className="flex items-center gap-2">
              <Switch 
                id="include-vat" 
                checked={formData.include_vat} 
                onCheckedChange={checked => setFormData({
                  ...formData,
                  include_vat: checked,
                  manual_vat_override: false,
                  manual_vat_amount: ''
                })} 
              />
              <Label htmlFor="include-vat" className="cursor-pointer">
                Include VAT/Tax
              </Label>
            </div>

            {/* VAT Breakdown */}
            {formData.include_vat && (
              <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="vat-rate">VAT Rate</Label>
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
                      <SelectTrigger id="vat-rate" className={formData.manual_vat_override ? 'opacity-50' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_RATES.map(rate => (
                          <SelectItem key={rate} value={rate.toString()}>
                            {rate}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Manual VAT Override Toggle */}
                <div className="flex items-center gap-2">
                  <Switch 
                    id="manual-vat-override" 
                    checked={formData.manual_vat_override} 
                    onCheckedChange={checked => {
                      // When enabling override, pre-fill with calculated VAT
                      if (checked && !formData.manual_vat_amount) {
                        setFormData({
                          ...formData,
                          manual_vat_override: checked,
                          manual_vat_amount: vatBreakdown.vatAmount.toFixed(2)
                        });
                      } else {
                        setFormData({
                          ...formData,
                          manual_vat_override: checked
                        });
                      }
                    }} 
                  />
                  <Label htmlFor="manual-vat-override" className="cursor-pointer text-sm">
                    Override calculated VAT amount
                  </Label>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount (Ex VAT):</span>
                    <span className="font-medium">£{vatBreakdown.amountExVat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      VAT {formData.manual_vat_override ? '(Manual)' : `(${formData.vat_rate}%)`}:
                    </span>
                    {formData.manual_vat_override ? (
                      <div className="w-28">
                        <CurrencyInput
                          value={formData.manual_vat_amount}
                          onValueChange={value => setFormData({
                            ...formData,
                            manual_vat_amount: value
                          })}
                          error={errors.manual_vat}
                        />
                      </div>
                    ) : (
                      <span className="font-medium">£{vatBreakdown.vatAmount.toFixed(2)}</span>
                    )}
                  </div>
                  {errors.manual_vat && (
                    <p className="text-sm text-destructive">{errors.manual_vat}</p>
                  )}
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-semibold">Total (Inc VAT):</span>
                    <span className="font-semibold">
                      £{vatBreakdown.amountIncVat.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          {formatCategoryName(cat)}
                          {customCategories.includes(cat) && (
                            <Badge variant="secondary" className="text-xs">Custom</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                  <SelectTrigger id="payment_method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier (Optional)</Label>
                <Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.incurred_at, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.incurred_at}
                      onSelect={(date) => date && setFormData({ ...formData, incurred_at: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_cogs"
                checked={formData.is_cogs}
                onCheckedChange={(checked) => setFormData({ ...formData, is_cogs: checked })}
              />
              <Label htmlFor="is_cogs" className="cursor-pointer">
                Mark as Cost of Goods Sold (COGS)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {isOwner && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.description || !formData.amount}>
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
    </>
  );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { useAllExpenseCategories } from '@/hooks/useCustomCategories';
import { useSuppliers } from '@/hooks/useDatabase';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { Trash2, Clock } from 'lucide-react';
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
    notes: ''
  });
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (expense && open) {
      setFormData({
        description: expense.description || '',
        amount: expense.amount?.toString() || '',
        category: expense.category || 'other',
        payment_method: expense.payment_method || 'cash',
        supplier_id: expense.supplier_id?.toString() || '',
        incurred_at: expense.incurred_at ? new Date(expense.incurred_at) : new Date(),
        is_cogs: expense.is_cogs || false,
        notes: expense.notes || ''
      });
    }
  }, [expense, open]);

  const handleSave = () => {
    const updates = {
      description: formData.description.trim(),
      amount: parseFloat(formData.amount),
      category: formData.category,
      payment_method: formData.payment_method,
      supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
      incurred_at: formData.incurred_at.toISOString(),
      is_cogs: formData.is_cogs,
      notes: formData.notes.trim() || null
    };
    
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

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

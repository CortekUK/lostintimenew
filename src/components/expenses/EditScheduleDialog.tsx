import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useExpenseTemplates, ExpenseTemplate } from '@/hooks/useExpenseTemplates';
import { useAllExpenseCategories, formatCategoryDisplay } from '@/hooks/useCustomCategories';

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ExpenseTemplate | null;
}

export function EditScheduleDialog({ open, onOpenChange, template }: EditScheduleDialogProps) {
  const { updateTemplate, isUpdating } = useExpenseTemplates();
  const { all: allCategories = [] } = useAllExpenseCategories();
  
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<string>('monthly');
  const [nextDueDate, setNextDueDate] = useState<Date | undefined>();
  const [category, setCategory] = useState<string>('other');

  useEffect(() => {
    if (template && template.amount !== undefined) {
      setAmount(template.amount.toString());
      setFrequency(template.frequency || 'monthly');
      setNextDueDate(template.next_due_date ? new Date(template.next_due_date) : undefined);
      setCategory(template.category || 'other');
    }
  }, [template]);

  const handleSave = async () => {
    if (!template || !nextDueDate) return;
    
    updateTemplate({
      id: template.id,
      updates: {
        amount: parseFloat(amount),
        frequency: frequency as 'weekly' | 'monthly' | 'quarterly' | 'annually',
        next_due_date: nextDueDate.toISOString().split('T')[0],
        category,
      }
    });
    
    onOpenChange(false);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Recurring Schedule</DialogTitle>
          <DialogDescription>
            Update the recurring settings{template?.description ? ` for "${template.description}"` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
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
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !nextDueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextDueDate ? format(nextDueDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={nextDueDate}
                  onSelect={setNextDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!amount || !nextDueDate || isUpdating}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

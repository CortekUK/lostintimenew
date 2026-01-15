import { useState } from 'react';
import { format, addMonths, addQuarters, addYears } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RefreshCw, Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MakeRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: any;
  onConfirm: (frequency: string, nextDueDate: Date) => Promise<void>;
}

export function MakeRecurringDialog({
  open,
  onOpenChange,
  expense,
  onConfirm,
}: MakeRecurringDialogProps) {
  const [frequency, setFrequency] = useState<string>('monthly');
  const [nextDueDate, setNextDueDate] = useState<Date>(() => {
    // Default to one month from the expense date
    const expenseDate = expense?.incurred_at ? new Date(expense.incurred_at) : new Date();
    return addMonths(expenseDate, 1);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFrequencyChange = (value: string) => {
    setFrequency(value);
    // Auto-adjust next due date based on frequency
    const baseDate = expense?.incurred_at ? new Date(expense.incurred_at) : new Date();
    switch (value) {
      case 'weekly':
        setNextDueDate(new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000));
        break;
      case 'monthly':
        setNextDueDate(addMonths(baseDate, 1));
        break;
      case 'quarterly':
        setNextDueDate(addQuarters(baseDate, 1));
        break;
      case 'annually':
        setNextDueDate(addYears(baseDate, 1));
        break;
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(frequency, nextDueDate);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Make Recurring
          </DialogTitle>
          <DialogDescription>
            Create a recurring expense from this one. Future occurrences will be tracked automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="font-medium">{expense.description || 'Expense'}</p>
            <p className="text-sm text-muted-foreground">
              £{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} • {expense.category}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={frequency} onValueChange={handleFrequencyChange}>
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
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !nextDueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextDueDate ? format(nextDueDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={nextDueDate}
                  onSelect={(date) => date && setNextDueDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              This expense will recur {frequency} starting {format(nextDueDate, 'PPP')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Make Recurring
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
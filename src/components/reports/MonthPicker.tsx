import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { DateRange } from '@/types';

interface MonthPickerProps {
  dateRange: DateRange;
  onMonthSelect: (range: DateRange) => void;
  monthsToShow?: number;
  className?: string;
}

export function MonthPicker({ 
  dateRange, 
  onMonthSelect, 
  monthsToShow = 6,
  className 
}: MonthPickerProps) {
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    
    for (let i = 0; i < monthsToShow; i++) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      
      result.push({
        label: i === 0 ? 'This Month' : format(monthDate, 'MMM yyyy'),
        shortLabel: format(monthDate, 'MMM'),
        from: format(start, 'yyyy-MM-dd'),
        to: format(end, 'yyyy-MM-dd'),
        date: monthDate,
      });
    }
    
    return result;
  }, [monthsToShow]);

  const isMonthSelected = (month: typeof months[0]) => {
    if (!dateRange.from || !dateRange.to) return false;
    
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    const monthStart = startOfMonth(month.date);
    const monthEnd = endOfMonth(month.date);
    
    // Check if selected range matches this month exactly
    return isSameMonth(from, month.date) && 
           from.getDate() === monthStart.getDate() &&
           to.getDate() === monthEnd.getDate();
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {months.map((month) => (
        <Button
          key={month.from}
          variant={isMonthSelected(month) ? "default" : "outline"}
          size="sm"
          onClick={() => onMonthSelect({ from: month.from, to: month.to })}
          className={cn(
            "text-xs h-8 px-3",
            isMonthSelected(month) && "bg-primary text-primary-foreground"
          )}
        >
          {month.label}
        </Button>
      ))}
    </div>
  );
}

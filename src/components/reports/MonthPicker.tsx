import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from '@/types';

interface MonthPickerProps {
  dateRange: DateRange;
  onMonthSelect: (range: DateRange) => void;
  monthsToShow?: number;
  className?: string;
  showCustom?: boolean;
}

export function MonthPicker({ 
  dateRange, 
  onMonthSelect, 
  monthsToShow = 6,
  className,
  showCustom = true
}: MonthPickerProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: dateRange.from ? new Date(dateRange.from) : undefined,
    to: dateRange.to ? new Date(dateRange.to) : undefined,
  });

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
    
    return isSameMonth(from, month.date) && 
           from.getDate() === monthStart.getDate() &&
           to.getDate() === monthEnd.getDate();
  };

  const isCustomSelected = () => {
    if (!dateRange.from || !dateRange.to) return false;
    return !months.some(isMonthSelected);
  };

  const handleCustomApply = () => {
    if (customRange.from && customRange.to) {
      onMonthSelect({
        from: format(customRange.from, 'yyyy-MM-dd'),
        to: format(customRange.to, 'yyyy-MM-dd'),
      });
      setCustomOpen(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {months.map((month) => (
        <Button
          key={month.from}
          variant={isMonthSelected(month) ? "default" : "ghost"}
          size="sm"
          onClick={() => onMonthSelect({ from: month.from, to: month.to })}
          className={cn(
            "text-xs h-7 px-2.5 font-medium",
            isMonthSelected(month) 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {month.label}
        </Button>
      ))}
      
      {showCustom && (
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={isCustomSelected() ? "default" : "ghost"}
              size="sm"
              className={cn(
                "text-xs h-7 px-2.5 font-medium gap-1.5",
                isCustomSelected() 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {isCustomSelected() && dateRange.from && dateRange.to
                ? `${format(new Date(dateRange.from), 'MMM d')} - ${format(new Date(dateRange.to), 'MMM d')}`
                : 'Custom'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover" align="start">
            <Calendar
              mode="range"
              selected={{ from: customRange.from, to: customRange.to }}
              onSelect={(range) => setCustomRange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
            />
            <div className="flex justify-end gap-2 p-3 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setCustomOpen(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleCustomApply}
                disabled={!customRange.from || !customRange.to}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
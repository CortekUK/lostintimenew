import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDateRange } from '@/lib/utils';
import type { DateRange } from '@/types';

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rangeSelection, setRangeSelection] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });

  const presetRanges = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'This month', value: 'this-month' },
    { label: 'Last month', value: 'last-month' },
    { label: 'Custom range', value: 'custom' },
  ];

  const handlePresetChange = (preset: string) => {
    if (preset === 'custom') {
      setIsOpen(true);
      return;
    }
    
    const range = getDateRange(preset as any);
    onDateRangeChange(range);
  };

  const handleCustomRangeApply = () => {
    if (rangeSelection.from && rangeSelection.to) {
      onDateRangeChange({
        from: rangeSelection.from.toISOString().split('T')[0],
        to: rangeSelection.to.toISOString().split('T')[0],
      });
      setIsOpen(false);
      setRangeSelection({ from: undefined, to: undefined });
    }
  };

  // Smart month detection - check if range represents a full calendar month
  const isFullMonth = (from: Date, to: Date): boolean => {
    const firstOfMonth = startOfMonth(from);
    const lastOfMonth = endOfMonth(from);
    return isSameDay(from, firstOfMonth) && isSameDay(to, lastOfMonth);
  };

  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) {
      return 'All time';
    }
    
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return 'All time';
    }
    
    // Check if it's today
    const today = new Date();
    const isToday = format(from, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') &&
                   format(to, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    
    if (isToday) return 'Today';
    
    // Smart month detection - display as "January 2026" for full months
    if (isFullMonth(from, to)) {
      return format(from, 'MMMM yyyy');
    }
    
    // Check if it's a standard range
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 7) return 'Last 7 days';
    if (diffDays === 30) return 'Last 30 days';
    
    return `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}`;
  };

  return (
    <div className="flex items-center gap-2">
      <Select onValueChange={handlePresetChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={formatDateRange()} />
        </SelectTrigger>
        <SelectContent>
          {presetRanges.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              Select date range
            </div>
            <Calendar
              mode="range"
              selected={rangeSelection}
              onSelect={(range) => setRangeSelection({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {rangeSelection.from && rangeSelection.to ? (
                  `${format(rangeSelection.from, 'MMM d, yyyy')} - ${format(rangeSelection.to, 'MMM d, yyyy')}`
                ) : rangeSelection.from ? (
                  `${format(rangeSelection.from, 'MMM d, yyyy')} - Select end date`
                ) : (
                  'Select start date'
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setIsOpen(false);
                  setRangeSelection({ from: undefined, to: undefined });
                }}>
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleCustomRangeApply}
                  disabled={!rangeSelection.from || !rangeSelection.to}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useAllExpenseCategories } from '@/hooks/useCustomCategories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { ExpenseFilters } from '@/hooks/useExpenseAnalytics';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface ExpenseFiltersEnhancedProps {
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
  suppliers: any[];
  staffMembers: any[];
}

const CATEGORY_OPTIONS = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'fees', label: 'Fees' },
  { value: 'wages', label: 'Wages' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export function ExpenseFiltersEnhanced({
  filters,
  onFiltersChange,
  suppliers,
  staffMembers,
}: ExpenseFiltersEnhancedProps) {
  const [open, setOpen] = useState(false);
  const [debouncedMinAmount, setDebouncedMinAmount] = useState(filters.minAmount);
  const [debouncedMaxAmount, setDebouncedMaxAmount] = useState(filters.maxAmount);
  const { all: allCategories, custom: customCategories } = useAllExpenseCategories();

  // Debounce amount inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedMinAmount !== filters.minAmount) {
        onFiltersChange({ ...filters, minAmount: debouncedMinAmount });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedMinAmount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedMaxAmount !== filters.maxAmount) {
        onFiltersChange({ ...filters, maxAmount: debouncedMaxAmount });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedMaxAmount]);

  const activeFilterCount =
    (filters.dateRange ? 1 : 0) +
    (filters.categories?.length || 0) +
    (filters.suppliers?.length || 0) +
    (filters.staffMembers?.length || 0) +
    (filters.paymentMethods?.length || 0) +
    (filters.minAmount !== undefined ? 1 : 0) +
    (filters.maxAmount !== undefined ? 1 : 0) +
    (filters.isCogs !== undefined ? 1 : 0) +
    (filters.scheduleType !== undefined ? 1 : 0);

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const toggleCategory = (category: string) => {
    const current = filters.categories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    onFiltersChange({ ...filters, categories: updated.length > 0 ? updated : undefined });
  };

  const togglePaymentMethod = (method: string) => {
    const current = filters.paymentMethods || [];
    const updated = current.includes(method)
      ? current.filter(m => m !== method)
      : [...current, method];
    onFiltersChange({ ...filters, paymentMethods: updated.length > 0 ? updated : undefined });
  };

  const setQuickFilter = (type: 'month' | 'year') => {
    const now = new Date();
    const from = new Date(now.getFullYear(), type === 'month' ? now.getMonth() : 0, 1);
    const to = new Date();
    onFiltersChange({ ...filters, dateRange: { from, to } });
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filter Expenses</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear all
                  </Button>
                )}
              </div>

              <Separator />

              {/* Quick Date Filters */}
              <div className="space-y-2">
                <Label>Quick Filters</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setQuickFilter('month')}>
                    This Month
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickFilter('year')}>
                    This Year
                  </Button>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange ? (
                        <>
                          {format(filters.dateRange.from, 'PPP')} - {format(filters.dateRange.to, 'PPP')}
                        </>
                      ) : (
                        'Select date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={
                        filters.dateRange
                          ? { from: filters.dateRange.from, to: filters.dateRange.to }
                          : undefined
                      }
                      onSelect={(range) =>
                        onFiltersChange({
                          ...filters,
                          dateRange: range?.from && range?.to ? { from: range.from, to: range.to } : undefined,
                        })
                      }
                      numberOfMonths={2}
                      className={cn('pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(cat => (
                    <Badge
                      key={cat.value}
                      variant={filters.categories?.includes(cat.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCategory(cat.value)}
                    >
                      {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <Label>Payment Methods</Label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHOD_OPTIONS.map(pm => (
                    <Badge
                      key={pm.value}
                      variant={filters.paymentMethods?.includes(pm.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => togglePaymentMethod(pm.value)}
                    >
                      {pm.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Suppliers */}
              {suppliers.length > 0 && (
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select
                    value={filters.suppliers?.[0]?.toString() || 'all'}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        suppliers: value === 'all' ? undefined : [Number(value)],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All suppliers</SelectItem>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Staff Members */}
              {staffMembers.length > 0 && (
                <div className="space-y-2">
                  <Label>Staff Member</Label>
                  <Select
                    value={filters.staffMembers?.[0] || 'all'}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        staffMembers: value === 'all' ? undefined : [value],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All staff</SelectItem>
                      {staffMembers.map(staff => (
                        <SelectItem key={staff.user_id} value={staff.user_id}>
                          {staff.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Amount Range */}
              <div className="space-y-2">
                <Label>Amount Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={debouncedMinAmount || ''}
                      onChange={(e) =>
                        setDebouncedMinAmount(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={debouncedMaxAmount || ''}
                      onChange={(e) =>
                        setDebouncedMaxAmount(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Expense Type */}
              <div className="space-y-2">
                <Label>Expense Type</Label>
                <Select
                  value={
                    filters.isCogs === undefined
                      ? 'all'
                      : filters.isCogs
                      ? 'cogs'
                      : 'operating'
                  }
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      isCogs: value === 'all' ? undefined : value === 'cogs',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="operating">Operating Only</SelectItem>
                    <SelectItem value="cogs">COGS Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule Type */}
              <div className="space-y-2">
                <Label>Schedule</Label>
                <Select
                  value={filters.scheduleType || 'all'}
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      scheduleType: value === 'all' ? undefined : value as 'recurring' | 'one-time',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schedules</SelectItem>
                    <SelectItem value="recurring">Recurring Only</SelectItem>
                    <SelectItem value="one-time">One-time Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={clearAllFilters}>
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.dateRange && (
            <Badge variant="secondary" className="gap-1">
              {format(filters.dateRange.from, 'PP')} - {format(filters.dateRange.to, 'PP')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
              />
            </Badge>
          )}
          {filters.categories?.map(cat => (
            <Badge key={cat} variant="secondary" className="gap-1">
              {CATEGORY_OPTIONS.find(c => c.value === cat)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggleCategory(cat)}
              />
            </Badge>
          ))}
          {filters.paymentMethods?.map(pm => (
            <Badge key={pm} variant="secondary" className="gap-1">
              {PAYMENT_METHOD_OPTIONS.find(p => p.value === pm)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => togglePaymentMethod(pm)}
              />
            </Badge>
          ))}
          {filters.scheduleType && (
            <Badge variant="secondary" className="gap-1">
              {filters.scheduleType === 'recurring' ? 'Recurring' : 'One-time'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, scheduleType: undefined })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, X } from 'lucide-react';

export interface CustomerFilters {
  spendRange: string;
  purchaseCount: string;
  upcomingBirthday: boolean;
  upcomingAnniversary: boolean;
  metalPreference: string[];
  hasEmail: boolean;
  hasPhone: boolean;
}

export const defaultCustomerFilters: CustomerFilters = {
  spendRange: 'all',
  purchaseCount: 'all',
  upcomingBirthday: false,
  upcomingAnniversary: false,
  metalPreference: [],
  hasEmail: false,
  hasPhone: false,
};

interface CustomerFiltersProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  activeFiltersCount: number;
}

const SPEND_RANGES = [
  { value: 'all', label: 'Any spend' },
  { value: 'under-500', label: 'Under £500' },
  { value: '500-2000', label: '£500 - £2,000' },
  { value: '2000-5000', label: '£2,000 - £5,000' },
  { value: 'over-5000', label: 'Over £5,000' },
];

const PURCHASE_COUNTS = [
  { value: 'all', label: 'Any' },
  { value: '1', label: '1 purchase' },
  { value: '2-5', label: '2-5 purchases' },
  { value: '6+', label: '6+ purchases' },
];

const METAL_OPTIONS = ['Gold', 'Silver', 'Platinum', 'Rose Gold', 'White Gold'];

export function CustomerFiltersComponent({
  filters,
  onFiltersChange,
  activeFiltersCount,
}: CustomerFiltersProps) {
  const [open, setOpen] = useState(false);

  const updateFilter = <K extends keyof CustomerFilters>(
    key: K,
    value: CustomerFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleMetalPreference = (metal: string) => {
    const current = filters.metalPreference;
    const updated = current.includes(metal)
      ? current.filter((m) => m !== metal)
      : [...current, metal];
    updateFilter('metalPreference', updated);
  };

  const clearAllFilters = () => {
    onFiltersChange(defaultCustomerFilters);
  };

  const removeFilter = (key: string, subKey?: string) => {
    switch (key) {
      case 'spendRange':
        updateFilter('spendRange', 'all');
        break;
      case 'purchaseCount':
        updateFilter('purchaseCount', 'all');
        break;
      case 'upcomingBirthday':
        updateFilter('upcomingBirthday', false);
        break;
      case 'upcomingAnniversary':
        updateFilter('upcomingAnniversary', false);
        break;
      case 'metalPreference':
        if (subKey) {
          toggleMetalPreference(subKey);
        }
        break;
      case 'hasEmail':
        updateFilter('hasEmail', false);
        break;
      case 'hasPhone':
        updateFilter('hasPhone', false);
        break;
    }
  };

  // Build active filter badges
  const getActiveFilterBadges = () => {
    const badges: { key: string; subKey?: string; label: string }[] = [];

    if (filters.spendRange !== 'all') {
      const range = SPEND_RANGES.find((r) => r.value === filters.spendRange);
      badges.push({ key: 'spendRange', label: `Spend: ${range?.label}` });
    }

    if (filters.purchaseCount !== 'all') {
      const count = PURCHASE_COUNTS.find((c) => c.value === filters.purchaseCount);
      badges.push({ key: 'purchaseCount', label: `Purchases: ${count?.label}` });
    }

    if (filters.upcomingBirthday) {
      badges.push({ key: 'upcomingBirthday', label: 'Birthday in 30d' });
    }

    if (filters.upcomingAnniversary) {
      badges.push({ key: 'upcomingAnniversary', label: 'Anniversary in 30d' });
    }

    filters.metalPreference.forEach((metal) => {
      badges.push({ key: 'metalPreference', subKey: metal, label: `Metal: ${metal}` });
    });

    if (filters.hasEmail) {
      badges.push({ key: 'hasEmail', label: 'Has Email' });
    }

    if (filters.hasPhone) {
      badges.push({ key: 'hasPhone', label: 'Has Phone' });
    }

    return badges;
  };

  const activeBadges = getActiveFilterBadges();

  return (
    <div className="flex flex-col gap-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="default" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle>Filter Customers</SheetTitle>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-auto py-1 px-2 text-xs text-muted-foreground"
                >
                  Clear all
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
            <div className="space-y-6 px-3">
              {/* Spend Range */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Lifetime Spend</Label>
                <Select
                  value={filters.spendRange}
                  onValueChange={(value) => updateFilter('spendRange', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPEND_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Purchase Count */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Purchase Count</Label>
                <Select
                  value={filters.purchaseCount}
                  onValueChange={(value) => updateFilter('purchaseCount', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PURCHASE_COUNTS.map((count) => (
                      <SelectItem key={count.value} value={count.value}>
                        {count.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Upcoming Events */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Upcoming Events (30 days)</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="birthday"
                      checked={filters.upcomingBirthday}
                      onCheckedChange={(checked) =>
                        updateFilter('upcomingBirthday', !!checked)
                      }
                    />
                    <label
                      htmlFor="birthday"
                      className="text-sm leading-none cursor-pointer"
                    >
                      Upcoming Birthday
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="anniversary"
                      checked={filters.upcomingAnniversary}
                      onCheckedChange={(checked) =>
                        updateFilter('upcomingAnniversary', !!checked)
                      }
                    />
                    <label
                      htmlFor="anniversary"
                      className="text-sm leading-none cursor-pointer"
                    >
                      Upcoming Anniversary
                    </label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Metal Preference */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Metal Preference</Label>
                <div className="flex flex-wrap gap-2">
                  {METAL_OPTIONS.map((metal) => (
                    <Button
                      key={metal}
                      variant={filters.metalPreference.includes(metal) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleMetalPreference(metal)}
                    >
                      {metal}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Contact Information</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasEmail"
                      checked={filters.hasEmail}
                      onCheckedChange={(checked) => updateFilter('hasEmail', !!checked)}
                    />
                    <label
                      htmlFor="hasEmail"
                      className="text-sm leading-none cursor-pointer"
                    >
                      Has Email Address
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasPhone"
                      checked={filters.hasPhone}
                      onCheckedChange={(checked) => updateFilter('hasPhone', !!checked)}
                    />
                    <label
                      htmlFor="hasPhone"
                      className="text-sm leading-none cursor-pointer"
                    >
                      Has Phone Number
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Active Filter Badges */}
      {activeBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeBadges.map((badge, index) => (
            <Badge
              key={`${badge.key}-${badge.subKey || index}`}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {badge.label}
              <button
                onClick={() => removeFilter(badge.key, badge.subKey)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleChip } from '@/components/ui/toggle-chip';
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
  resultCount?: number;
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
  resultCount,
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
  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="flex flex-col gap-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="default" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-luxury">Filter Customers</SheetTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground h-8"
                >
                  Clear all
                </Button>
              )}
            </div>
            {resultCount !== undefined && (
              <p className="text-sm text-muted-foreground">
                {resultCount} {resultCount === 1 ? 'customer' : 'customers'} match
              </p>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-6 space-y-6">
              {/* Purchase History Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchase History</h4>
                
                <div className="space-y-4 rounded-lg border border-border/50 p-4 bg-muted/30">
                  {/* Spend Range */}
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                </div>
              </div>

              <Separator />

              {/* Preferences Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preferences</h4>
                
                <div className="space-y-4 rounded-lg border border-border/50 p-4 bg-muted/30">
                  {/* Metal Preference - toggle chips */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Metal Preference</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {METAL_OPTIONS.map((metal) => (
                        <ToggleChip
                          key={metal}
                          selected={filters.metalPreference.includes(metal)}
                          onToggle={() => toggleMetalPreference(metal)}
                        >
                          {metal}
                        </ToggleChip>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Events Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Events</h4>
                
                <div className="space-y-3 rounded-lg border border-border/50 p-4 bg-muted/30">
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
                      Birthday in next 30 days
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
                      Anniversary in next 30 days
                    </label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Info Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h4>
                
                <div className="space-y-3 rounded-lg border border-border/50 p-4 bg-muted/30">
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
                      Has email address
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
                      Has phone number
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <SheetFooter className="px-6 py-4 border-t bg-background">
            <div className="flex w-full gap-3">
              <Button 
                variant="outline" 
                onClick={clearAllFilters}
                disabled={!hasActiveFilters}
                className="flex-1"
              >
                Clear All
              </Button>
              <Button 
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Done
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </SheetFooter>
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

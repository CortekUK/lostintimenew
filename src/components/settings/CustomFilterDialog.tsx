import React, { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomFilter } from '@/contexts/SettingsContext';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import {
  Watch,
  CircleDot,
  Gem,
  Star,
  Sparkles,
  Filter,
  Tag,
  Heart,
  Crown,
  Diamond,
  Zap,
} from 'lucide-react';

interface CustomFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter?: CustomFilter;
  onSave: (filter: CustomFilter) => void;
}

const iconOptions = [
  { id: 'filter', label: 'Filter', icon: Filter },
  { id: 'tag', label: 'Tag', icon: Tag },
  { id: 'watch', label: 'Watch', icon: Watch },
  { id: 'ring', label: 'Ring', icon: CircleDot },
  { id: 'gem', label: 'Gem', icon: Gem },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'crown', label: 'Crown', icon: Crown },
  { id: 'diamond', label: 'Diamond', icon: Diamond },
  { id: 'zap', label: 'Zap', icon: Zap },
];

export function CustomFilterDialog({
  open,
  onOpenChange,
  filter,
  onSave,
}: CustomFilterDialogProps) {
  const { data: filterOptions } = useFilterOptions();
  
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('filter');
  const [categories, setCategories] = useState<string[]>([]);
  const [metals, setMetals] = useState<string[]>([]);
  const [karats, setKarats] = useState<string[]>([]);
  const [gemstones, setGemstones] = useState<string[]>([]);
  const [stockLevel, setStockLevel] = useState<'all' | 'in' | 'risk' | 'out'>('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [isTradeInOnly, setIsTradeInOnly] = useState(false);

  // Reset form when dialog opens/closes or filter changes
  useEffect(() => {
    if (open && filter) {
      setName(filter.name);
      setIcon(filter.icon || 'filter');
      setCategories(filter.filters.categories || []);
      setMetals(filter.filters.metals || []);
      setKarats(filter.filters.karats || []);
      setGemstones(filter.filters.gemstones || []);
      setStockLevel(filter.filters.stockLevel || 'all');
      setPriceMin(filter.filters.priceRange?.min?.toString() || '');
      setPriceMax(filter.filters.priceRange?.max?.toString() || '');
      setIsTradeInOnly(filter.filters.isTradeIn === 'trade_in_only');
    } else if (open) {
      // Reset for new filter
      setName('');
      setIcon('filter');
      setCategories([]);
      setMetals([]);
      setKarats([]);
      setGemstones([]);
      setStockLevel('all');
      setPriceMin('');
      setPriceMax('');
      setIsTradeInOnly(false);
    }
  }, [open, filter]);

  const handleSave = () => {
    const hasFilters = 
      categories.length > 0 ||
      metals.length > 0 ||
      karats.length > 0 ||
      gemstones.length > 0 ||
      stockLevel !== 'all' ||
      priceMin !== '' ||
      priceMax !== '' ||
      isTradeInOnly;

    if (!name.trim() || !hasFilters) {
      return;
    }

    const newFilter: CustomFilter = {
      id: filter?.id || `custom-${Date.now()}`,
      name: name.trim(),
      icon,
      filters: {
        ...(categories.length > 0 && { categories }),
        ...(metals.length > 0 && { metals }),
        ...(karats.length > 0 && { karats }),
        ...(gemstones.length > 0 && { gemstones }),
        ...(stockLevel !== 'all' && { stockLevel }),
        ...((priceMin !== '' || priceMax !== '') && {
          priceRange: {
            min: priceMin !== '' ? Number(priceMin) : 0,
            max: priceMax !== '' ? Number(priceMax) : 999999,
          },
        }),
        ...(isTradeInOnly && { isTradeIn: 'trade_in_only' as const }),
      },
    };

    onSave(newFilter);
    onOpenChange(false);
  };

  const toggleArrayItem = (
    array: string[],
    setArray: (arr: string[]) => void,
    item: string
  ) => {
    if (array.includes(item)) {
      setArray(array.filter((i) => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (categories.length > 0) count++;
    if (metals.length > 0) count++;
    if (karats.length > 0) count++;
    if (gemstones.length > 0) count++;
    if (stockLevel !== 'all') count++;
    if (priceMin !== '' || priceMax !== '') count++;
    if (isTradeInOnly) count++;
    return count;
  };

  const SelectedIcon = iconOptions.find((i) => i.id === icon)?.icon || Filter;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {filter ? 'Edit Custom Filter' : 'Create Custom Filter'}
          </DialogTitle>
          <DialogDescription>
            Create a filter shortcut with your preferred criteria.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Name & Icon */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="filter-name">Filter Name *</Label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-md bg-muted">
                    <SelectedIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="filter-name"
                    placeholder="e.g., High-End Watches"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((opt) => {
                    const IconComp = opt.icon;
                    return (
                      <Button
                        key={opt.id}
                        type="button"
                        variant={icon === opt.id ? 'default' : 'outline'}
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setIcon(opt.id)}
                      >
                        <IconComp className="h-4 w-4" />
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Separator />

            {/* Categories */}
            {filterOptions?.categories && filterOptions.categories.length > 0 && (
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.categories.map((cat) => (
                    <Badge
                      key={cat}
                      variant={categories.includes(cat) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem(categories, setCategories, cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metals */}
            {filterOptions?.metals && filterOptions.metals.length > 0 && (
              <div className="space-y-2">
                <Label>Metals</Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.metals.map((metal) => (
                    <Badge
                      key={metal}
                      variant={metals.includes(metal) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem(metals, setMetals, metal)}
                    >
                      {metal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Karats */}
            {filterOptions?.karats && filterOptions.karats.length > 0 && (
              <div className="space-y-2">
                <Label>Karats</Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.karats.map((karat) => (
                    <Badge
                      key={karat}
                      variant={karats.includes(karat) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem(karats, setKarats, karat)}
                    >
                      {karat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Gemstones */}
            {filterOptions?.gemstones && filterOptions.gemstones.length > 0 && (
              <div className="space-y-2">
                <Label>Gemstones</Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.gemstones.map((gem) => (
                    <Badge
                      key={gem}
                      variant={gemstones.includes(gem) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem(gemstones, setGemstones, gem)}
                    >
                      {gem}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Level */}
            <div className="space-y-2">
              <Label>Stock Level</Label>
              <Select value={stockLevel} onValueChange={(v: any) => setStockLevel(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                  <SelectItem value="risk">Low Stock / At Risk</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label>Price Range</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Min £"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  placeholder="Max £"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Part Exchange Only */}
            <div className="flex items-center justify-between">
              <Label htmlFor="trade-in-only">Part Exchange Only</Label>
              <Switch
                id="trade-in-only"
                checked={isTradeInOnly}
                onCheckedChange={setIsTradeInOnly}
              />
            </div>

            <Separator />

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled
                  >
                    <SelectedIcon className="h-3 w-3" />
                    {name || 'Filter Name'}
                  </Button>
                  <Badge variant="secondary" className="text-xs">
                    {getActiveFiltersCount()} criteria
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || getActiveFiltersCount() === 0}
          >
            {filter ? 'Save Changes' : 'Create Filter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
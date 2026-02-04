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
  Footprints,
  Shirt,
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
  { id: 'footprints', label: 'Shoes', icon: Footprints },
  { id: 'shirt', label: 'Clothing', icon: Shirt },
  { id: 'bag', label: 'Bag', icon: CircleDot },
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
  const [materials, setMaterials] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [stockLevel, setStockLevel] = useState<'all' | 'in' | 'risk' | 'out'>('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Reset form when dialog opens/closes or filter changes
  useEffect(() => {
    if (open && filter) {
      setName(filter.name);
      setIcon(filter.icon || 'filter');
      setCategories(filter.filters.categories || []);
      setMaterials(filter.filters.materials || []);
      setSizes(filter.filters.sizes || []);
      setColors(filter.filters.colors || []);
      setStockLevel(filter.filters.stockLevel || 'all');
      setPriceMin(filter.filters.priceRange?.min?.toString() || '');
      setPriceMax(filter.filters.priceRange?.max?.toString() || '');
    } else if (open) {
      // Reset for new filter
      setName('');
      setIcon('filter');
      setCategories([]);
      setMaterials([]);
      setSizes([]);
      setColors([]);
      setStockLevel('all');
      setPriceMin('');
      setPriceMax('');
    }
  }, [open, filter]);

  const handleSave = () => {
    const hasFilters = 
      categories.length > 0 ||
      materials.length > 0 ||
      sizes.length > 0 ||
      colors.length > 0 ||
      stockLevel !== 'all' ||
      priceMin !== '' ||
      priceMax !== '';

    if (!name.trim() || !hasFilters) {
      return;
    }

    const newFilter: CustomFilter = {
      id: filter?.id || `custom-${Date.now()}`,
      name: name.trim(),
      icon,
      filters: {
        ...(categories.length > 0 && { categories }),
        ...(materials.length > 0 && { materials }),
        ...(sizes.length > 0 && { sizes }),
        ...(colors.length > 0 && { colors }),
        ...(stockLevel !== 'all' && { stockLevel }),
        ...((priceMin !== '' || priceMax !== '') && {
          priceRange: {
            min: priceMin !== '' ? Number(priceMin) : 0,
            max: priceMax !== '' ? Number(priceMax) : 999999,
          },
        }),
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
    if (materials.length > 0) count++;
    if (sizes.length > 0) count++;
    if (colors.length > 0) count++;
    if (stockLevel !== 'all') count++;
    if (priceMin !== '' || priceMax !== '') count++;
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
            Create a quick-access filter button. Select the criteria below - when you click this filter, only products matching ALL selected options will show.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 py-4 px-1">
            {/* Name & Icon */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="filter-name">Filter Name *</Label>
                <div className="flex gap-2 px-0.5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-md bg-muted">
                    <SelectedIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="filter-name"
                    placeholder="e.g., Designer Trainers"
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
                <div>
                  <Label>Categories</Label>
                  <p className="text-xs text-muted-foreground mt-1">Select which categories to include in this filter</p>
                </div>
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

            {/* Materials */}
            {filterOptions?.materials && filterOptions.materials.length > 0 && (
              <div className="space-y-2">
                <div>
                  <Label>Materials</Label>
                  <p className="text-xs text-muted-foreground mt-1">Filter by specific materials (optional)</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.materials.map((material) => (
                    <Badge
                      key={material}
                      variant={materials.includes(material) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem(materials, setMaterials, material)}
                    >
                      {material}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {filterOptions?.sizes && filterOptions.sizes.length > 0 && (
              <div className="space-y-2">
                <Label>Sizes</Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.sizes.map((size) => (
                    <Badge
                      key={size}
                      variant={sizes.includes(size) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem(sizes, setSizes, size)}
                    >
                      {size}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {filterOptions?.colors && filterOptions.colors.length > 0 && (
              <div className="space-y-2">
                <Label>Colors</Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.colors.map((color) => (
                    <Badge
                      key={color}
                      variant={colors.includes(color) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem(colors, setColors, color)}
                    >
                      {color}
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
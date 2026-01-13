import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { Filter, X, Search, Package } from 'lucide-react';

interface EnhancedProductFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: {
    categories: string[];
    metals: string[];
    karats: string[];
    gemstones: string[];
    suppliers: string[];
    locations: string[];
    stockLevel: 'all' | 'in' | 'risk' | 'out';
    priceRange: { min: number; max: number };
    marginRange: { min: number; max: number };
    isTradeIn?: 'all' | 'trade_in_only' | 'non_trade_in';
    inventoryAge?: 'all' | '30' | '60' | '90';
  };
  onFiltersChange: (filters: any) => void;
  suppliers: Array<{ id: number; name: string }>;
  locations: Array<{ id: number; name: string }>;
  filterOptions: {
    categories: string[];
    metals: string[];
    karats: string[];
    gemstones: string[];
    priceRange: { min: number; max: number };
  };
  activeFilters: number;
}

export function EnhancedProductFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  suppliers,
  locations,
  filterOptions,
  activeFilters
}: EnhancedProductFiltersProps) {
  const [open, setOpen] = useState(false);

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      metals: [],
      karats: [],
      gemstones: [],
      suppliers: [],
      locations: [],
      stockLevel: 'all',
      priceRange: { min: filterOptions.priceRange.min, max: filterOptions.priceRange.max },
      marginRange: { min: 0, max: 100 },
      isTradeIn: 'all',
      inventoryAge: 'all'
    });
    onSearchChange('');
  };

  const removeFilter = (filterKey: string, value?: string) => {
    if (filterKey === 'searchQuery') {
      onSearchChange('');
    } else if (filterKey === 'stockLevel') {
      onFiltersChange({ ...filters, stockLevel: 'all' });
    } else if (filterKey === 'isTradeIn') {
      onFiltersChange({ ...filters, isTradeIn: 'all' });
    } else if (filterKey === 'inventoryAge') {
      onFiltersChange({ ...filters, inventoryAge: 'all' });
    } else if (filterKey === 'priceRange') {
      onFiltersChange({ 
        ...filters, 
        priceRange: { min: filterOptions.priceRange.min, max: filterOptions.priceRange.max } 
      });
    } else if (filterKey === 'marginRange') {
      onFiltersChange({ ...filters, marginRange: { min: 0, max: 100 } });
    } else if (Array.isArray(filters[filterKey])) {
      const newArray = filters[filterKey].filter((item: string) => item !== value);
      onFiltersChange({ ...filters, [filterKey]: newArray });
    }
  };

  const toggleArrayFilter = (filterKey: string, value: string) => {
    const currentArray = filters[filterKey] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item: string) => item !== value)
      : [...currentArray, value];
    onFiltersChange({ ...filters, [filterKey]: newArray });
  };

  const formatCurrency = (value: number) => isNaN(value) ? '£0' : `£${value.toLocaleString()}`;

  const getActiveFilterChips = () => {
    const chips = [];

    if (searchQuery) {
      chips.push({ key: 'searchQuery', label: `Search: "${searchQuery}"`, value: searchQuery });
    }

    filters.categories.forEach((category: string) => {
      chips.push({ key: 'categories', label: `Category: ${category}`, value: category });
    });

    filters.metals.forEach((metal: string) => {
      chips.push({ key: 'metals', label: `Metal: ${metal}`, value: metal });
    });

    filters.karats.forEach((karat: string) => {
      chips.push({ key: 'karats', label: `Karat: ${karat}`, value: karat });
    });

    filters.gemstones.forEach((gemstone: string) => {
      chips.push({ key: 'gemstones', label: `Gemstone: ${gemstone}`, value: gemstone });
    });

    filters.suppliers.forEach((supplierId: string) => {
      const supplier = suppliers.find(s => s.id.toString() === supplierId);
      if (supplier) {
        chips.push({ key: 'suppliers', label: `Supplier: ${supplier.name}`, value: supplierId });
      }
    });

    filters.locations?.forEach((locationId: string) => {
      const location = locations.find(l => l.id.toString() === locationId);
      if (location) {
        chips.push({ key: 'locations', label: `Location: ${location.name}`, value: locationId });
      }
    });

    if (filters.stockLevel !== 'all') {
      const stockLabels = { in: 'In Stock', risk: 'At Risk', out: 'Out of Stock' };
      chips.push({ key: 'stockLevel', label: `Stock: ${stockLabels[filters.stockLevel]}` });
    }

    if (filters.isTradeIn && filters.isTradeIn !== 'all') {
      chips.push({ 
        key: 'isTradeIn', 
        label: filters.isTradeIn === 'trade_in_only' ? 'Part Exchange Only' : 'Non-Trade-In Only' 
      });
    }

    if (filters.priceRange.min !== filterOptions.priceRange.min || filters.priceRange.max !== filterOptions.priceRange.max) {
      chips.push({ 
        key: 'priceRange', 
        label: `Price: ${formatCurrency(filters.priceRange.min)} - ${formatCurrency(filters.priceRange.max)}` 
      });
    }

    if (filters.marginRange.min !== 0 || filters.marginRange.max !== 100) {
      chips.push({ 
        key: 'marginRange', 
        label: `Margin: ${filters.marginRange.min}% - ${filters.marginRange.max}%` 
      });
    }

    if (filters.inventoryAge && filters.inventoryAge !== 'all') {
      chips.push({ 
        key: 'inventoryAge', 
        label: `Age: ${filters.inventoryAge}+ days` 
      });
    }

    return chips;
  };

  const activeChips = getActiveFilterChips();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative" data-filter-trigger>
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilters > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilters}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
          <SheetContent className="w-full sm:w-96 sm:max-w-96">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle className="font-luxury">Filter Products</SheetTitle>
                {activeFilters > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                )}
              </div>
              {/* Filter Summary */}
              {activeFilters > 0 && (
                <div className="text-sm text-muted-foreground">
                  {activeFilters} filter{activeFilters > 1 ? 's' : ''} applied
                </div>
              )}
            </SheetHeader>
            
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-6 py-4 px-1">
                {/* 1. Jewellery Type (Categories) - Toggle Chips */}
                <div className="space-y-3">
                  <Label className="font-luxury text-sm font-medium">Jewellery Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.categories.map((category) => (
                      <ToggleChip
                        key={category}
                        selected={filters.categories.includes(category)}
                        onToggle={() => toggleArrayFilter('categories', category)}
                      >
                        {category}
                      </ToggleChip>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 2. Metal - Toggle Chips */}
                <div className="space-y-3">
                  <Label className="font-luxury text-sm font-medium">Metal</Label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.metals.map((metal) => (
                      <ToggleChip
                        key={metal}
                        selected={filters.metals.includes(metal)}
                        onToggle={() => toggleArrayFilter('metals', metal)}
                      >
                        {metal}
                      </ToggleChip>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 3. Karat/Purity - Checkboxes */}
                <div className="space-y-3">
                  <Label className="font-luxury text-sm font-medium">Karat/Purity</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filterOptions.karats.map((karat) => (
                      <div key={karat} className="flex items-center space-x-2">
                        <Checkbox
                          id={`karat-${karat}`}
                          checked={filters.karats.includes(karat)}
                          onCheckedChange={() => toggleArrayFilter('karats', karat)}
                        />
                        <Label 
                          htmlFor={`karat-${karat}`} 
                          className="text-sm cursor-pointer"
                        >
                          {karat}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 4. Gemstone - Checkboxes */}
                <div className="space-y-3">
                  <Label className="font-luxury text-sm font-medium">Gemstone</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {filterOptions.gemstones.map((gemstone) => (
                      <div key={gemstone} className="flex items-center space-x-2">
                        <Checkbox
                          id={`gemstone-${gemstone}`}
                          checked={filters.gemstones.includes(gemstone)}
                          onCheckedChange={() => toggleArrayFilter('gemstones', gemstone)}
                        />
                        <Label 
                          htmlFor={`gemstone-${gemstone}`} 
                          className="text-sm cursor-pointer"
                        >
                          {gemstone}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 5. Supplier - Checkboxes */}
                <div className="space-y-3">
                  <Label className="font-luxury text-sm font-medium">Supplier</Label>
                  <div className="space-y-2">
                    {suppliers.map((supplier) => (
                      <div key={supplier.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`supplier-${supplier.id}`}
                          checked={filters.suppliers.includes(supplier.id.toString())}
                          onCheckedChange={() => toggleArrayFilter('suppliers', supplier.id.toString())}
                        />
                        <Label
                          htmlFor={`supplier-${supplier.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {supplier.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 6. Location - Select */}
                {locations.length > 0 && (
                  <>
                    <div className="space-y-3">
                      <Label className="font-luxury text-sm font-medium">Location</Label>
                      <Select
                        value={filters.locations?.length === 1 ? filters.locations[0] : 'all'}
                        onValueChange={(value) => {
                          if (value === 'all') {
                            onFiltersChange({...filters, locations: []});
                          } else {
                            onFiltersChange({...filters, locations: [value]});
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />
                  </>
                )}

                {/* 7. Part Exchange - Select */}
                <div className="space-y-3">
                  <Label className="font-luxury text-sm font-medium">Part Exchange</Label>
                  <Select 
                    value={filters.isTradeIn || 'all'} 
                    onValueChange={(value: 'all' | 'trade_in_only' | 'non_trade_in') => 
                      onFiltersChange({...filters, isTradeIn: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="trade_in_only">Part Exchange Only</SelectItem>
                      <SelectItem value="non_trade_in">Non-Trade-In Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* 7. Stock Level - Select */}
                <div className="space-y-3">
                  <Label className="font-luxury text-sm font-medium">Stock Level</Label>
                  <Select 
                    value={filters.stockLevel} 
                    onValueChange={(value: 'all' | 'in' | 'risk' | 'out') => 
                      onFiltersChange({...filters, stockLevel: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock Levels</SelectItem>
                      <SelectItem value="in">In Stock</SelectItem>
                      <SelectItem value="risk">At Risk</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* 8. Price Range - Slider */}
                <div className="space-y-3">
                  <Label className="font-luxury text-sm font-medium">Price Range</Label>
                  <div className="space-y-4 px-1">
                    <Slider
                      value={[
                        isNaN(filters.priceRange.min) ? 0 : filters.priceRange.min, 
                        isNaN(filters.priceRange.max) ? 10000 : filters.priceRange.max
                      ]}
                      onValueChange={([min, max]) => 
                        onFiltersChange({
                          ...filters, 
                          priceRange: { min, max }
                        })
                      }
                      min={isNaN(filterOptions.priceRange.min) ? 0 : filterOptions.priceRange.min}
                      max={isNaN(filterOptions.priceRange.max) ? 10000 : filterOptions.priceRange.max}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatCurrency(filters.priceRange.min)}</span>
                      <span>{formatCurrency(filters.priceRange.max)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 9. Inventory Age - Select */}
                <div className="space-y-3">
                  <Label className="font-luxury text-sm font-medium">Inventory Age</Label>
                  <Select 
                    value={filters.inventoryAge || 'all'} 
                    onValueChange={(value: 'all' | '30' | '60' | '90') => 
                      onFiltersChange({...filters, inventoryAge: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ages</SelectItem>
                      <SelectItem value="30">30+ Days</SelectItem>
                      <SelectItem value="60">60+ Days</SelectItem>
                      <SelectItem value="90">90+ Days (Aged)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* 10. Profit Margin - Slider */}
                <div className="space-y-3">
                  <Label className="font-luxury text-sm font-medium">Profit Margin</Label>
                  <div className="space-y-4 px-1">
                    <Slider
                      value={[filters.marginRange.min, filters.marginRange.max]}
                      onValueChange={([min, max]) => 
                        onFiltersChange({
                          ...filters, 
                          marginRange: { min, max }
                        })
                      }
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{filters.marginRange.min}%</span>
                      <span>{filters.marginRange.max}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
  );
}
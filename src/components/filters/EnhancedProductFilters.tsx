import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  resultCount?: number;
}

export function EnhancedProductFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  suppliers,
  locations,
  filterOptions,
  activeFilters,
  resultCount
}: EnhancedProductFiltersProps) {
  const [open, setOpen] = useState(false);
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      metals: [],
      karats: [],
      gemstones: [],
      suppliers: [],
      locations: [],
      priceRange: { min: filterOptions.priceRange.min, max: filterOptions.priceRange.max },
      marginRange: { min: 0, max: 100 },
      isTradeIn: 'all',
      inventoryAge: 'all'
    });
    onSearchChange('');
  };

  const toggleArrayFilter = (filterKey: string, value: string) => {
    const currentArray = filters[filterKey] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item: string) => item !== value)
      : [...currentArray, value];
    onFiltersChange({ ...filters, [filterKey]: newArray });
  };

  const handlePriceChange = (field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? (field === 'min' ? 0 : filterOptions.priceRange.max) : parseInt(value.replace(/[^0-9]/g, ''), 10);
    onFiltersChange({
      ...filters,
      priceRange: { ...filters.priceRange, [field]: isNaN(numValue) ? 0 : numValue }
    });
  };

  const handleMarginChange = (field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? (field === 'min' ? 0 : 100) : parseInt(value.replace(/[^0-9]/g, ''), 10);
    const clampedValue = Math.min(100, Math.max(0, isNaN(numValue) ? 0 : numValue));
    onFiltersChange({
      ...filters,
      marginRange: { ...filters.marginRange, [field]: clampedValue }
    });
  };

  const hasActiveFilters = activeFilters > 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-2" data-filter-trigger>
          <Filter className="h-4 w-4" />
          Filters
          {activeFilters > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
              {activeFilters}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-luxury">Filter Products</SheetTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground h-8">
                Clear all
              </Button>
            )}
          </div>
          {resultCount !== undefined && (
            <p className="text-sm text-muted-foreground">
              {resultCount} {resultCount === 1 ? 'product' : 'products'} match
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-6 space-y-6">
            {/* Product Attributes Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product Attributes</h4>
              
              <div className="space-y-4 rounded-lg border border-border/50 p-4 bg-muted/30">
                {/* Jewellery Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Jewellery Type</Label>
                  <div className="flex flex-wrap gap-1.5">
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

                {/* Metal */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Metal</Label>
                  <div className="flex flex-wrap gap-1.5">
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

                {/* Karat - now toggle chips */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Karat / Purity</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {filterOptions.karats.map((karat) => (
                      <ToggleChip
                        key={karat}
                        selected={filters.karats.includes(karat)}
                        onToggle={() => toggleArrayFilter('karats', karat)}
                      >
                        {karat}
                      </ToggleChip>
                    ))}
                  </div>
                </div>

                {/* Gemstone - now toggle chips */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Gemstone</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {filterOptions.gemstones.map((gemstone) => (
                      <ToggleChip
                        key={gemstone}
                        selected={filters.gemstones.includes(gemstone)}
                        onToggle={() => toggleArrayFilter('gemstones', gemstone)}
                      >
                        {gemstone}
                      </ToggleChip>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Source Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</h4>
              
              <div className="space-y-4 rounded-lg border border-border/50 p-4 bg-muted/30">
                {/* Supplier - searchable multi-select */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Supplier</Label>
                  <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={supplierPopoverOpen}
                        className="w-full justify-between h-auto min-h-10 font-normal"
                      >
                        {filters.suppliers.length === 0 ? (
                          <span className="text-muted-foreground">All Suppliers</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 py-0.5">
                            {filters.suppliers.slice(0, 2).map(id => {
                              const supplier = suppliers.find(s => s.id.toString() === id);
                              return (
                                <Badge key={id} variant="secondary" className="text-xs">
                                  {supplier?.name || id}
                                </Badge>
                              );
                            })}
                            {filters.suppliers.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{filters.suppliers.length - 2} more
                              </Badge>
                            )}
                          </div>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search suppliers..." />
                        <CommandList>
                          <CommandEmpty>No supplier found.</CommandEmpty>
                          <CommandGroup>
                            {suppliers.map((supplier) => (
                              <CommandItem
                                key={supplier.id}
                                value={supplier.name}
                                onSelect={() => toggleArrayFilter('suppliers', supplier.id.toString())}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    filters.suppliers.includes(supplier.id.toString()) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {supplier.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Location */}
                {locations.length > 1 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Location</Label>
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
                        <SelectValue placeholder="All Locations" />
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
                )}

                {/* Source Type (Part Exchange) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Source Type</Label>
                  <Select 
                    value={filters.isTradeIn || 'all'} 
                    onValueChange={(value: 'all' | 'trade_in_only' | 'non_trade_in') => 
                      onFiltersChange({...filters, isTradeIn: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="trade_in_only">Part Exchanges Only</SelectItem>
                      <SelectItem value="non_trade_in">Standard Stock Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Price & Age Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price & Age</h4>
              
              <div className="space-y-4 rounded-lg border border-border/50 p-4 bg-muted/30">
                {/* Price Range - text inputs */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Price Range</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={filters.priceRange.min === 0 ? '' : filters.priceRange.min.toLocaleString()}
                        onChange={(e) => handlePriceChange('min', e.target.value)}
                        placeholder="Min"
                        className="pl-7"
                      />
                    </div>
                    <span className="text-muted-foreground">–</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={filters.priceRange.max === filterOptions.priceRange.max ? '' : filters.priceRange.max.toLocaleString()}
                        onChange={(e) => handlePriceChange('max', e.target.value)}
                        placeholder="Max"
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>

                {/* Inventory Age */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Inventory Age</Label>
                  <Select 
                    value={filters.inventoryAge || 'all'} 
                    onValueChange={(value: 'all' | '30' | '60' | '90') => 
                      onFiltersChange({...filters, inventoryAge: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any Age" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Age</SelectItem>
                      <SelectItem value="30">Over 30 Days</SelectItem>
                      <SelectItem value="60">Over 60 Days</SelectItem>
                      <SelectItem value="90">Over 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Profit Margin - text inputs */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Profit Margin</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={filters.marginRange.min === 0 ? '' : filters.marginRange.min}
                        onChange={(e) => handleMarginChange('min', e.target.value)}
                        placeholder="Min"
                        className="pr-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                    <span className="text-muted-foreground">–</span>
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={filters.marginRange.max === 100 ? '' : filters.marginRange.max}
                        onChange={(e) => handleMarginChange('max', e.target.value)}
                        placeholder="Max"
                        className="pr-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
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
              {activeFilters > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

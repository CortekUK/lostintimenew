import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, X, Search, Package } from 'lucide-react';

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: {
    category: string;
    supplier: string;
    stockStatus: string;
    priceRange: { min: string; max: string };
    material: string;
  };
  onFiltersChange: (filters: any) => void;
  suppliers: Array<{ id: number; name: string }>;
  activeFilters: number;
}

export function ProductFilters({ 
  searchQuery, 
  onSearchChange, 
  filters, 
  onFiltersChange, 
  suppliers,
  activeFilters 
}: ProductFiltersProps) {
  const [open, setOpen] = useState(false);

  const clearAllFilters = () => {
    onFiltersChange({
      category: '',
      supplier: '',
      stockStatus: '',
      priceRange: { min: '', max: '' },
      material: ''
    });
    onSearchChange('');
  };

  const removeFilter = (filterKey: string, subKey?: string) => {
    if (subKey) {
      onFiltersChange({
        ...filters,
        [filterKey]: { ...filters[filterKey], [subKey]: '' }
      });
    } else {
      onFiltersChange({
        ...filters,
        [filterKey]: ''
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilters > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Filter Products</CardTitle>
                  {activeFilters > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category</Label>
                  <Select value={filters.category} onValueChange={(value) => onFiltersChange({...filters, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      <SelectItem value="Bags">Bags</SelectItem>
                      <SelectItem value="Shoes">Shoes</SelectItem>
                      <SelectItem value="Dresses">Dresses</SelectItem>
                      <SelectItem value="Coats">Coats & Jackets</SelectItem>
                      <SelectItem value="Tops">Tops</SelectItem>
                      <SelectItem value="Accessories">Accessories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Supplier Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Supplier</Label>
                  <Select value={filters.supplier} onValueChange={(value) => onFiltersChange({...filters, supplier: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All suppliers</SelectItem>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stock Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Stock Status</Label>
                  <Select value={filters.stockStatus} onValueChange={(value) => onFiltersChange({...filters, stockStatus: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All stock levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All stock levels</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low-stock">Low Stock (&lt; 5)</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Material Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Material</Label>
                  <Select value={filters.material} onValueChange={(value) => onFiltersChange({...filters, material: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All materials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All materials</SelectItem>
                      <SelectItem value="Leather">Leather</SelectItem>
                      <SelectItem value="Silk">Silk</SelectItem>
                      <SelectItem value="Cashmere">Cashmere</SelectItem>
                      <SelectItem value="Cotton">Cotton</SelectItem>
                      <SelectItem value="Wool">Wool</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Price Range Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Price Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Min price"
                      value={filters.priceRange.min}
                      onChange={(e) => onFiltersChange({
                        ...filters,
                        priceRange: { ...filters.priceRange, min: e.target.value }
                      })}
                      type="number"
                      step="0.01"
                    />
                    <Input
                      placeholder="Max price"
                      value={filters.priceRange.max}
                      onChange={(e) => onFiltersChange({
                        ...filters,
                        priceRange: { ...filters.priceRange, max: e.target.value }
                      })}
                      type="number"
                      step="0.01"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchQuery}"
              <X className="h-3 w-3 cursor-pointer" onClick={() => onSearchChange('')} />
            </Badge>
          )}
          
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              Category: {filters.category}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('category')} />
            </Badge>
          )}
          
          {filters.supplier && (
            <Badge variant="secondary" className="gap-1">
              Supplier: {suppliers.find(s => s.id.toString() === filters.supplier)?.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('supplier')} />
            </Badge>
          )}
          
          {filters.stockStatus && (
            <Badge variant="secondary" className="gap-1">
              Stock: {filters.stockStatus.replace('-', ' ')}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('stockStatus')} />
            </Badge>
          )}
          
          {filters.material && (
            <Badge variant="secondary" className="gap-1">
              Material: {filters.material}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('material')} />
            </Badge>
          )}
          
          {(filters.priceRange.min || filters.priceRange.max) && (
            <Badge variant="secondary" className="gap-1">
              Price: £{filters.priceRange.min || '0'} - £{filters.priceRange.max || '∞'}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('priceRange', 'min')} />
            </Badge>
          )}
          
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
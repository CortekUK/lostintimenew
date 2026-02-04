import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Watch, 
  CircleDot, 
  Gem, 
  Heart,
  Star,
  Coins,
  Sparkles,
  Crown,
  Diamond,
  Zap,
  Package,
  AlertTriangle,
  X,
  Settings,
  PoundSterling,
  Repeat,
  Filter,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings, CustomFilter } from '@/contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';

interface QuickFiltersProps {
  filters: {
    categories: string[];
    materials: string[];
    sizes: string[];
    colors: string[];
    brands: string[];
    conditionGrades: string[];
    authenticationStatus: string[];
    suppliers: string[];
    priceRange: { min: number; max: number };
    marginRange: { min: number; max: number };
    stockLevel?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  };
  onFiltersChange: (filters: any) => void;
  filterOptions: {
    categories: string[];
    materials: string[];
    sizes: string[];
    colors: string[];
    brands: { id: number; name: string; tier: string | null }[];
    priceRange: { min: number; max: number };
  };
  onOpenFullFilters: () => void;
  activeFilters: number;
  onClearAll: () => void;
}

interface PresetConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type: 'category' | 'material' | 'condition' | 'brand-tier' | 'stock' | 'price';
  filterValue: any;
}

// All available presets - must match IDs in Settings.tsx availablePresets
const allPresets: PresetConfig[] = [
  // Categories
  { id: 'bags', label: 'Bags', icon: Package, type: 'category', filterValue: { categories: ['Bags', 'Handbags', 'Clutches'] } },
  { id: 'shoes', label: 'Shoes', icon: Sparkles, type: 'category', filterValue: { categories: ['Shoes', 'Boots', 'Heels', 'Sneakers'] } },
  { id: 'dresses', label: 'Dresses', icon: Heart, type: 'category', filterValue: { categories: ['Dresses'] } },
  { id: 'coats', label: 'Coats & Jackets', icon: Gem, type: 'category', filterValue: { categories: ['Coats', 'Jackets', 'Blazers'] } },
  { id: 'tops', label: 'Tops', icon: Star, type: 'category', filterValue: { categories: ['Tops', 'T-Shirts', 'Shirts', 'Blouses'] } },
  { id: 'accessories', label: 'Accessories', icon: Crown, type: 'category', filterValue: { categories: ['Accessories', 'Scarves', 'Belts', 'Hats'] } },
  
  // Materials
  { id: 'leather', label: 'Leather', icon: Zap, type: 'material', filterValue: { materials: ['Leather'] } },
  { id: 'silk', label: 'Silk', icon: Sparkles, type: 'material', filterValue: { materials: ['Silk'] } },
  { id: 'cashmere', label: 'Cashmere', icon: Diamond, type: 'material', filterValue: { materials: ['Cashmere'] } },
  { id: 'cotton', label: 'Cotton', icon: Coins, type: 'material', filterValue: { materials: ['Cotton'] } },
  { id: 'wool', label: 'Wool', icon: Crown, type: 'material', filterValue: { materials: ['Wool'] } },
  
  // Condition (maps to condition_grade filter)
  { id: 'new-with-tags', label: 'New with Tags', icon: Tag, type: 'condition', filterValue: { conditionGrades: ['new_with_tags'] } },
  { id: 'excellent', label: 'Excellent', icon: Star, type: 'condition', filterValue: { conditionGrades: ['excellent'] } },
  { id: 'very-good', label: 'Very Good', icon: CircleDot, type: 'condition', filterValue: { conditionGrades: ['very_good'] } },
  
  // Brand Tier
  { id: 'luxury', label: 'Luxury', icon: Crown, type: 'brand-tier', filterValue: { brandTiers: ['luxury'] } },
  { id: 'premium', label: 'Premium', icon: Diamond, type: 'brand-tier', filterValue: { brandTiers: ['premium'] } },
  
  // Stock
  { id: 'in-stock', label: 'In Stock', icon: Package, type: 'stock', filterValue: { stockLevel: 'in_stock' } },
  { id: 'low-stock', label: 'Low Stock', icon: AlertTriangle, type: 'stock', filterValue: { stockLevel: 'low_stock' } },
  { id: 'out-of-stock', label: 'Out of Stock', icon: X, type: 'stock', filterValue: { stockLevel: 'out_of_stock' } },
  
  // Price presets
  { id: 'under-500', label: '< £500', icon: PoundSterling, type: 'price', filterValue: { priceRange: { min: 0, max: 500 } } },
  { id: '500-1k', label: '£500–£1k', icon: PoundSterling, type: 'price', filterValue: { priceRange: { min: 500, max: 1000 } } },
  { id: '1k-5k', label: '£1k–£5k', icon: PoundSterling, type: 'price', filterValue: { priceRange: { min: 1000, max: 5000 } } },
  { id: 'over-5k', label: '> £5k', icon: PoundSterling, type: 'price', filterValue: { priceRange: { min: 5000, max: 100000 } } },
];

export function QuickFilters({
  filters,
  onFiltersChange,
  filterOptions,
  onOpenFullFilters,
  onClearAll
}: QuickFiltersProps) {
  const { settings } = useSettings();
  const navigate = useNavigate();

  // Filter presets based on settings
  const activePresets = allPresets.filter(preset => 
    settings.quickFilterPresets.includes(preset.id)
  );

  // Icon map for custom filters
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    filter: Filter,
    tag: Tag,
    watch: Watch,
    bag: CircleDot,
    gem: Gem,
    star: Star,
    sparkles: Sparkles,
    heart: Heart,
    crown: Crown,
    diamond: Diamond,
    zap: Zap,
  };

  // Check if a custom filter is active
  const isCustomFilterActive = (customFilter: CustomFilter): boolean => {
    const cf = customFilter.filters;
    
    // Check categories
    if (cf.categories?.length) {
      const allCategoriesActive = cf.categories.every(cat => filters.categories.includes(cat));
      if (!allCategoriesActive) return false;
    }
    
    // Check materials
    if (cf.materials?.length) {
      const allMaterialsActive = cf.materials.every(material => filters.materials.includes(material));
      if (!allMaterialsActive) return false;
    }
    
    // Check price range
    if (cf.priceRange) {
      if (filters.priceRange.min !== cf.priceRange.min || filters.priceRange.max !== cf.priceRange.max) {
        return false;
      }
    }
    
    // If we have criteria and all matched, it's active
    const hasCriteria = 
      (cf.categories?.length || 0) > 0 ||
      (cf.materials?.length || 0) > 0 ||
      !!cf.priceRange;
    
    return !!hasCriteria;
  };

  // Toggle custom filter
  const toggleCustomFilter = (customFilter: CustomFilter) => {
    const isActive = isCustomFilterActive(customFilter);
    const cf = customFilter.filters;
    
    if (isActive) {
      // Deactivate - remove all criteria
      let newFilters = { ...filters };
      
      if (cf.categories?.length) {
        newFilters.categories = filters.categories.filter(cat => !cf.categories!.includes(cat));
      }
      if (cf.materials?.length) {
        newFilters.materials = filters.materials.filter(material => !cf.materials!.includes(material));
      }
      if (cf.priceRange) {
        newFilters.priceRange = {
          min: filterOptions.priceRange.min,
          max: filterOptions.priceRange.max
        };
      }
      
      onFiltersChange(newFilters);
    } else {
      // Activate - apply all criteria
      let newFilters = { ...filters };
      
      if (cf.categories?.length) {
        newFilters.categories = [...new Set([...filters.categories, ...cf.categories])];
      }
      if (cf.materials?.length) {
        newFilters.materials = [...new Set([...filters.materials, ...cf.materials])];
      }
      if (cf.priceRange) {
        newFilters.priceRange = cf.priceRange;
      }
      
      onFiltersChange(newFilters);
    }
  };

  const isPresetActive = (preset: PresetConfig): boolean => {
    switch (preset.type) {
      case 'category':
        return preset.filterValue.categories.some((cat: string) => filters.categories.includes(cat));
      case 'material':
        return preset.filterValue.materials.some((material: string) => filters.materials.includes(material));
      case 'condition':
        return preset.filterValue.conditionGrades.some((grade: string) => filters.conditionGrades?.includes(grade));
      case 'brand-tier':
        // Check if any brands with this tier are selected
        const tierBrands = filterOptions.brands?.filter(b => 
          preset.filterValue.brandTiers.includes(b.tier)
        ).map(b => b.id.toString()) || [];
        return tierBrands.some(brandId => filters.brands?.includes(brandId));
      case 'stock':
        return filters.stockLevel === preset.filterValue.stockLevel;
      case 'price':
        const { min, max } = preset.filterValue.priceRange;
        return filters.priceRange.min === min && filters.priceRange.max === max;
      default:
        return false;
    }
  };

  const togglePreset = (preset: PresetConfig) => {
    const isActive = isPresetActive(preset);
    
    switch (preset.type) {
      case 'category':
        const newCategories = isActive 
          ? filters.categories.filter(cat => !preset.filterValue.categories.includes(cat))
          : [...new Set([...filters.categories, ...preset.filterValue.categories])];
        onFiltersChange({ ...filters, categories: newCategories });
        break;
        
      case 'material':
        const newMaterials = isActive
          ? filters.materials.filter(material => !preset.filterValue.materials.includes(material))
          : [...new Set([...filters.materials, ...preset.filterValue.materials])];
        onFiltersChange({ ...filters, materials: newMaterials });
        break;
        
      case 'condition':
        const newConditionGrades = isActive
          ? (filters.conditionGrades || []).filter(grade => !preset.filterValue.conditionGrades.includes(grade))
          : [...new Set([...(filters.conditionGrades || []), ...preset.filterValue.conditionGrades])];
        onFiltersChange({ ...filters, conditionGrades: newConditionGrades });
        break;
        
      case 'brand-tier':
        // Add/remove all brands of this tier
        const tierBrandIds = filterOptions.brands?.filter(b => 
          preset.filterValue.brandTiers.includes(b.tier)
        ).map(b => b.id.toString()) || [];
        const newBrands = isActive
          ? (filters.brands || []).filter(brandId => !tierBrandIds.includes(brandId))
          : [...new Set([...(filters.brands || []), ...tierBrandIds])];
        onFiltersChange({ ...filters, brands: newBrands });
        break;
        
      case 'stock':
        const newStockLevel = isActive ? 'all' : preset.filterValue.stockLevel;
        onFiltersChange({ ...filters, stockLevel: newStockLevel });
        break;
        
      case 'price':
        if (isActive) {
          // Reset to full range if this preset is active
          onFiltersChange({ 
            ...filters, 
            priceRange: { 
              min: filterOptions.priceRange.min, 
              max: filterOptions.priceRange.max 
            } 
          });
        } else {
          // Apply this preset (price presets are mutually exclusive)
          onFiltersChange({ ...filters, priceRange: preset.filterValue.priceRange });
        }
        break;
    }
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Quick Filter Pills */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
               style={{ width: '100%', maxWidth: 'calc(100vw - 8rem)' }}>
            {activePresets.map((preset) => {
              const isActive = isPresetActive(preset);
              const Icon = preset.icon;
              
              return (
                <Button
                  key={preset.id}
                  variant="outline" 
                  size="sm"
                  onClick={() => togglePreset(preset)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap transition-all flex-shrink-0",
                    isActive 
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-gold" 
                      : "hover:border-primary/50 hover:bg-primary/5"
                  )}
                  aria-pressed={isActive}
                >
                  <Icon className="h-3 w-3" />
                  {preset.label}
                </Button>
              );
            })}

            {/* Custom Filters */}
            {(settings.customFilters || []).map((customFilter) => {
              const isActive = isCustomFilterActive(customFilter);
              const CustomIcon = iconMap[customFilter.icon || 'filter'] || Filter;
              
              return (
                <Button
                  key={customFilter.id}
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleCustomFilter(customFilter)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap transition-all flex-shrink-0",
                    isActive 
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-gold" 
                      : "hover:border-primary/50 hover:bg-primary/5 border-dashed"
                  )}
                  aria-pressed={isActive}
                >
                  <CustomIcon className="h-3 w-3" />
                  {customFilter.name}
                </Button>
              );
            })}
            
            {/* Edit Quick Filters Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings?section=quick-filters')}
              className="flex items-center gap-2 whitespace-nowrap hover:border-primary/50 hover:bg-primary/5 flex-shrink-0"
            >
              <Settings className="h-3 w-3" />
              Edit
            </Button>
          </div>
        </div>
        
        {/* Clear All Button */}
        {(filters.categories.length > 0 || 
          filters.materials.length > 0 || 
          filters.priceRange.min > filterOptions.priceRange.min ||
          filters.priceRange.max < filterOptions.priceRange.max) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Summary */}
      {(filters.categories.length > 0 || 
        filters.materials.length > 0 || 
        filters.priceRange.min > filterOptions.priceRange.min ||
        filters.priceRange.max < filterOptions.priceRange.max) && (
        <div className="flex flex-wrap gap-2">
          {filters.categories.map((category) => (
            <Badge 
              key={category} 
              variant="secondary" 
              className="flex items-center gap-1"
            >
              {category}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => {
                  const newCategories = filters.categories.filter(c => c !== category);
                  onFiltersChange({ ...filters, categories: newCategories });
                }}
              />
            </Badge>
          ))}
          
          {filters.materials.map((material) => (
            <Badge 
              key={material} 
              variant="secondary" 
              className="flex items-center gap-1"
            >
              {material}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => {
                  const newMaterials = filters.materials.filter(m => m !== material);
                  onFiltersChange({ ...filters, materials: newMaterials });
                }}
              />
            </Badge>
          ))}
          
          {(filters.priceRange.min > filterOptions.priceRange.min ||
            filters.priceRange.max < filterOptions.priceRange.max) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              £{filters.priceRange.min.toLocaleString()} - £{filters.priceRange.max.toLocaleString()}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onFiltersChange({ 
                  ...filters, 
                  priceRange: { 
                    min: filterOptions.priceRange.min, 
                    max: filterOptions.priceRange.max 
                  } 
                })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
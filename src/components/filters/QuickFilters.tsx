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
    metals: string[];
    karats: string[];
    gemstones: string[];
    suppliers: string[];
    priceRange: { min: number; max: number };
    marginRange: { min: number; max: number };
    isTradeIn?: 'all' | 'trade_in_only' | 'non_trade_in';
  };
  onFiltersChange: (filters: any) => void;
  filterOptions: {
    categories: string[];
    metals: string[];
    karats: string[];
    gemstones: string[];
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
  type: 'category' | 'metal' | 'stock' | 'price';
  filterValue: any;
}

// All available presets
const allPresets: PresetConfig[] = [
  // Most popular categories
  { id: 'watches', label: 'Watches', icon: Watch, type: 'category', filterValue: { categories: ['Watches'] } },
  { id: 'rings', label: 'Rings', icon: CircleDot, type: 'category', filterValue: { categories: ['Rings'] } },
  { id: 'necklaces', label: 'Necklaces', icon: Gem, type: 'category', filterValue: { categories: ['Necklaces'] } },
  { id: 'bracelets', label: 'Bracelets', icon: Heart, type: 'category', filterValue: { categories: ['Bracelets'] } },
  { id: 'earrings', label: 'Earrings', icon: Star, type: 'category', filterValue: { categories: ['Earrings'] } },
  
  // Most popular metals
  { id: 'gold', label: 'Gold', icon: Coins, type: 'metal', filterValue: { metals: ['Gold', 'Yellow Gold'] } },
  { id: 'white-gold', label: 'White Gold', icon: Sparkles, type: 'metal', filterValue: { metals: ['White Gold'] } },
  { id: 'rose-gold', label: 'Rose Gold', icon: Crown, type: 'metal', filterValue: { metals: ['Rose Gold'] } },
  { id: 'silver', label: 'Silver', icon: Diamond, type: 'metal', filterValue: { metals: ['Silver'] } },
  { id: 'platinum', label: 'Platinum', icon: Zap, type: 'metal', filterValue: { metals: ['Platinum'] } },
  
  // Part Exchange filter
  { id: 'part-exchange', label: 'Part Exchange', icon: Repeat, type: 'stock', filterValue: { isTradeIn: 'trade_in_only' } },
  
  // Price presets
  { id: 'under-1k', label: '< £1k', icon: PoundSterling, type: 'price', filterValue: { priceRange: { min: 0, max: 1000 } } },
  { id: '1k-5k', label: '£1k–£5k', icon: PoundSterling, type: 'price', filterValue: { priceRange: { min: 1000, max: 5000 } } },
  { id: '5k-10k', label: '£5k–£10k', icon: PoundSterling, type: 'price', filterValue: { priceRange: { min: 5000, max: 10000 } } },
  { id: 'over-10k', label: '> £10k', icon: PoundSterling, type: 'price', filterValue: { priceRange: { min: 10000, max: 50000 } } },
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
    ring: CircleDot,
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
    
    // Check metals
    if (cf.metals?.length) {
      const allMetalsActive = cf.metals.every(metal => filters.metals.includes(metal));
      if (!allMetalsActive) return false;
    }
    
    // Check trade-in
    if (cf.isTradeIn === 'trade_in_only') {
      if (filters.isTradeIn !== 'trade_in_only') return false;
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
      (cf.metals?.length || 0) > 0 ||
      cf.isTradeIn === 'trade_in_only' ||
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
      if (cf.metals?.length) {
        newFilters.metals = filters.metals.filter(metal => !cf.metals!.includes(metal));
      }
      if (cf.isTradeIn === 'trade_in_only') {
        newFilters.isTradeIn = 'all';
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
      if (cf.metals?.length) {
        newFilters.metals = [...new Set([...filters.metals, ...cf.metals])];
      }
      if (cf.isTradeIn === 'trade_in_only') {
        newFilters.isTradeIn = 'trade_in_only';
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
      case 'metal':
        return preset.filterValue.metals.some((metal: string) => filters.metals.includes(metal));
      case 'stock':
        // Handle trade-in filter only
        if (preset.filterValue.isTradeIn) {
          return filters.isTradeIn === preset.filterValue.isTradeIn;
        }
        return false;
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
        
      case 'metal':
        const newMetals = isActive
          ? filters.metals.filter(metal => !preset.filterValue.metals.includes(metal))
          : [...new Set([...filters.metals, ...preset.filterValue.metals])];
        onFiltersChange({ ...filters, metals: newMetals });
        break;
        
      case 'stock':
        // Handle trade-in filter only
        if (preset.filterValue.isTradeIn) {
          const newTradeIn = isActive ? 'all' : preset.filterValue.isTradeIn;
          onFiltersChange({ ...filters, isTradeIn: newTradeIn });
        }
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
          filters.metals.length > 0 || 
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
        filters.metals.length > 0 || 
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
          
          {filters.metals.map((metal) => (
            <Badge 
              key={metal} 
              variant="secondary" 
              className="flex items-center gap-1"
            >
              {metal}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => {
                  const newMetals = filters.metals.filter(m => m !== metal);
                  onFiltersChange({ ...filters, metals: newMetals });
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
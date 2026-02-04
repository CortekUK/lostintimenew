import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useOmniSearch, SearchResult } from '@/hooks/useOmniSearch';
import { Package, Hash, Building2, Receipt, Clock, Search } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getResultIcon = (kind: string) => {
  switch (kind) {
    case 'product': return Package;
    case 'serial': return Hash;
    case 'supplier': return Building2;
    case 'sale': return Receipt;
    default: return Search;
  }
};

const getResultActions = (result: SearchResult) => {
  switch (result.kind) {
    case 'product':
      return [
        { label: 'View', action: 'navigate' },
        { label: 'Add to Cart', action: 'cart' }
      ];
    case 'serial':
    case 'supplier':
    case 'sale':
      return [{ label: 'Open', action: 'navigate' }];
    default:
      return [];
  }
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { search, results, loading, recentSearches, clearResults } = useOmniSearch();
  const navigate = useNavigate();

  // Group results by kind
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.kind]) acc[result.kind] = [];
    acc[result.kind].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const allResults = results;
  const showRecent = !query.trim() && recentSearches.length > 0;

  useEffect(() => {
    if (query.trim()) {
      search(query);
    } else {
      clearResults();
    }
  }, [query, search, clearResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = useCallback((result: SearchResult, action: string = 'navigate') => {
    if (action === 'navigate') {
      navigate(result.url);
      onOpenChange(false);
      setQuery('');
    }
    // TODO: Implement cart actions when cart context exists
  }, [navigate, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(allResults[selectedIndex]);
    }
  }, [allResults, selectedIndex, handleSelect]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
      clearResults();
    }
  }, [open, clearResults]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search products, serials, suppliers, sales... (try 'sku:' or 'material:cotton')"
        value={query}
        onValueChange={setQuery}
        onKeyDown={handleKeyDown}
        className="text-base"
      />
      <CommandList className="max-h-96">
        {loading && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Search className="mr-2 h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <CommandEmpty>
            <div className="text-center py-6">
              <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try using operators like sku:, material:, or cat:
              </p>
            </div>
          </CommandEmpty>
        )}

        {showRecent && (
          <CommandGroup heading="Recent Searches">
            {recentSearches.slice(0, 5).map((recent, index) => (
              <CommandItem
                key={`recent-${index}`}
                onSelect={() => setQuery(recent)}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                {recent}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {Object.entries(groupedResults).map(([kind, kindResults]) => {
          const kindLabels = {
            product: 'Products',
            serial: 'Serial Numbers',
            supplier: 'Suppliers',
            sale: 'Sales'
          };
          
          return (
            <CommandGroup key={kind} heading={kindLabels[kind as keyof typeof kindLabels]}>
              {kindResults.map((result, index) => {
                const Icon = getResultIcon(result.kind);
                const globalIndex = allResults.indexOf(result);
                const isSelected = globalIndex === selectedIndex;
                
                return (
                  <CommandItem
                    key={`${result.kind}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className={`flex items-center justify-between gap-2 ${
                      isSelected ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.title}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {result.subtitle}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {result.score === 1.0 && (
                        <Badge variant="secondary" className="text-xs">Exact</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {getResultActions(result)[0]?.label || 'Open'}
                      </Badge>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
      
      {allResults.length > 0 && (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Enter</kbd> to open • <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">↑↓</kbd> to navigate • <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Esc</kbd> to close
        </div>
      )}
    </CommandDialog>
  );
};
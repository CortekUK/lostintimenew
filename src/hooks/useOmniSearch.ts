import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from '@/lib/utils';

export interface SearchResult {
  kind: 'product' | 'serial' | 'supplier' | 'sale';
  id: string;
  title: string;
  subtitle: string;
  url: string;
  score: number;
}

export interface SearchQuery {
  query: string;
  scope?: string;
  operators?: Record<string, string>;
}

const parseQuery = (input: string): SearchQuery => {
  const query = input.trim();
  
  // Check for scope prefixes
  const scopeMatches = query.match(/^(p|ser|sup|sale|#products|#serials|#suppliers|#sales)[:]\s*(.*)$/);
  if (scopeMatches) {
    const [, prefix, searchTerm] = scopeMatches;
    const scopeMap: Record<string, string> = {
      'p': 'product',
      'ser': 'serial', 
      'sup': 'supplier',
      'sale': 'sale',
      '#products': 'product',
      '#serials': 'serial',
      '#suppliers': 'supplier',
      '#sales': 'sale'
    };
    return { query: searchTerm.trim(), scope: scopeMap[prefix] };
  }

  // Check for field operators
  const operators: Record<string, string> = {};
  const operatorPattern = /(sku|internal|serial|supplier|material|cat|category|size|color|price):([^\s]+)/g;
  let match;
  let cleanQuery = query;
  
  while ((match = operatorPattern.exec(query)) !== null) {
    const [fullMatch, field, value] = match;
    operators[field] = value;
    cleanQuery = cleanQuery.replace(fullMatch, '').trim();
  }

  // Handle quoted phrases
  const quotedMatch = cleanQuery.match(/"([^"]+)"/);
  if (quotedMatch) {
    cleanQuery = quotedMatch[1];
  }

  return { 
    query: cleanQuery || Object.values(operators).join(' '), 
    scope: Object.keys(operators).length > 0 ? 'product' : undefined,
    operators 
  };
};

const getRecentSearches = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('omniSearchRecent') || '[]');
  } catch {
    return [];
  }
};

const saveRecentSearch = (query: string) => {
  if (!query.trim()) return;
  
  const recent = getRecentSearches();
  const filtered = recent.filter(item => item !== query);
  const updated = [query, ...filtered].slice(0, 8);
  
  localStorage.setItem('omniSearchRecent', JSON.stringify(updated));
};

interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 20;

export const useOmniSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());
  const [queryTime, setQueryTime] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const searchFunction = useCallback(async (input: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!input.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const startTime = performance.now();

    // Check cache first
    const cached = cacheRef.current.get(input);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setResults(cached.results);
      setQueryTime(Math.round(performance.now() - startTime));
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const parsed = parseQuery(input);
      
      const { data, error: searchError } = await supabase.rpc('search_everything', {
        q: parsed.query,
        scope: parsed.scope || null,
        lim: 50 // Increased for grouping
      });

      if (controller.signal.aborted) return;

      if (searchError) {
        setError(searchError.message);
        setResults([]);
      } else {
        const typedResults = (data || []).map((result: any) => ({
          ...result,
          kind: result.kind as 'product' | 'serial' | 'supplier' | 'sale'
        }));
        
        setResults(typedResults);
        setQueryTime(Math.round(performance.now() - startTime));
        
        // Cache the results
        cacheRef.current.set(input, {
          results: typedResults,
          timestamp: Date.now()
        });

        // LRU eviction: remove oldest entries if cache is too large
        if (cacheRef.current.size > MAX_CACHE_SIZE) {
          const oldestKey = Array.from(cacheRef.current.entries())
            .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0]?.[0];
          if (oldestKey) cacheRef.current.delete(oldestKey);
        }

        saveRecentSearch(input);
        setRecentSearches(getRecentSearches());
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce(searchFunction, 200),
    [searchFunction]
  );

  const search = useCallback((query: string) => {
    debouncedSearch(query);
  }, [debouncedSearch]);

  const clearResults = useCallback(() => {
    setResults([]);
    setLoading(false);
    setError(null);
    setQueryTime(0);
  }, []);

  return {
    search,
    results,
    loading,
    error,
    recentSearches,
    clearResults,
    queryTime
  };
};
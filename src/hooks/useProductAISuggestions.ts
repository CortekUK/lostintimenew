import { useState, useEffect, useCallback, useRef } from 'react';
import { getProductSuggestions, ProductSuggestions } from '@/lib/openai';

interface UseProductAISuggestionsResult {
  suggestions: ProductSuggestions | null;
  isLoading: boolean;
  error: string | null;
  hasSuggested: boolean;
}

const DEBOUNCE_MS = 500;
const MIN_NAME_LENGTH = 5;

export function useProductAISuggestions(productName: string): UseProductAISuggestionsResult {
  const [suggestions, setSuggestions] = useState<ProductSuggestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSuggested, setHasSuggested] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedNameRef = useRef<string>('');

  const fetchSuggestions = useCallback(async (name: string) => {
    if (name.length < MIN_NAME_LENGTH) {
      return;
    }

    // Don't refetch for the same name
    if (name === lastFetchedNameRef.current) {
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    lastFetchedNameRef.current = name;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getProductSuggestions(name);

      // Check if this request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setSuggestions(result);
      setHasSuggested(true);
    } catch (err) {
      // Silently fail on errors - don't disrupt the form
      if (err instanceof Error && err.name !== 'AbortError') {
        console.warn('AI suggestion error:', err.message);
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmedName = productName.trim();

    if (trimmedName.length < MIN_NAME_LENGTH) {
      setSuggestions(null);
      setHasSuggested(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchSuggestions(trimmedName);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [productName, fetchSuggestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    hasSuggested
  };
}

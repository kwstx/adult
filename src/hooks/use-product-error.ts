"use client";

import { useState, useCallback } from "react";
import { parseProductError, ParsedProductError } from "@/lib/errors/client-error";

export interface UseProductErrorResult {
  error: ParsedProductError | null;
  hasError: boolean;
  isLoading: boolean;
  clearError: () => void;
  execute: <T>(action: () => Promise<T>) => Promise<T | null>;
  setErrorDirectly: (error: any) => Promise<void>;
}

export function useProductError(): UseProductErrorResult {
  const [error, setError] = useState<ParsedProductError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setErrorDirectly = useCallback(async (err: any) => {
    const parsed = await parseProductError(err);
    setError(parsed);
  }, []);

  const execute = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await action();
        return result;
      } catch (err: any) {
        const parsed = await parseProductError(err);
        setError(parsed);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    error,
    hasError: error !== null,
    isLoading,
    clearError,
    execute,
    setErrorDirectly,
  };
}

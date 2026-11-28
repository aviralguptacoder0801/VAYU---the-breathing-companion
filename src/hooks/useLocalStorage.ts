import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  sanitize?: (parsed: unknown, fallback: T) => T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const fallback =
      typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed: unknown = JSON.parse(raw);
      return sanitize ? sanitize(parsed, fallback) : (parsed as T);
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // Ignore storage quota or private-mode restrictions
    }
  }, [key, storedValue]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) =>
      typeof value === 'function' ? (value as (curr: T) => T)(prev) : value
    );
  }, []);

  return [storedValue, setValue];
}

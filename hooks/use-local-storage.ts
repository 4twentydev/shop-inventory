"use client";

import { useState, useEffect, useCallback } from "react";

type SetValue<T> = T | ((val: T) => T);

/**
 * Custom hook for persisting state in localStorage with user-specific keys
 * @param key - The base localStorage key
 * @param initialValue - The initial value if no stored value exists
 * @param userSpecific - Whether to scope the key to the current user (requires userId)
 * @param userId - The user ID for user-specific storage
 * @returns [storedValue, setValue, clearValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  userSpecific: boolean = false,
  userId?: string
): [T, (value: SetValue<T>) => void, () => void] {
  // Generate the final key (with optional user prefix)
  const storageKey = userSpecific && userId ? `user_${userId}_${key}` : key;

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${storageKey}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Save to local storage
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${storageKey}":`, error);
      }
    },
    [storageKey, storedValue]
  );

  // Clear the stored value
  const clearValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn(`Error clearing localStorage key "${storageKey}":`, error);
    }
  }, [storageKey, initialValue]);

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event for key "${storageKey}":`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [storageKey]);

  return [storedValue, setValue, clearValue];
}

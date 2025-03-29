import { useState, useEffect } from 'react';

/**
 * Custom hook to manage state in localStorage.
 * @param {string} key The key to use in localStorage.
 * @param {any} initialValue The initial value if nothing is found in localStorage.
 * @returns {[any, function]} A stateful value, and a function to update it.
 */
export function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      // Handle server-side rendering or environments without window
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  };

  // Listen for changes from other tabs/windows (optional)
  useEffect(() => {
     if (typeof window === 'undefined') return;

     const handleStorageChange = (event) => {
       if (event.key === key && event.newValue !== null) {
         try {
           setStoredValue(JSON.parse(event.newValue));
         } catch (error) {
           console.error(`Error parsing storage change for key “${key}”:`, error);
         }
       } else if (event.key === key && event.newValue === null) {
           // Handle item removal if necessary, e.g., reset to initialValue
           setStoredValue(initialValue);
       }
     };

     window.addEventListener('storage', handleStorageChange);

     return () => {
       window.removeEventListener('storage', handleStorageChange);
     };
  }, [key, initialValue]);


  return [storedValue, setValue];
}

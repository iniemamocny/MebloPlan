import { useEffect, useState } from 'react';
import { safeSetItem } from '../../utils/storage';

export default function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    } catch {
      /* ignore */
    }
    return initialValue;
  });

  useEffect(() => {
    safeSetItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

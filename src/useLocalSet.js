import { useState, useCallback, useEffect } from 'react';

// Persists a Set<string> to localStorage under a namespaced key, so
// read/starred/trashed state doesn't leak between different testmail.app
// namespaces someone might connect over time.
export function useLocalSet(key) {
  const [set, setSet] = useState(() => load(key));

  useEffect(() => {
    setSet(load(key));
  }, [key]);

  const persist = useCallback(
    (next) => {
      setSet(next);
      try {
        localStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch {
        /* storage full or unavailable — state still works in-memory */
      }
    },
    [key]
  );

  const add = useCallback(
    (ids) => {
      const arr = Array.isArray(ids) ? ids : [ids];
      persist(new Set([...set, ...arr]));
    },
    [set, persist]
  );

  const remove = useCallback(
    (ids) => {
      const arr = Array.isArray(ids) ? ids : [ids];
      const next = new Set(set);
      arr.forEach((id) => next.delete(id));
      persist(next);
    },
    [set, persist]
  );

  const toggle = useCallback(
    (id) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
    },
    [set, persist]
  );

  return { set, add, remove, toggle };
}

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

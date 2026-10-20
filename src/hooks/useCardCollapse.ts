import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'ontime_card_';

function read(key: string): boolean {
  try { return localStorage.getItem(PREFIX + key) === 'collapsed'; } catch { return false; }
}

/**
 * Remember whether a card is collapsed, per card key, so a screen stays the
 * size the user chose next time they open it.
 */
export function useCardCollapse(key: string) {
  const [collapsed, setCollapsed] = useState(() => read(key));
  // Follow a later key change (e.g. switching projects on the same screen).
  useEffect(() => { setCollapsed(read(key)); }, [key]);
  const toggle = useCallback(() => {
    setCollapsed(value => {
      const next = !value;
      try { localStorage.setItem(PREFIX + key, next ? 'collapsed' : 'open'); } catch { /* storage unavailable */ }
      return next;
    });
  }, [key]);
  return { collapsed, toggle };
}

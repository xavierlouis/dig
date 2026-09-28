// src/hooks/useNow.ts
'use client';

import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` (null until mounted, keeping render pure). */
export function useNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [intervalMs]);
  return now;
}

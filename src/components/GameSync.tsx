// src/components/GameSync.tsx
// Keeps the jackpot fresh on every page (the bag changes as the vault buys).
'use client';

import { useEffect } from 'react';
import { USE_BLOCKCHAIN } from '@/services';
import { refreshJackpot } from '@/services/sync';

const POLL_MS = USE_BLOCKCHAIN ? 30_000 : 3_000;

export default function GameSync() {
  useEffect(() => {
    const tick = () => { refreshJackpot().catch((err) => console.error('Jackpot refresh failed:', err)); };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}

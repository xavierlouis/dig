// src/components/HomeInitializer.tsx
// Client component that initializes the store with today's token on mount.
'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { getTodaysToken } from '@/config/daily';

export default function HomeInitializer() {
  const setTodaysToken = useGameStore((s) => s.setTodaysToken);
  const todaysToken = useGameStore((s) => s.todaysToken);

  useEffect(() => {
    if (!todaysToken) {
      setTodaysToken(getTodaysToken());
    }
  }, [todaysToken, setTodaysToken]);

  return null;
}

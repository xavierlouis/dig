// src/components/ui/SoundSync.tsx
'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { SoundEngine } from '@/lib/sound';

/** Keeps Howler master volume in sync with Zustand on every page. */
export default function SoundSync() {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);

  // Restore persisted preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('dig_sound');
    if (saved === 'off' && soundEnabled) toggleSound();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply to Howler whenever it changes
  useEffect(() => {
    if (soundEnabled) {
      SoundEngine.unmute();
    } else {
      SoundEngine.mute();
    }
  }, [soundEnabled]);

  return null;
}

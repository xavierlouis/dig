// src/components/ui/SoundToggle.tsx
'use client';

import { useGameStore } from '@/store/useGameStore';
import { SoundEngine } from '@/lib/sound';
import { useEffect } from 'react';

export default function SoundToggle() {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);

  useEffect(() => {
    if (soundEnabled) {
      SoundEngine.unmute();
    } else {
      SoundEngine.mute();
    }
  }, [soundEnabled]);

  // Persist preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('dig_sound');
    if (saved === 'off' && soundEnabled) toggleSound();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = () => {
    toggleSound();
    localStorage.setItem('dig_sound', soundEnabled ? 'off' : 'on');
  };

  return (
    <button
      onClick={handleToggle}
      className="flex h-[40px] w-[40px] items-center justify-center rounded-[12px] border border-muted/20 bg-black/20 text-muted/70 transition hover:border-muted/40 hover:text-ink"
      aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
    >
      {soundEnabled ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  );
}

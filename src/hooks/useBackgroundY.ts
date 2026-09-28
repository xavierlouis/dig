// src/hooks/useBackgroundY.ts
// Screen Y of a point on the level background image (0–1 of its height), following its
// cover-fit scaling — the same mapping the canvas uses to anchor the tombs.
'use client';

import { useSyncExternalStore } from 'react';
import { computeImageTransform } from '@/components/level/canvas/tombRenderer';

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

export function useBackgroundY(relY: number): number | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      const t = computeImageTransform(window.innerWidth, window.innerHeight);
      return Math.round(t.offsetY + relY * t.imgH);
    },
    () => null,
  );
}

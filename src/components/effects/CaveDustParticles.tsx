// src/components/effects/CaveDustParticles.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';

export default function CaveDustParticles() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options: ISourceOptions = useMemo(() => ({
    fullScreen: false,
    fpsLimit: 30,
    particles: {
      number: { value: 20 },
      color: { value: ['#A08050', '#806040', '#C8B080'] },
      opacity: { value: 0.12, animation: { enable: true, speed: 0.3, startValue: 'random', minimumValue: 0.04 } },
      size: { value: { min: 0.5, max: 2.5 }, animation: { enable: true, speed: 0.5, startValue: 'random' } },
      move: { enable: true, speed: 0.15, direction: 'bottom' as const, outModes: 'out' as const },
      shape: { type: 'circle' },
    },
    detectRetina: true,
  }), []);

  if (!ready) return null;

  return (
    <Particles
      id="cave-dust"
      className="pointer-events-none fixed inset-0 z-[51]"
      options={options}
    />
  );
}

// src/components/effects/FireflyParticles.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';

export default function FireflyParticles() {
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
      number: { value: 12 },
      color: { value: ['#FFD700', '#f0c850', '#63ff9c'] },
      opacity: { value: 0.5, animation: { enable: true, speed: 1.5, startValue: 'random', minimumValue: 0.1 } },
      size: { value: { min: 1.5, max: 3 } },
      move: { enable: true, speed: 0.4, direction: 'none' as const, outModes: 'bounce' as const, random: true },
      shape: { type: 'circle' },
    },
    detectRetina: true,
  }), []);

  if (!ready) return null;

  return (
    <Particles
      id="firefly-particles"
      className="pointer-events-none absolute inset-0 z-[2]"
      options={options}
    />
  );
}

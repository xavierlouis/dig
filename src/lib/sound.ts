// src/lib/sound.ts
'use client';

import { Howl, Howler } from 'howler';

Howler.volume(0.7);

function safeHowl(src: string, opts: Partial<ConstructorParameters<typeof Howl>[0]> = {}): Howl {
  return new Howl({
    src: [src],
    preload: true,
    onloaderror: () => {
      // Sound file not found — fail silently
    },
    ...opts,
  });
}

const sounds = {
  // Ambient — level page background
  graveyardLoop: safeHowl('/sounds/level/graveyardLoop.mp3', { loop: true, volume: 0.3 }),

  // Level
  enterLevel: safeHowl('/sounds/level/laugh-enter-level.mp3', { volume: 0.6 }),
  tombOpen: safeHowl('/sounds/level/tomb-open.mp3', { volume: 0.5 }),

  // Reveal
  tierDust: safeHowl('/sounds/reveal/tier-dust.mp3', { volume: 0.4 }),
  tierBone: safeHowl('/sounds/reveal/tier-bone.mp3', { volume: 0.5 }),
  tierCoffin: safeHowl('/sounds/reveal/tier-coffin.mp3', { volume: 0.6 }),
  tierZombie: safeHowl('/sounds/reveal/tier-zombie.mp3', { volume: 0.8 }),
  tierResurrect: safeHowl('/sounds/reveal/tier-resurrect.mp3', { volume: 1.0 }),
};

export type SoundName = keyof typeof sounds;

export const SoundEngine = {
  play: (name: SoundName) => {
    try { sounds[name]?.play(); } catch { /* missing file */ }
  },

  stop: (name: SoundName) => {
    try { sounds[name]?.stop(); } catch { /* noop */ }
  },

  stopAll: () => Howler.stop(),

  setMasterVolume: (v: number) => Howler.volume(v),

  mute: () => Howler.volume(0),

  unmute: () => Howler.volume(0.7),
};

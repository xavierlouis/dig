// src/components/level/LevelCanvas.tsx
'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { LevelSession, TombReveal, TierName, DeadToken } from '@/services/types';
import { drawCaveEnvironment, createTombs, repositionTombs, drawTomb, hitTestTomb, type TombVisual } from './canvas/tombRenderer';
import { createPickaxeState, startSwing, updateSwing, drawPickaxe } from './canvas/pickaxeAnimation';
import { createTombstoneArtifact, startRise, updateRise, drawTombstoneArtifact } from './canvas/tombstoneRenderer';
import {
  type ParticleBurst, updateParticles, drawParticles, isAlive,
  dirtExplosion, zombieExplosion, goldSupernova, dustCrumble, bronzeChunks,
} from './canvas/particleSystem';
import { createShakeState, updateShake, microShake, mediumShake, heavyShake } from './canvas/screenShake';
import { createTierEffect, startTierEffect, updateTierEffect, drawTierEffect, getTierColor, getTierLabel } from './canvas/tierEffects';
import { createSequencer, startSequencer, updateSequencer, isSequencerRunning, type AnimationStep } from './canvas/animationSequencer';
import { SoundEngine, type SoundName } from '@/lib/sound';

interface LevelCanvasProps {
  session: LevelSession;
  token: DeadToken;
  maxDigs: number;
  onTombTapped: (index: number) => void;
  onTierRevealed: (index: number, tier: TierName) => void;
  onChoiceReady: (index: number) => void;
  onAutoAdvance: (index: number) => void;
  onComplete: () => void;
  revealResult: TombReveal | null; // set by parent when openTomb resolves
  choiceResults: Record<number, { choice: 'sol' | 'token'; payout: number }>;
}

export default function LevelCanvas({
  session,
  token,
  maxDigs,
  onTombTapped,
  onTierRevealed,
  onChoiceReady,
  onAutoAdvance,
  onComplete,
  revealResult,
  choiceResults,
}: LevelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    tombs: [] as TombVisual[],
    pickaxe: createPickaxeState(),
    artifact: createTombstoneArtifact(),
    shake: createShakeState(),
    tierEffect: createTierEffect(),
    particles: [] as ParticleBurst[],
    sequencer: null as ReturnType<typeof createSequencer> | null,
    flicker: 0,
    flickerTimer: 0,
    animatingTomb: -1,
    tombsOpened: 0,
    lastTime: 0,
    initialized: false,
    pendingReveal: null as TombReveal | null,
    transitionAlpha: 1, // fade-in from black
  });

  // Handle incoming reveal result
  useEffect(() => {
    if (revealResult) {
      stateRef.current.pendingReveal = revealResult;
    }
  }, [revealResult]);

  // Update tomb visuals when choices are made
  useEffect(() => {
    const s = stateRef.current;
    for (const [indexStr, result] of Object.entries(choiceResults)) {
      const tomb = s.tombs[Number(indexStr)];
      if (tomb) {
        tomb.choiceLabel = result.choice === 'sol' ? 'SOL' : 'TOKEN';
        tomb.solPayout = result.payout;
      }
    }
  }, [choiceResults]);

  const handleClick = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    // Don't accept clicks during animation
    if (s.animatingTomb >= 0 || (s.sequencer && isSequencerRunning(s.sequencer))) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    for (const tomb of s.tombs) {
      // Skip locked tombs (beyond available digs)
      if (tomb.index >= maxDigs) continue;
      if ((tomb.state === 'sealed' || tomb.state === 'hover') && hitTestTomb(tomb, x, y)) {
        s.animatingTomb = tomb.index;
        tomb.state = 'opening';
        onTombTapped(tomb.index);
        break;
      }
    }
  }, [onTombTapped, maxDigs]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    let hovering = false;
    for (const tomb of s.tombs) {
      // Skip locked tombs
      if (tomb.index >= maxDigs) continue;
      if ((tomb.state === 'sealed' || tomb.state === 'hover') && hitTestTomb(tomb, x, y)) {
        tomb.state = 'hover';
        hovering = true;
      } else if (tomb.state === 'hover') {
        tomb.state = 'sealed';
      }
    }
    canvas.style.cursor = hovering ? 'pointer' : 'default';
  }, [maxDigs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;

    // Resize canvas to fill screen
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (!s.initialized) {
        s.tombs = createTombs(canvas.width, canvas.height);
        s.initialized = true;
      } else {
        // Reposition tombs while preserving state
        s.tombs = repositionTombs(s.tombs, canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);

    let animId: number;
    s.lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - s.lastTime) / 1000, 0.05); // cap at 50ms
      s.lastTime = now;

      const w = canvas.width;
      const h = canvas.height;

      // --- UPDATE ---

      // Flicker
      s.flickerTimer += dt;
      if (s.flickerTimer > 0.15 + Math.random() * 0.3) {
        s.flicker = Math.random();
        s.flickerTimer = 0;
      }

      // Glow pulse on sealed tombs
      for (const tomb of s.tombs) {
        if (tomb.state === 'sealed') {
          tomb.glowIntensity = 0.2 + Math.sin(now / 800 + tomb.index) * 0.1;
        }
      }

      // Transition fade-in
      if (s.transitionAlpha > 0) {
        s.transitionAlpha = Math.max(0, s.transitionAlpha - dt * 1.2);
      }

      // Shake
      updateShake(s.shake, dt);

      // Sequencer
      if (s.sequencer) {
        updateSequencer(s.sequencer, dt);
      }

      // Pickaxe
      const impacted = updateSwing(s.pickaxe, dt);
      if (impacted) {
        const tomb = s.tombs[s.animatingTomb];
        if (tomb) {
          s.particles.push(dirtExplosion(tomb.x, tomb.y));
          microShake(s.shake);
        }
      }

      // Tombstone rise
      updateRise(s.artifact, dt);

      // Tier effect
      const tierDone = updateTierEffect(s.tierEffect, dt);
      if (tierDone && s.animatingTomb >= 0) {
        const tomb = s.tombs[s.animatingTomb];
        const tier = s.tierEffect.tier;
        if (tier && tomb) {
          onTierRevealed(s.animatingTomb, tier);
          const hasChoice = tier === 'coffin' || tier === 'zombie' || tier === 'resurrect';
          if (hasChoice) {
            onChoiceReady(s.animatingTomb);
            // Unlock canvas immediately — parent handles the choice overlay
            finishTomb(s);
          } else {
            // Auto-advance for dust/bone
            const idx = s.animatingTomb;
            setTimeout(() => {
              onAutoAdvance(idx);
              finishTomb(s);
            }, 500);
          }
        }
      }

      // Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        updateParticles(s.particles[i], dt);
        if (!isAlive(s.particles[i])) {
          s.particles.splice(i, 1);
        }
      }

      // Process pending reveal — build the animation sequence
      if (s.pendingReveal && s.animatingTomb >= 0) {
        const reveal = s.pendingReveal;
        s.pendingReveal = null;
        buildRevealSequence(s, reveal, w, h, token);
      }

      // --- DRAW ---
      ctx.save();
      ctx.translate(s.shake.offsetX, s.shake.offsetY);

      drawCaveEnvironment(ctx, w, h, s.flicker);

      // Tombs
      for (const tomb of s.tombs) {
        // Dim locked tombs (beyond available digs)
        if (tomb.index >= maxDigs) {
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.filter = 'grayscale(0.8)';
          drawTomb(ctx, tomb, now);
          ctx.restore();
        } else {
          drawTomb(ctx, tomb, now);
        }
      }

      // Pickaxe
      drawPickaxe(ctx, s.pickaxe);

      // Tombstone artifact
      drawTombstoneArtifact(ctx, s.artifact);

      // Tier effect
      drawTierEffect(ctx, s.tierEffect, w, h);

      // Particles
      for (const burst of s.particles) {
        drawParticles(ctx, burst);
      }

      ctx.restore();

      // Transition overlay (outside shake)
      if (s.transitionAlpha > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${s.transitionAlpha})`;
        ctx.fillRect(0, 0, w, h);
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleClick, handleMouseMove, token, onTierRevealed, onChoiceReady, onAutoAdvance]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50"
      style={{ background: '#0F0E0A' }}
    />
  );
}

// ── Helper: Build the reveal animation sequence for a tomb ──

interface CanvasState {
  tombs: TombVisual[];
  pickaxe: ReturnType<typeof createPickaxeState>;
  artifact: ReturnType<typeof createTombstoneArtifact>;
  shake: ReturnType<typeof createShakeState>;
  tierEffect: ReturnType<typeof createTierEffect>;
  particles: ParticleBurst[];
  sequencer: ReturnType<typeof createSequencer> | null;
  animatingTomb: number;
  tombsOpened: number;
  pendingReveal: TombReveal | null;
  [key: string]: unknown;
}

function buildRevealSequence(
  s: CanvasState,
  reveal: TombReveal,
  canvasW: number,
  canvasH: number,
  token: DeadToken,
) {
  const tomb = s.tombs[s.animatingTomb];
  if (!tomb) return;

  const steps: AnimationStep[] = [
    // Step 1: Pickaxe swing (0.3s)
    {
      name: 'swing',
      duration: 0.4,
      onStart: () => startSwing(s.pickaxe, tomb.x, tomb.y, canvasW),
    },
    // Step 2: Crack open (0.5s)
    {
      name: 'crack',
      duration: 0.5,
      onStart: () => { SoundEngine.play('tombOpen'); },
      onUpdate: (p) => { tomb.crackProgress = p; },
      onComplete: () => {
        tomb.state = 'opened';
        tomb.tierColor = getTierColor(reveal.tier);
        tomb.tierLabel = getTierLabel(reveal.tier);
        tomb.solPayout = reveal.solPayout;
      },
    },
    // Step 3: Tombstone rises (0.5s)
    {
      name: 'rise',
      duration: 0.5,
      onStart: () => {
        s.artifact.token = token;
        s.artifact.tier = reveal.tier;
        startRise(s.artifact, tomb.x, tomb.y, canvasH);
      },
    },
    // Step 4: Tension pause (0.5s)
    {
      name: 'tension',
      duration: 0.5,
    },
    // Step 5: Tier reveal
    {
      name: 'reveal',
      duration: 0.1,
      onStart: () => {
        // Hide tombstone
        s.artifact.visible = false;

        // Spawn tier-specific particles and shake
        spawnTierEffects(s, reveal.tier, tomb.x, tomb.y);

        // Play tier sound
        const tierSounds: Record<string, SoundName> = {
          dust: 'tierDust', bone: 'tierBone', coffin: 'tierCoffin',
          zombie: 'tierZombie', resurrect: 'tierResurrect',
        };
        SoundEngine.play(tierSounds[reveal.tier]);

        // Start tier text effect
        const payoutText = reveal.solPayout > 0 ? `+${reveal.solPayout.toFixed(3)} SOL` : '';
        startTierEffect(s.tierEffect, reveal.tier, tomb.x, tomb.y - tomb.height * 0.6, payoutText);
      },
    },
  ];

  s.sequencer = createSequencer(steps);
  startSequencer(s.sequencer);
}

function spawnTierEffects(
  s: Pick<CanvasState, 'particles' | 'shake'>,
  tier: TierName,
  x: number,
  y: number,
) {
  switch (tier) {
    case 'dust':
      s.particles.push(dustCrumble(x, y));
      break;
    case 'bone':
      s.particles.push(dustCrumble(x, y));
      microShake(s.shake);
      break;
    case 'coffin':
      s.particles.push(bronzeChunks(x, y));
      mediumShake(s.shake);
      break;
    case 'zombie':
      s.particles.push(zombieExplosion(x, y));
      heavyShake(s.shake);
      break;
    case 'resurrect':
      s.particles.push(goldSupernova(x, y));
      heavyShake(s.shake);
      break;
  }
}

/** Mark a tomb animation as finished, check if all done */
function finishTomb(s: Pick<CanvasState, 'animatingTomb' | 'tombsOpened' | 'tombs'>) {
  s.tombsOpened++;
  s.animatingTomb = -1;
}



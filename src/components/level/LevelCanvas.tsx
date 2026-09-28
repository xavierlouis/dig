// src/components/level/LevelCanvas.tsx
'use client';

import { useRef, useEffect } from 'react';
import type { DigResult, TierName, DeadToken } from '@/services/types';
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
import { formatSol } from '@/lib/game/economy';

interface LevelCanvasProps {
  roundKey: number;       // changes when a new round of 3 tombs should rise
  token: DeadToken;
  interactive: boolean;   // false while a tomb animates, out of credit, or an overlay is open
  dimmed: boolean;        // out of credit: sealed tombs grey out
  autoDig: boolean;       // after a tomb, open the round's next sealed tomb without a tap
  resumeKey: number;      // bumped by parent to continue a round that stopped (e.g. after the jackpot overlay)
  onTombTapped: (index: number) => void;
  onTierRevealed: (index: number, dig: DigResult) => void;
  onTombDone: (index: number, dig: DigResult) => void;
  revealResult: DigResult | null; // set by parent when dig() resolves
  digFailed: number;              // bumped by parent when dig() fails: the tomb reseals
}

// Pause after the reveal before the next tomb can be tapped
const ADVANCE_DELAY_MS: Record<TierName, number> = {
  dust: 500,
  bone: 500,
  coffin: 1000,
  zombie: 1500,
  resurrect: 300, // parent shows the jackpot overlay
};

const ROUND_RISE_SPEED = 1 / 0.6; // tombs fade in over 0.6s

export default function LevelCanvas(props: LevelCanvasProps) {
  const { roundKey, token, digFailed, resumeKey } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
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
    pendingReveal: null as DigResult | null,
    currentDig: null as DigResult | null,
    transitionAlpha: 1, // fade-in from black
    tombsAlpha: 1,      // new rounds fade in
    roundKey,
    digFailed,
    resumeKey,
    openTomb: null as ((tomb: TombVisual) => void) | null,
  });

  // Latest props for the animation loop, without restarting it
  useEffect(() => { propsRef.current = props; });

  // Handle incoming reveal result
  useEffect(() => {
    if (props.revealResult) {
      stateRef.current.pendingReveal = props.revealResult;
    }
  }, [props.revealResult]);

  // New round: fresh sealed tombs rise
  useEffect(() => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (s.roundKey === roundKey || !canvas) return;
    s.roundKey = roundKey;
    s.tombs = createTombs(canvas.width, canvas.height);
    s.tombsOpened = 0;
    s.animatingTomb = -1;
    s.tombsAlpha = 0;
  }, [roundKey]);

  // Resume a round that stopped part-way (e.g. the jackpot overlay was open)
  useEffect(() => {
    const s = stateRef.current;
    if (s.resumeKey === resumeKey) return;
    s.resumeKey = resumeKey;
    const next = nextSealedTomb(s.tombs);
    if (next && s.animatingTomb < 0 && s.tombsOpened > 0 && propsRef.current.autoDig) s.openTomb?.(next);
  }, [resumeKey]);

  // Dig failed: reseal the tomb that was waiting for its result
  useEffect(() => {
    const s = stateRef.current;
    if (s.digFailed === digFailed) return;
    s.digFailed = digFailed;
    const tomb = s.tombs[s.animatingTomb];
    if (tomb && tomb.state === 'opening') tomb.state = 'sealed';
    s.animatingTomb = -1;
    s.pendingReveal = null;
  }, [digFailed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;

    const toCanvasCoords = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    const openTomb = (tomb: TombVisual) => {
      s.animatingTomb = tomb.index;
      tomb.state = 'opening';
      propsRef.current.onTombTapped(tomb.index);
    };
    s.openTomb = openTomb;

    const canTap = () =>
      propsRef.current.interactive
      && s.animatingTomb < 0
      && !(s.sequencer && isSequencerRunning(s.sequencer))
      && s.tombsAlpha >= 1;

    const handleClick = (e: MouseEvent) => {
      if (!canTap()) return;
      const { x, y } = toCanvasCoords(e);
      for (const tomb of s.tombs) {
        if ((tomb.state === 'sealed' || tomb.state === 'hover') && hitTestTomb(tomb, x, y)) {
          openTomb(tomb);
          break;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const { x, y } = toCanvasCoords(e);
      const tappable = canTap();
      let hovering = false;
      for (const tomb of s.tombs) {
        if (tappable && (tomb.state === 'sealed' || tomb.state === 'hover') && hitTestTomb(tomb, x, y)) {
          tomb.state = 'hover';
          hovering = true;
        } else if (tomb.state === 'hover') {
          tomb.state = 'sealed';
        }
      }
      canvas.style.cursor = hovering ? 'pointer' : 'default';
    };

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
      const dimmed = propsRef.current.dimmed;

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

      // Transition fade-in, new-round rise
      if (s.transitionAlpha > 0) s.transitionAlpha = Math.max(0, s.transitionAlpha - dt * 1.2);
      if (s.tombsAlpha < 1) s.tombsAlpha = Math.min(1, s.tombsAlpha + dt * ROUND_RISE_SPEED);

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

      // Tier effect done → payout lands, then the tomb unlocks after a short pause
      const tierDone = updateTierEffect(s.tierEffect, dt);
      if (tierDone && s.animatingTomb >= 0 && s.currentDig) {
        const idx = s.animatingTomb;
        const dig = s.currentDig;
        s.currentDig = null;
        const round = s.roundKey;
        propsRef.current.onTierRevealed(idx, dig);
        setTimeout(() => {
          finishTomb(s);
          propsRef.current.onTombDone(idx, dig);
          // One tap digs the whole round: open the next sealed tomb
          const next = nextSealedTomb(s.tombs);
          if (next && propsRef.current.autoDig && s.roundKey === round) openTomb(next);
        }, ADVANCE_DELAY_MS[dig.tier]);
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
        const dig = s.pendingReveal;
        s.pendingReveal = null;
        s.currentDig = dig;
        buildRevealSequence(s, dig, w, h, propsRef.current.token);
      }

      // --- DRAW ---
      ctx.save();
      ctx.translate(s.shake.offsetX, s.shake.offsetY);

      drawCaveEnvironment(ctx, w, h, s.flicker);

      // Tombs (sealed ones grey out when out of credit)
      for (const tomb of s.tombs) {
        const dim = dimmed && (tomb.state === 'sealed' || tomb.state === 'hover');
        ctx.save();
        ctx.globalAlpha = s.tombsAlpha * (dim ? 0.3 : 1);
        if (dim) ctx.filter = 'grayscale(0.8)';
        drawTomb(ctx, tomb, now);
        ctx.restore();
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
      s.openTomb = null;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50"
      style={{ background: '#0F0E0A' }}
      aria-label={`Cave with three tombs. ${token.name} lies here.`}
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
  [key: string]: unknown;
}

function payoutLabel(dig: DigResult): string | null {
  if (dig.tier === 'resurrect' && dig.jackpot) return `≈ ${dig.jackpot.valueSol.toFixed(2)} SOL`;
  return dig.payout > 0 ? `+${formatSol(dig.payout)} SOL` : null;
}

function buildRevealSequence(
  s: CanvasState,
  dig: DigResult,
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
        tomb.tierColor = getTierColor(dig.tier);
        tomb.tierLabel = getTierLabel(dig.tier);
        tomb.payoutLabel = payoutLabel(dig);
      },
    },
    // Step 3: Tombstone rises (0.5s)
    {
      name: 'rise',
      duration: 0.5,
      onStart: () => {
        s.artifact.token = token;
        s.artifact.tier = dig.tier;
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
        spawnTierEffects(s, dig.tier, tomb.x, tomb.y);

        // Play tier sound
        const tierSounds: Record<TierName, SoundName> = {
          dust: 'tierDust', bone: 'tierBone', coffin: 'tierCoffin',
          zombie: 'tierZombie', resurrect: 'tierResurrect',
        };
        SoundEngine.play(tierSounds[dig.tier]);

        // Start tier text effect
        startTierEffect(s.tierEffect, dig.tier, tomb.x, tomb.y - tomb.height * 0.6, payoutLabel(dig) ?? '');
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

function nextSealedTomb(tombs: TombVisual[]): TombVisual | undefined {
  return tombs.find((t) => t.state === 'sealed' || t.state === 'hover');
}

/** Mark a tomb animation as finished */
function finishTomb(s: Pick<CanvasState, 'animatingTomb' | 'tombsOpened'>) {
  s.tombsOpened++;
  s.animatingTomb = -1;
}

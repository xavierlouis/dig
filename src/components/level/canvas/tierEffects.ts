// src/components/level/canvas/tierEffects.ts
// Per-tier visual effects drawn on canvas during reveal.

import type { TierName } from '@/services/types';

export interface TierEffect {
  active: boolean;
  tier: TierName | null;
  progress: number; // 0-1
  x: number;
  y: number;
  flashAlpha: number;
  tintColor: string | null;
  tintAlpha: number;
  labelAlpha: number;
  payoutText: string;
  subText: string;
}

export function createTierEffect(): TierEffect {
  return {
    active: false,
    tier: null,
    progress: 0,
    x: 0, y: 0,
    flashAlpha: 0,
    tintColor: null,
    tintAlpha: 0,
    labelAlpha: 0,
    payoutText: '',
    subText: '',
  };
}

const TIER_CONFIG: Record<TierName, {
  label: string;
  color: string;
  duration: number; // seconds
  flash: boolean;
  subText: string;
}> = {
  dust:      { label: 'DUST',         color: '#B0ABCF', duration: 1.5,  flash: false, subText: 'Still dead.' },
  bone:      { label: 'BONE',         color: '#C8C0D0', duration: 1.5,  flash: false, subText: 'A fragment recovered.' },
  coffin:    { label: 'COFFIN',       color: '#CD7F32', duration: 2.0,  flash: false, subText: '' },
  zombie:    { label: 'ZOMBIE',       color: '#00C853', duration: 2.5,  flash: false, subText: 'IT LIVES.' },
  resurrect: { label: 'RESURRECTION', color: '#FFD700', duration: 3.0,  flash: true,  subText: '' },
};

/** Start a tier reveal effect */
export function startTierEffect(effect: TierEffect, tier: TierName, x: number, y: number, payoutText: string): void {
  const config = TIER_CONFIG[tier];
  effect.active = true;
  effect.tier = tier;
  effect.progress = 0;
  effect.x = x;
  effect.y = y;
  effect.flashAlpha = config.flash ? 1 : 0;
  effect.tintColor = tier === 'zombie' ? config.color : null;
  effect.tintAlpha = tier === 'zombie' ? 0.3 : 0;
  effect.labelAlpha = 0;
  effect.payoutText = payoutText;
  effect.subText = config.subText;
}

/** Update tier effect — returns true when complete */
export function updateTierEffect(effect: TierEffect, dt: number): boolean {
  if (!effect.active || !effect.tier) return false;

  const config = TIER_CONFIG[effect.tier];
  effect.progress += dt / config.duration;

  // Flash decay
  if (effect.flashAlpha > 0) {
    effect.flashAlpha = Math.max(0, effect.flashAlpha - dt * 3);
  }

  // Tint decay
  if (effect.tintAlpha > 0) {
    effect.tintAlpha = Math.max(0, effect.tintAlpha - dt * 0.3);
  }

  // Label fade in
  effect.labelAlpha = Math.min(1, effect.progress * 3);

  if (effect.progress >= 1) {
    effect.active = false;
    return true; // complete
  }

  return false;
}

/** Draw tier effect overlay */
export function drawTierEffect(ctx: CanvasRenderingContext2D, effect: TierEffect, canvasW: number, canvasH: number): void {
  if (!effect.active || !effect.tier) return;

  const config = TIER_CONFIG[effect.tier];

  // Full screen white flash (resurrect)
  if (effect.flashAlpha > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${effect.flashAlpha})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Screen tint (zombie)
  if (effect.tintColor && effect.tintAlpha > 0) {
    ctx.fillStyle = effect.tintColor + Math.round(effect.tintAlpha * 255).toString(16).padStart(2, '0');
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Tier label
  if (effect.labelAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = effect.labelAlpha;
    ctx.textAlign = 'center';

    // Glow behind text
    const glowGrad = ctx.createRadialGradient(effect.x, effect.y - 40, 0, effect.x, effect.y - 40, 120);
    glowGrad.addColorStop(0, config.color + '40');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(effect.x - 150, effect.y - 160, 300, 240);

    // Tier name
    const fontSize = effect.tier === 'resurrect' ? 42 : effect.tier === 'zombie' ? 36 : 28;
    ctx.font = `bold ${fontSize}px "Pirata One", cursive`;
    ctx.fillStyle = config.color;
    ctx.fillText(config.label, effect.x, effect.y - 50);

    // Payout text
    if (effect.payoutText) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = effect.tier === 'dust' ? '#4A4860' : '#00C853';
      ctx.fillText(effect.payoutText, effect.x, effect.y - 15);
    }

    // Sub text
    if (effect.subText) {
      ctx.font = 'italic 14px serif';
      ctx.fillStyle = config.color + 'aa';
      ctx.fillText(effect.subText, effect.x, effect.y + 15);
    }

    ctx.restore();
  }
}

/** Get the tier effect duration in seconds */
export function getTierDuration(tier: TierName): number {
  return TIER_CONFIG[tier].duration;
}

/** Get the tier color */
export function getTierColor(tier: TierName): string {
  return TIER_CONFIG[tier].color;
}

/** Get the tier display label */
export function getTierLabel(tier: TierName): string {
  return TIER_CONFIG[tier].label;
}

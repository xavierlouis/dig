// src/components/level/canvas/tombstoneRenderer.ts
// Draws the revealed tombstone artifact with token info.

import type { DeadToken, TierName } from '@/services/types';

export interface TombstoneArtifact {
  x: number;
  y: number;
  targetY: number; // final Y after rising
  alpha: number;
  scale: number;
  visible: boolean;
  token: DeadToken | null;
  tier: TierName | null;
  rising: boolean; // animating upward
}

export function createTombstoneArtifact(): TombstoneArtifact {
  return {
    x: 0, y: 0, targetY: 0,
    alpha: 0, scale: 0.5,
    visible: false,
    token: null, tier: null,
    rising: false,
  };
}

/** Begin the rise animation from a tomb position */
export function startRise(artifact: TombstoneArtifact, fromX: number, fromY: number, canvasHeight: number): void {
  artifact.x = fromX;
  artifact.y = fromY;
  artifact.targetY = canvasHeight * 0.45;
  artifact.alpha = 0;
  artifact.scale = 0.5;
  artifact.visible = true;
  artifact.rising = true;
}

/** Update the rise animation — call each frame */
export function updateRise(artifact: TombstoneArtifact, dt: number): void {
  if (!artifact.rising) return;

  const speed = 3.0; // animation speed multiplier
  artifact.y += (artifact.targetY - artifact.y) * speed * dt;
  artifact.alpha = Math.min(1, artifact.alpha + dt * 3);
  artifact.scale = Math.min(1, artifact.scale + dt * 2);

  // Settle when close enough
  if (Math.abs(artifact.y - artifact.targetY) < 1) {
    artifact.y = artifact.targetY;
    artifact.rising = false;
  }
}

/** Draw the tombstone artifact with token info */
export function drawTombstoneArtifact(ctx: CanvasRenderingContext2D, artifact: TombstoneArtifact): void {
  if (!artifact.visible || !artifact.token) return;

  ctx.save();
  ctx.globalAlpha = artifact.alpha;
  ctx.translate(artifact.x, artifact.y);
  ctx.scale(artifact.scale, artifact.scale);

  const w = 200;
  const h = 260;

  // Stone background
  const stoneGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  stoneGrad.addColorStop(0, '#5a5468');
  stoneGrad.addColorStop(0.5, '#4a4458');
  stoneGrad.addColorStop(1, '#3a3448');

  ctx.fillStyle = stoneGrad;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 8, h / 2);
  ctx.lineTo(-w / 2, -h / 2 + 30);
  ctx.quadraticCurveTo(0, -h / 2 - 15, w / 2, -h / 2 + 30);
  ctx.lineTo(w / 2 - 8, h / 2);
  ctx.closePath();
  ctx.fill();

  // Stone border
  ctx.strokeStyle = 'rgba(160, 150, 180, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Token name
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px "Pirata One", cursive';
  ctx.fillStyle = '#e8e6f0';
  ctx.fillText(artifact.token.name, 0, -h / 2 + 70);

  // Separator line
  ctx.strokeStyle = 'rgba(185, 177, 201, 0.2)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, -h / 2 + 88);
  ctx.lineTo(w * 0.3, -h / 2 + 88);
  ctx.stroke();

  // Cause of death
  ctx.font = 'italic 13px serif';
  ctx.fillStyle = 'rgba(232, 230, 240, 0.75)';
  wrapText(ctx, artifact.token.causeOfDeath, 0, -h / 2 + 130, w - 40, 18);

  ctx.restore();
}

/** Simple word-wrap for canvas text */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = word + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}

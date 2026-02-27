// src/components/level/canvas/tombRenderer.ts
// Draws tomb mounds with stone markers in the cave environment.
// Uses sprite image for sealed/opening tombs, code-drawn for opened state.

// ── Sprite preload ──
let sealedImg: HTMLImageElement | null = null;
let sealedReady = false;
let openedImg: HTMLImageElement | null = null;
let openedReady = false;
let bgImg: HTMLImageElement | null = null;
let bgReady = false;

if (typeof window !== 'undefined') {
  sealedImg = new Image();
  sealedImg.src = '/graveyard/tomb-sealed.png';
  sealedImg.onload = () => { sealedReady = true; };

  openedImg = new Image();
  openedImg.src = '/graveyard/tomb-opened.png';
  openedImg.onload = () => { openedReady = true; };

  bgImg = new Image();
  bgImg.src = '/graveyard/lvl1-bg.png';
  bgImg.onload = () => {
    bgReady = true;
    BG_NATURAL.w = bgImg!.width;
    BG_NATURAL.h = bgImg!.height;
  };
}

// Sprite natural aspect ratio (500×542)
const SPRITE_ASPECT = 500 / 542;

// Background image natural size (will be set on load)
const BG_NATURAL = { w: 1024, h: 682 }; // default, updated on load

/** Image transform after cover-fit — used to map image coords to canvas coords */
export interface ImageTransform {
  offsetX: number;
  offsetY: number;
  scale: number; // how much the image was scaled to cover
  imgW: number;  // drawn width
  imgH: number;  // drawn height
}

/** Compute the cover-fit transform for the background image */
export function computeImageTransform(canvasW: number, canvasH: number): ImageTransform {
  const imgAspect = BG_NATURAL.w / BG_NATURAL.h;
  const canvasAspect = canvasW / canvasH;
  let imgW: number, imgH: number, offsetX: number, offsetY: number, scale: number;

  if (canvasAspect > imgAspect) {
    // Canvas is wider — fit width, crop height
    imgW = canvasW;
    scale = canvasW / BG_NATURAL.w;
    imgH = canvasW / imgAspect;
    offsetX = 0;
    offsetY = (canvasH - imgH) / 2;
  } else {
    // Canvas is taller — fit height, crop width
    imgH = canvasH;
    scale = canvasH / BG_NATURAL.h;
    imgW = canvasH * imgAspect;
    offsetX = (canvasW - imgW) / 2;
    offsetY = 0;
  }

  return { offsetX, offsetY, scale, imgW, imgH };
}

/** Convert image-relative coords (0-1) to canvas coords */
function imgToCanvas(t: ImageTransform, relX: number, relY: number): { x: number; y: number } {
  return {
    x: t.offsetX + relX * t.imgW,
    y: t.offsetY + relY * t.imgH,
  };
}

export interface TombVisual {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  state: 'sealed' | 'hover' | 'opening' | 'opened';
  crackProgress: number;     // 0-1, used during opening animation
  glowIntensity: number;     // 0-1, pulsing glow on sealed tombs
  tierColor: string | null;  // set after reveal for residual glow
  tierLabel: string | null;  // display name after reveal
  solPayout: number;         // SOL won from this tomb
  choiceLabel: string | null; // 'SOL' or 'TOKEN' after player chooses
}

// Tomb anchor points on the image (0-1 relative coords)
// Adjust these to place tombs on specific spots in the background
const TOMB_ANCHORS = [
  { rx: 0.32, ry: 0.72, sizeMul: 1.0 },   // left
  { rx: 0.50, ry: 0.68, sizeMul: 1.05 },   // center (slightly higher/bigger)
  { rx: 0.68, ry: 0.73, sizeMul: 0.95 },   // right
];

// Tomb height as a fraction of the image height
const TOMB_HEIGHT_RATIO = 0.22;

/** Create initial tomb positions for 3 tombs */
export function createTombs(canvasWidth: number, canvasHeight: number): TombVisual[] {
  return repositionTombs([], canvasWidth, canvasHeight);
}

/** Reposition tombs for current canvas size (preserves state of existing tombs) */
export function repositionTombs(existing: TombVisual[], canvasWidth: number, canvasHeight: number): TombVisual[] {
  const t = computeImageTransform(canvasWidth, canvasHeight);

  const baseSpriteH = t.imgH * TOMB_HEIGHT_RATIO;

  const positions = TOMB_ANCHORS.map((anchor) => {
    const pos = imgToCanvas(t, anchor.rx, anchor.ry);
    const h = baseSpriteH * anchor.sizeMul;
    const w = h * SPRITE_ASPECT;
    return { x: pos.x, y: pos.y, w, h };
  });

  return positions.map((pos, i) => ({
    index: i,
    x: pos.x,
    y: pos.y,
    width: pos.w,
    height: pos.h,
    state: existing[i]?.state ?? 'sealed',
    crackProgress: existing[i]?.crackProgress ?? 0,
    glowIntensity: existing[i]?.glowIntensity ?? 0.3,
    tierColor: existing[i]?.tierColor ?? null,
    tierLabel: existing[i]?.tierLabel ?? null,
    solPayout: existing[i]?.solPayout ?? 0,
    choiceLabel: existing[i]?.choiceLabel ?? null,
  }));
}

/** Draw the cave environment background */
export function drawCaveEnvironment(ctx: CanvasRenderingContext2D, w: number, h: number, _flicker: number): void {
  if (bgReady && bgImg) {
    const t = computeImageTransform(w, h);
    ctx.drawImage(bgImg, t.offsetX, t.offsetY, t.imgW, t.imgH);
  } else {
    // Fallback gradient while image loads
    const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
    wallGrad.addColorStop(0, '#12100c');
    wallGrad.addColorStop(0.3, '#1e1a14');
    wallGrad.addColorStop(0.6, '#2a2418');
    wallGrad.addColorStop(1, '#18150f');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, h);
  }
}


/** Draw a single tomb */
export function drawTomb(ctx: CanvasRenderingContext2D, tomb: TombVisual, now: number = 0): void {
  const { x, y, width, height, state, crackProgress, glowIntensity } = tomb;

  ctx.save();

  if (state === 'opened') {
    drawOpenedTomb(ctx, tomb);
    ctx.restore();
    return;
  }

  // Draw sprite if loaded, otherwise fallback to basic shape
  const drawW = width;
  const drawH = height;
  const drawX = x - drawW / 2;
  const drawY = y - drawH * 0.65; // anchor near bottom of sprite (mound base)

  // (4) Tomb brightens on hover — white overlay at low opacity
  if (state === 'hover' && sealedReady && sealedImg) {
    // Draw base sprite
    ctx.drawImage(sealedImg, drawX, drawY, drawW, drawH);
    // Brighten: draw again with lighter composite
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.15;
    ctx.drawImage(sealedImg, drawX, drawY, drawW, drawH);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else if (sealedReady && sealedImg) {
    ctx.drawImage(sealedImg, drawX, drawY, drawW, drawH);
  } else {
    drawFallbackTomb(ctx, x, y, width, height);
  }

  // Interactability glow
  if (state === 'sealed' || state === 'hover') {
    const intensity = state === 'hover' ? 0.8 : glowIntensity;
    const glowGrad = ctx.createRadialGradient(x, y - drawH * 0.3, 0, x, y - drawH * 0.3, drawW * 0.9);
    glowGrad.addColorStop(0, `rgba(255, 200, 60, ${intensity * 0.25})`);
    glowGrad.addColorStop(0.5, `rgba(255, 180, 40, ${intensity * 0.1})`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(x - drawW, y - drawH * 1.2, drawW * 2, drawH * 2);
  }

  // "DIG!" prompt on hover with pulse
  if (state === 'hover') {
    const fontSize = Math.max(16, drawW * 0.12);
    const textY = drawY - fontSize * 1.4;

    // Gentle pulse scale (1.0 → 1.06 → 1.0)
    const pulse = 1 + Math.sin(now / 300) * 0.06;
    ctx.translate(x, textY);
    ctx.scale(pulse, pulse);

    ctx.font = `900 ${fontSize}px "Cinzel", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(255, 180, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText('DIG!', 0, 0);
    ctx.shadowBlur = 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Crack lines during opening
  if (crackProgress > 0 && state === 'opening') {
    drawCracks(ctx, x, y, width, height, crackProgress);
  }

  ctx.restore();
}

/** Minimal fallback while sprite loads */
function drawFallbackTomb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const moundGrad = ctx.createRadialGradient(x, y - h * 0.05, 0, x, y, w * 0.5);
  moundGrad.addColorStop(0, '#5a4a2e');
  moundGrad.addColorStop(1, '#2a2015');
  ctx.fillStyle = moundGrad;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.4, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5a5468';
  ctx.fillRect(x - 12, y - h * 0.5, 24, h * 0.4);
}

function drawCracks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number): void {
  ctx.strokeStyle = `rgba(255, 200, 100, ${progress * 0.6})`;
  ctx.lineWidth = 1.5 + progress;

  // Main crack
  ctx.beginPath();
  ctx.moveTo(x - w * 0.1 * progress, y - h * 0.2 * progress);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w * 0.15 * progress, y + h * 0.15 * progress);
  ctx.stroke();

  // Branch cracks
  if (progress > 0.4) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - w * 0.2 * progress, y + h * 0.1 * progress);
    ctx.stroke();
  }

  // Light spilling from crack
  const lightGrad = ctx.createRadialGradient(x, y, 0, x, y, w * 0.4 * progress);
  lightGrad.addColorStop(0, `rgba(255, 220, 140, ${progress * 0.2})`);
  lightGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = lightGrad;
  ctx.fillRect(x - w, y - h, w * 2, h * 2);
}

function drawOpenedTomb(ctx: CanvasRenderingContext2D, tomb: TombVisual): void {
  const { x, y, width, height, tierColor, tierLabel, solPayout, choiceLabel } = tomb;

  const drawW = width;
  const drawH = height;
  const drawX = x - drawW / 2;
  const drawY = y - drawH * 0.65;

  if (openedReady && openedImg) {
    ctx.drawImage(openedImg, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = '#2a2015';
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.3, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tier color residual glow
  if (tierColor) {
    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, width * 0.4);
    glowGrad.addColorStop(0, tierColor + '30');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(x - width, y - height, width * 2, height * 2);
  }

  // Status label under the tomb
  if (tierLabel && tierColor) {
    const labelY = y + drawH * 0.30;
    const fontSize = Math.max(13, drawW * 0.09);
    let lineY = labelY;

    // Tier name
    ctx.font = `700 ${fontSize}px "Cinzel", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = tierColor;
    ctx.shadowColor = tierColor + '80';
    ctx.shadowBlur = 8;
    ctx.fillText(tierLabel, x, lineY);
    ctx.shadowBlur = 0;
    lineY += fontSize + 4;

    // Choice + payout
    if (choiceLabel && solPayout > 0) {
      const payoutSize = Math.max(11, drawW * 0.07);
      ctx.font = `600 ${payoutSize}px "Cinzel", serif`;
      const choiceColor = choiceLabel === 'SOL' ? 'rgba(200, 170, 255, 0.85)' : 'rgba(100, 220, 130, 0.85)';
      ctx.fillStyle = choiceColor;
      ctx.fillText(`Chose ${choiceLabel} · +${solPayout.toFixed(3)}`, x, lineY);
    } else if (solPayout > 0) {
      const payoutSize = Math.max(11, drawW * 0.07);
      ctx.font = `600 ${payoutSize}px "Cinzel", serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`+${solPayout.toFixed(3)} SOL`, x, lineY);
    }
  }
}

/** Hit-test: check if click coordinates are on a tomb */
export function hitTestTomb(tomb: TombVisual, clickX: number, clickY: number): boolean {
  // Hit area covers the sprite region
  const hitW = Math.max(tomb.width, 100);
  const hitH = Math.max(tomb.height, 120);
  const dx = clickX - tomb.x;
  const dy = clickY - (tomb.y - tomb.height * 0.3); // center hit area on sprite
  return (dx * dx) / ((hitW / 2) ** 2) + (dy * dy) / ((hitH / 2) ** 2) <= 1;
}

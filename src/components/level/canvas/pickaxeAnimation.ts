// src/components/level/canvas/pickaxeAnimation.ts
// Pickaxe swing + strike animation using sprite.

// ── Sprite preload ──
let pickaxeImg: HTMLImageElement | null = null;
let pickaxeReady = false;

if (typeof window !== 'undefined') {
  pickaxeImg = new Image();
  pickaxeImg.src = '/graveyard/pickaxe.png';
  pickaxeImg.onload = () => { pickaxeReady = true; };
}

// Display size for the pickaxe sprite
const PICKAXE_W = 90;
const PICKAXE_H = 95; // 400:422 aspect ratio

export interface PickaxeState {
  active: boolean;
  targetX: number;
  targetY: number;
  progress: number; // 0 → 1
  x: number;
  y: number;
  rotation: number;
  struck: boolean;
}

export function createPickaxeState(): PickaxeState {
  return {
    active: false,
    targetX: 0, targetY: 0,
    progress: 0,
    x: 0, y: 0,
    rotation: 0,
    struck: false,
  };
}

/** Start the swing animation toward a target point */
export function startSwing(state: PickaxeState, targetX: number, targetY: number, canvasWidth: number): void {
  state.active = true;
  state.targetX = targetX;
  state.targetY = targetY;
  state.progress = 0;
  state.struck = false;

  // Start position: above and to the right
  state.x = targetX + canvasWidth * 0.15;
  state.y = targetY - 200;
  state.rotation = -0.8; // tilted back
}

/** Update the swing animation — call each frame with dt in seconds */
export function updateSwing(state: PickaxeState, dt: number): boolean {
  if (!state.active) return false;

  const swingDuration = 0.3; // seconds for the swing
  state.progress += dt / swingDuration;

  if (state.progress >= 1) {
    state.progress = 1;
    state.x = state.targetX;
    state.y = state.targetY;
    state.rotation = 0.3;
    if (!state.struck) {
      state.struck = true;
      return true; // signal: impact happened
    }
    // Linger briefly then deactivate
    state.active = false;
    return false;
  }

  // Ease in cubic for accelerating swing
  const t = state.progress;
  const eased = t * t * t;

  // Arc path
  state.x = state.x + (state.targetX - state.x) * eased * 3 * dt;
  state.y = state.y + (state.targetY - state.y) * eased * 3 * dt;
  state.rotation = -0.8 + eased * 1.1; // swing arc

  return false;
}

/** Draw the pickaxe */
export function drawPickaxe(ctx: CanvasRenderingContext2D, state: PickaxeState): void {
  if (!state.active) return;

  ctx.save();
  ctx.translate(state.x, state.y);
  ctx.rotate(state.rotation);

  if (pickaxeReady && pickaxeImg) {
    // Draw sprite centered on the pivot point (handle base)
    ctx.drawImage(pickaxeImg, -PICKAXE_W / 2, -PICKAXE_H, PICKAXE_W, PICKAXE_H);
  } else {
    // Fallback: simple line + triangle
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -60);
    ctx.stroke();

    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(-18, -55);
    ctx.lineTo(0, -65);
    ctx.lineTo(18, -55);
    ctx.closePath();
    ctx.fill();
  }

  // Spark on impact
  if (state.struck) {
    ctx.fillStyle = 'rgba(255, 220, 100, 0.8)';
    ctx.beginPath();
    ctx.arc(3, 5, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

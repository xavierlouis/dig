// src/components/level/canvas/screenShake.ts
// Camera shake controller for impact effects.

export interface ShakeState {
  offsetX: number;
  offsetY: number;
  active: boolean;
  intensity: number;
  duration: number;
  elapsed: number;
}

export function createShakeState(): ShakeState {
  return { offsetX: 0, offsetY: 0, active: false, intensity: 0, duration: 0, elapsed: 0 };
}

/** Trigger a screen shake */
export function triggerShake(state: ShakeState, intensity: number, duration: number): void {
  state.active = true;
  state.intensity = intensity;
  state.duration = duration;
  state.elapsed = 0;
}

/** Update shake state — call each frame with dt in seconds */
export function updateShake(state: ShakeState, dt: number): void {
  if (!state.active) {
    state.offsetX = 0;
    state.offsetY = 0;
    return;
  }

  state.elapsed += dt;
  if (state.elapsed >= state.duration) {
    state.active = false;
    state.offsetX = 0;
    state.offsetY = 0;
    return;
  }

  // Decay over time
  const remaining = 1 - state.elapsed / state.duration;
  const magnitude = state.intensity * remaining;
  state.offsetX = (Math.random() * 2 - 1) * magnitude;
  state.offsetY = (Math.random() * 2 - 1) * magnitude;
}

// Preset shake levels
export function microShake(state: ShakeState): void {
  triggerShake(state, 3, 0.1);
}

export function mediumShake(state: ShakeState): void {
  triggerShake(state, 8, 0.3);
}

export function heavyShake(state: ShakeState): void {
  triggerShake(state, 15, 0.5);
}

// src/components/level/canvas/animationSequencer.ts
// Chains animations with timing delays.

export interface AnimationStep {
  name: string;
  duration: number; // seconds
  onStart?: () => void;
  onUpdate?: (progress: number) => void; // 0-1
  onComplete?: () => void;
}

export interface Sequencer {
  steps: AnimationStep[];
  currentIndex: number;
  elapsed: number;
  running: boolean;
  onAllComplete?: () => void;
}

export function createSequencer(steps: AnimationStep[], onAllComplete?: () => void): Sequencer {
  return {
    steps,
    currentIndex: 0,
    elapsed: 0,
    running: false,
    onAllComplete,
  };
}

export function startSequencer(seq: Sequencer): void {
  if (seq.steps.length === 0) return;
  seq.running = true;
  seq.currentIndex = 0;
  seq.elapsed = 0;
  seq.steps[0].onStart?.();
}

export function updateSequencer(seq: Sequencer, dt: number): void {
  if (!seq.running || seq.currentIndex >= seq.steps.length) return;

  const step = seq.steps[seq.currentIndex];
  seq.elapsed += dt;

  const progress = Math.min(seq.elapsed / step.duration, 1);
  step.onUpdate?.(progress);

  if (seq.elapsed >= step.duration) {
    step.onComplete?.();
    seq.currentIndex++;
    seq.elapsed = 0;

    if (seq.currentIndex < seq.steps.length) {
      seq.steps[seq.currentIndex].onStart?.();
    } else {
      seq.running = false;
      seq.onAllComplete?.();
    }
  }
}

export function isSequencerRunning(seq: Sequencer): boolean {
  return seq.running;
}

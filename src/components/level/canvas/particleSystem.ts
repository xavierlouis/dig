// src/components/level/canvas/particleSystem.ts
// Lightweight canvas-rendered particle engine for dirt explosions, tier effects, etc.

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;     // remaining life in seconds
  maxLife: number;
  gravity: number;
  shrink: boolean;
}

export interface ParticleBurst {
  particles: Particle[];
}

/** Spawn a burst of particles at a point */
export function spawnBurst(
  x: number,
  y: number,
  count: number,
  opts: {
    colors: string[];
    minSpeed?: number;
    maxSpeed?: number;
    minSize?: number;
    maxSize?: number;
    minLife?: number;
    maxLife?: number;
    gravity?: number;
    angleSpread?: number; // 0-360
    angleOffset?: number;
    shrink?: boolean;
  },
): ParticleBurst {
  const {
    colors,
    minSpeed = 200,
    maxSpeed = 600,
    minSize = 2,
    maxSize = 6,
    minLife = 0.5,
    maxLife = 1.5,
    gravity = 80,
    angleSpread = 360,
    angleOffset = 0,
    shrink = true,
  } = opts;

  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = ((angleOffset + Math.random() * angleSpread) * Math.PI) / 180;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    const life = minLife + Math.random() * (maxLife - minLife);

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: minSize + Math.random() * (maxSize - minSize),
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      life,
      maxLife: life,
      gravity,
      shrink,
    });
  }

  return { particles };
}

/** Update all particles by dt seconds */
export function updateParticles(burst: ParticleBurst, dt: number): void {
  for (let i = burst.particles.length - 1; i >= 0; i--) {
    const p = burst.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    p.life -= dt;
    p.alpha = Math.max(0, p.life / p.maxLife);
    if (p.shrink) {
      p.size *= (1 - dt * 0.8);
    }
    if (p.life <= 0) {
      burst.particles.splice(i, 1);
    }
  }
}

/** Draw all particles */
export function drawParticles(ctx: CanvasRenderingContext2D, burst: ParticleBurst): void {
  for (const p of burst.particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Check if a burst still has live particles */
export function isAlive(burst: ParticleBurst): boolean {
  return burst.particles.length > 0;
}

// ── Preset bursts ──

/** Dirt explosion when pickaxe strikes */
export function dirtExplosion(x: number, y: number): ParticleBurst {
  return spawnBurst(x, y, 40, {
    colors: ['#A08050', '#806040', '#C8B080', '#5a4530'],
    minSpeed: 100,
    maxSpeed: 350,
    minSize: 2,
    maxSize: 5,
    minLife: 0.4,
    maxLife: 1.0,
    gravity: 200,
    angleSpread: 180,
    angleOffset: 180, // upward
  });
}

/** Green explosion for Zombie tier */
export function zombieExplosion(x: number, y: number): ParticleBurst {
  return spawnBurst(x, y, 80, {
    colors: ['#00C853', '#00E676', '#69F0AE', '#1B5E20'],
    minSpeed: 200,
    maxSpeed: 500,
    minSize: 2,
    maxSize: 7,
    minLife: 0.5,
    maxLife: 1.5,
    gravity: 60,
  });
}

/** Gold supernova for Resurrect tier */
export function goldSupernova(x: number, y: number): ParticleBurst {
  return spawnBurst(x, y, 120, {
    colors: ['#FFD700', '#FFC107', '#FFAB00', '#FFE082', '#FFFFFF'],
    minSpeed: 150,
    maxSpeed: 600,
    minSize: 2,
    maxSize: 8,
    minLife: 1.0,
    maxLife: 3.0,
    gravity: 30,
  });
}

/** Dust crumble (gray, downward) */
export function dustCrumble(x: number, y: number): ParticleBurst {
  return spawnBurst(x, y, 25, {
    colors: ['#4A4860', '#5a5870', '#3a3848'],
    minSpeed: 20,
    maxSpeed: 80,
    minSize: 1,
    maxSize: 3,
    minLife: 0.5,
    maxLife: 1.2,
    gravity: 120,
    angleSpread: 120,
    angleOffset: 210, // mostly downward
  });
}

/** Bronze chunks for Coffin tier */
export function bronzeChunks(x: number, y: number): ParticleBurst {
  return spawnBurst(x, y, 50, {
    colors: ['#CD7F32', '#B8860B', '#DAA520', '#8B6914'],
    minSpeed: 150,
    maxSpeed: 400,
    minSize: 2,
    maxSize: 6,
    minLife: 0.5,
    maxLife: 1.2,
    gravity: 100,
  });
}

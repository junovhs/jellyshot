/* Small math helpers shared by every module. */

export const TAU = Math.PI * 2;
export type Pt = [number, number];

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const shuffle = <T>(a: readonly T[]): T[] => [...a].sort(() => Math.random() - .5);

/** Deterministic PRNG (mulberry32) so decor and music are the same every run. */
export function rng(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export interface Ellipse { x: number; y: number; rx: number; ry: number }
export function inEll(x: number, y: number, e: Ellipse, pad = 0): boolean {
  const dx = (x - e.x) / (e.rx + pad), dy = (y - e.y) / (e.ry + pad * .6);
  return dx * dx + dy * dy < 1;
}
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = clamp(l ? ((px - ax) * dx + (py - ay) * dy) / l : 0, 0, 1);
  return dist(px, py, ax + t * dx, ay + t * dy);
}
/** Ease for UI transitions. */
export const smooth = (t: number): number => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

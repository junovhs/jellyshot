import { describe, expect, it } from 'vitest';
import { Gesture } from './beach-gesture.js';

const make = (armed = false) => { const g = new Gesture({ armed: () => g.armedNow }); g.armedNow = armed; return g; };
const types = a => a.map(x => x.type);
function drag(g, x0, y0, x1, y1, { t = 0, ms = 200, n = 10, lift = true, rest = 0 } = {}) {
  const out = [...g.down(1, x0, y0, t)];
  for (let i = 1; i <= n; i++) out.push(...g.move(1, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, t + ms * i / n));
  if (lift) out.push(...g.up(1, x1, y1, t + ms + rest));
  return out;
}

describe('Jelly Time gestures (release fires)', () => {
  it('a drag pans by the finger movement', () => {
    const out = drag(make(), 100, 100, 160, 100, { lift: false });
    expect(out.filter(a => a.type === 'pan').reduce((s, a) => s + a.dx, 0)).toBe(60);
  });
  it('the pan never jumps: total pan equals the finger travel once past the slop', () => {
    const g = make(); g.down(1, 0, 0, 0);
    const out = [...g.move(1, 20, 0, 10), ...g.move(1, 50, 0, 20)];
    expect(out.reduce((s, a) => s + a.dx, 0)).toBe(50);
  });
  it('a fast release glides and never shoots, even over a jelly', () => {
    const out = drag(make(true), 100, 300, 100, 100, { ms: 100 });
    expect(types(out)).toContain('glide'); expect(types(out)).not.toContain('release');
  });
  it('a slow release with a jelly under the reticle starts the countdown', () => {
    const g = make(true), out = drag(g, 100, 100, 130, 100, { rest: 200 });
    expect(types(out)).toContain('release'); expect(g.state).toBe('aim');
  });
  it('a slow release over nothing does nothing', () => {
    const g = make(false), out = drag(g, 100, 100, 130, 100, { rest: 200 });
    expect(types(out)).not.toContain('release'); expect(types(out)).not.toContain('glide'); expect(g.state).toBe('idle');
  });
  it('a still tap with a jelly under the reticle starts the countdown', () => {
    const g = make(true); g.down(1, 50, 50, 0);
    expect(types(g.up(1, 51, 50, 120))).toEqual(['release']);
  });
  it('touching during the countdown cancels it and the same touch pans', () => {
    const g = make(true); drag(g, 100, 100, 130, 100, { rest: 200 });
    const out = drag(g, 200, 400, 260, 400, { t: 1000, lift: false });
    expect(types(out).slice(0, 2)).toEqual(['cancel', 'hold']);
    expect(out.some(a => a.type === 'pan')).toBe(true); expect(g.state).toBe('pan');
  });
  it('the tap that calls a countdown off never starts another', () => {
    const g = make(true); g.down(1, 5, 5, 0); g.up(1, 5, 5, 50);
    expect(types(g.down(1, 50, 50, 500))).toEqual(['cancel', 'hold']);
    expect(types(g.up(1, 50, 50, 560))).toEqual([]); expect(g.state).toBe('idle');
  });
  it('after calling it off, dragging and letting go slowly on a jelly aims again', () => {
    const g = make(true); g.down(1, 5, 5, 0); g.up(1, 5, 5, 50);
    const out = drag(g, 100, 100, 140, 100, { t: 500, rest: 200 });
    expect(types(out)).toContain('release');
  });
  it('the page finishing the shot returns to idle', () => {
    const g = make(true); g.down(1, 5, 5, 0); g.up(1, 5, 5, 50); g.done(); expect(g.state).toBe('idle');
  });
  it('two fingers zoom, and lifting one carries on panning without a jump', () => {
    const g = make(); g.down(1, 100, 100, 0); g.down(2, 200, 100, 10);
    const z = g.move(2, 300, 100, 20);
    expect(z[0].type).toBe('zoom'); expect(z[0].factor).toBeCloseTo(2);
    g.up(2, 300, 100, 30); expect(g.state).toBe('pan');
    expect(g.move(1, 110, 100, 40)).toEqual([{ type: 'pan', dx: 10, dy: 0, x: 110, y: 100 }]);
  });
  it('ending a pinch never shoots', () => {
    const g = make(true); g.down(1, 100, 100, 0); g.down(2, 200, 100, 10); g.up(2, 200, 100, 20);
    expect(types(g.up(1, 100, 100, 600))).not.toContain('glide');
  });
});

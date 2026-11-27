import { describe, expect, it } from 'vitest';
import { Gesture } from './beach-gesture.js';

const JELLY = { name: 'Skylar' };
const make = ({ over = null, pick = null } = {}) => new Gesture({ overTarget: () => over, pickAt: () => pick });
const types = a => a.map(x => x.type);
// a drag from (x0,y0) to (x1,y1) in n steps over ms milliseconds, starting at time t
function drag(g, x0, y0, x1, y1, { t = 0, ms = 200, n = 10, lift = true } = {}) {
  const out = [...g.down(1, x0, y0, t)];
  for (let i = 1; i <= n; i++) out.push(...g.move(1, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, t + ms * i / n));
  if (lift) out.push(...g.up(1, x1, y1, t + ms));
  return out;
}

describe('Jelly Time gestures', () => {
  it('a drag pans by the finger movement', () => {
    const g = make(), out = drag(g, 100, 100, 160, 100, { lift: false });
    const pans = out.filter(a => a.type === 'pan');
    expect(pans.reduce((s, a) => s + a.dx, 0)).toBeCloseTo(60);
  });
  it('a fast release glides instead of acquiring', () => {
    const g = make({ over: JELLY }), out = drag(g, 100, 300, 100, 100, { ms: 100 });
    const glide = out.find(a => a.type === 'glide');
    expect(glide).toBeTruthy(); expect(glide.vy).toBeLessThan(-1000);
    expect(types(out)).not.toContain('acquire');
  });
  it('a slow release over a jelly acquires it', () => {
    const g = make({ over: JELLY }), out = [...drag(g, 100, 100, 130, 100, { ms: 200, lift: false })];
    out.push(...g.up(1, 130, 100, 400));   // finger rested 200 ms before lifting
    expect(out.find(a => a.type === 'acquire')?.j).toBe(JELLY);
    expect(g.state).toBe('locked');
  });
  it('a slow release over nothing does nothing', () => {
    const g = make(), out = drag(g, 100, 100, 130, 100, { lift: false });
    out.push(...g.up(1, 130, 100, 600));
    expect(types(out)).not.toContain('acquire'); expect(types(out)).not.toContain('glide'); expect(g.state).toBe('idle');
  });
  it('tapping a jelly acquires it; tapping empty ground does nothing', () => {
    let g = make({ pick: JELLY }); g.down(1, 50, 50, 0);
    expect(g.up(1, 51, 50, 120).find(a => a.type === 'acquire')?.how).toBe('tap');
    g = make(); g.down(1, 50, 50, 0);
    expect(types(g.up(1, 50, 50, 120))).toEqual([]);
  });
  it('while locked a short tap fires', () => {
    const g = make(); g.lock(JELLY);
    g.down(1, 200, 400, 1000);
    expect(types(g.up(1, 202, 401, 1100))).toEqual(['fire']);
  });
  it('while locked a drag aborts slow motion and keeps panning in the same touch', () => {
    const g = make(); g.lock(JELLY);
    const out = drag(g, 200, 400, 260, 400, { t: 1000, lift: false });
    expect(types(out)[0]).toBe('hold');
    expect(types(out)).toContain('abort');
    expect(out.filter(a => a.type === 'pan').length).toBeGreaterThan(0);
    expect(g.state).toBe('pan'); expect(g.locked).toBe(null);
  });
  it('a long still press while locked neither fires nor aborts', () => {
    const g = make(); g.lock(JELLY);
    g.down(1, 200, 400, 0);
    expect(types(g.up(1, 200, 400, 900))).toEqual([]); expect(g.state).toBe('locked');
  });
  it('two fingers zoom, and lifting one carries on panning without a jump', () => {
    const g = make(); g.down(1, 100, 100, 0); g.down(2, 200, 100, 10);
    const z = g.move(2, 300, 100, 20);
    expect(z[0].type).toBe('zoom'); expect(z[0].factor).toBeCloseTo(2);
    g.up(2, 300, 100, 30);
    expect(g.state).toBe('pan');
    const p = g.move(1, 110, 100, 40);
    expect(p).toEqual([{ type: 'pan', dx: 10, dy: 0, x: 110, y: 100 }]);
  });
  it('a pinch during slow motion aborts it', () => {
    const g = make(); g.lock(JELLY); g.down(1, 100, 100, 0);
    expect(types(g.down(2, 200, 100, 10))).toEqual(['abort']);
  });
  it('the page unlocking (the shot landed) returns to idle', () => {
    const g = make(); g.lock(JELLY); g.unlock(); expect(g.state).toBe('idle');
  });
});

/* "I pressed fire and nothing happened" regressions. A press must never be
   dropped: it fires now, or the moment the rifle is ready. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./ui", async importOriginal => {
  // stub every DOM-touching export with a no-op
  const real = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(real).map(k => [k, () => { }]));
});
vi.mock("./audio", () => ({ sfx: () => { }, music: { setMood: () => { }, mute: () => { } }, initAudio: () => { } }));

const { G, VIEW } = await import("./state");
const rules = await import("./rules");

let now = 0;
const tick = (sec: number) => { const steps = Math.ceil(sec / .02); for (let i = 0; i < steps; i++) { now += 20; rules.update(.02, .02); } };

beforeEach(() => {
  now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  Object.assign(VIEW, { W: 800, H: 600, D: 1, base: 1.4 });
  rules.newMission();
  tick(.5); // scope settles
});

describe('firing', () => {
  it('fires immediately when ready', () => {
    const before = G.mag;
    rules.requestFire();
    expect(G.mag).toBe(before - 1);
  });
  it('a press during the cooldown is queued, not dropped', () => {
    rules.requestFire();
    const after1 = G.mag;
    now += 50; rules.requestFire(); // well inside the cooldown
    expect(G.mag).toBe(after1);
    tick(.3);
    expect(G.mag).toBe(after1 - 1);
  });
  it('slow-mo and hit-stop never stretch the cooldown', () => {
    rules.requestFire();
    const m = G.mag;
    // game clock frozen (hit-stop), but real time passes
    for (let i = 0; i < 15; i++) { now += 20; rules.update(0, .02); }
    rules.requestFire();
    expect(G.mag).toBe(m - 1);
  });
  it('pressing fire on an empty mag reloads and then shoots', () => {
    G.mag = 0;
    rules.requestFire();
    expect(G.reloading).toBeGreaterThan(0);
    expect(G.survey).toBe(true); // rifle comes down to reload
    tick(G.rifle.reload + .5);
    expect(G.survey).toBe(false);
    expect(G.mag).toBe(G.rifle.mag - 1);
  });
  it('fire interrupts a manual reload when rounds are left', () => {
    rules.requestFire(); tick(.3);
    rules.startReload();
    expect(G.reloading).toBeGreaterThan(0);
    const m = G.mag;
    rules.requestFire(); tick(.3);
    expect(G.reloading).toBe(0);
    expect(G.mag).toBe(m - 1);
  });
  it('fire from survey raises the scope and then shoots', () => {
    rules.lowerScope(); tick(.4);
    const m = G.mag;
    rules.requestFire();
    tick(.4);
    expect(G.survey).toBe(false);
    expect(G.mag).toBe(m - 1);
  });
});

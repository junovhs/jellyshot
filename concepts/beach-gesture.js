// Jelly Time gestures, second pass (the person's playtest of FEAT-17): no hard lock-on, release fires.
//   drag            pan the view; the world sticks to the finger. The page adds a gentle pull toward a jelly under the
//                   reticle, a help, never a lock.
//   let go fast     the view glides on (inertia). No shot.
//   let go slowly with a jelly under the reticle (or a still tap then)   time slows and a short countdown shows; when it
//                   runs out the shot goes off wherever the reticle is. The jelly can walk out of it: you can miss.
//   touch during the countdown   cancels it, and the same touch carries on panning
// Two fingers pinch to zoom. A FIRE button (the page's) fires at once, for players who aim with one thumb and shoot
// with the other.
// The machine asks the page one thing: q.armed(), true when a jelly is under the reticle right now.
// The page calls done() when the countdown's shot has gone off. Every handler returns actions for the page.
export const TUNE = {
  slop: 9,            // px a finger may move and still count as a tap
  tapMs: 300,         // longest press that still counts as a tap
  flick: 260,         // px/s: a release faster than this glides instead of shooting
  velWindow: 90,      // ms of history used for the release velocity
};

export class Gesture {
  constructor(q, tune = {}) {
    this.q = q; this.T = { ...TUNE, ...tune };
    this.state = 'idle';           // idle | press | pan | pinch | aim
    this.ptrs = new Map();
    this.main = null;
    this.pinchD = 0;
  }
  done() { if (this.state === 'aim') this.state = 'idle'; }

  down(id, x, y, t) {
    this.ptrs.set(id, { x, y });
    const out = [];
    if (this.ptrs.size === 2 && this.main) { this.state = 'pinch'; this.pinchD = this.#spread(); return out; }
    if (this.ptrs.size > 2) return out;
    const cancelled = this.state === 'aim';
    if (cancelled) out.push({ type: 'cancel' });
    out.push({ type: 'hold' });
    this.main = { id, x0: x, y0: y, t0: t, x, y, hist: [[t, x, y]], cancelled };
    this.state = 'press';
    return out;
  }

  move(id, x, y, t) {
    if (!this.ptrs.has(id)) return [];
    this.ptrs.set(id, { x, y });
    const out = [];
    if (this.state === 'pinch') {
      const d = this.#spread();
      if (this.pinchD > 0 && d > 0) out.push({ type: 'zoom', factor: d / this.pinchD });
      this.pinchD = d; return out;
    }
    const m = this.main; if (!m || m.id !== id) return out;
    m.hist.push([t, x, y]);
    while (m.hist.length > 2 && t - m.hist[0][0] > this.T.velWindow) m.hist.shift();
    if (this.state === 'press' && Math.hypot(x - m.x0, y - m.y0) > this.T.slop) this.state = 'pan';
    if (this.state !== 'pan') return out;
    out.push({ type: 'pan', dx: x - m.x, dy: y - m.y, x, y });
    m.x = x; m.y = y;
    return out;
  }

  up(id, x, y, t) {
    if (!this.ptrs.has(id)) return [];
    const out = this.main?.id === id && this.state !== 'pinch' ? this.move(id, x, y, t) : [];
    this.ptrs.delete(id);
    if (this.state === 'pinch') {   // back to one finger: carry on panning from where it is, without a jump
      if (this.ptrs.size === 1) { const [[rid, p]] = [...this.ptrs]; this.main = { id: rid, x0: p.x, y0: p.y, t0: t, x: p.x, y: p.y, hist: [[t, p.x, p.y]], fromPinch: true }; this.state = 'pan'; }
      else if (this.ptrs.size === 0) { this.main = null; this.state = 'idle'; }
      return out;
    }
    const m = this.main; if (!m || m.id !== id) return out;
    this.main = null;
    const [vx, vy] = this.#velocity(m, t), fast = Math.hypot(vx, vy) >= this.T.flick;
    this.state = 'idle';
    if (m.fromPinch) return out;   // the last finger of a pinch never shoots
    const moved = Math.hypot(x - m.x0, y - m.y0) > this.T.slop;
    if (m.cancelled && !moved) return out;   // the tap that called a shot off never starts another
    if (fast && moved) out.push({ type: 'glide', vx, vy });
    else if (this.q.armed()) { out.push({ type: 'release' }); this.state = 'aim'; }
    return out;
  }

  cancel(id) { this.ptrs.delete(id); if (this.main?.id === id) this.main = null; if (!this.ptrs.size && this.state !== 'aim') this.state = 'idle'; return []; }

  #spread() { const p = [...this.ptrs.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
  #velocity(m, t) {
    const h = m.hist.filter(([ht]) => t - ht <= this.T.velWindow);
    if (h.length < 2) return [0, 0];
    const [t0, x0, y0] = h[0], [t1, x1, y1] = h.at(-1), dt = Math.max(16, t1 - t0) / 1000;
    if (t - t1 > 60) return [0, 0];   // the finger stopped before it lifted: no throw
    return [(x1 - x0) / dt, (y1 - y0) / dt];
  }
}

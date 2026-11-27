// Jelly Time gestures (DEC-03), as a small state machine with no DOM and no Three.js, so it can be tested.
// One finger does everything:
//   drag            pan the view (the reticle stays in the middle of the screen); the page adds aim friction and a magnet
//   let go moving   the view glides on (inertia); if it comes to rest on a jelly the page acquires it
//   let go on a jelly (slow finger)  acquire: slow motion, the camera holds the jelly under the reticle
//   tap a jelly     acquire that jelly (the camera whips to it)
//   while acquired: a short tap fires, a drag aborts slow motion and keeps panning in the same touch
// Two fingers pinch to zoom. A second thumb can use the FIRE button at any time (handled by the page, not here).
//
// The page owns the lock. It tells the machine with lock() / unlock(); the machine asks the page through `q`:
//   q.overTarget()   the jelly under the reticle right now (magnet included), or null
//   q.pickAt(x, y)   the jelly under a screen point (generous), or null
// Every handler returns a list of actions for the page to apply.
export const TUNE = {
  slop: 9,            // px a finger may move and still count as a tap
  tapMs: 280,         // longest press that still counts as a tap
  flick: 140,         // px/s: a release faster than this glides instead of acquiring
  velWindow: 90,      // ms of history used for the release velocity
};

export class Gesture {
  constructor(q, tune = {}) {
    this.q = q; this.T = { ...TUNE, ...tune };
    this.state = 'idle';           // idle | press | pan | locked | lockedPress | pinch
    this.locked = null;            // the acquired jelly, as the page last reported it
    this.ptrs = new Map();         // id -> {x, y}
    this.main = null;              // { id, x0, y0, t0, x, y, hist: [[t, x, y]] }
    this.pinchD = 0;
  }
  lock(j) { this.locked = j; if (this.state === 'idle') this.state = 'locked'; }
  unlock() { this.locked = null; if (this.state === 'locked') this.state = 'idle'; else if (this.state === 'lockedPress') this.state = 'press'; }

  down(id, x, y, t) {
    this.ptrs.set(id, { x, y });
    const out = [];
    if (this.ptrs.size === 2 && this.main) {   // second finger: pinch (a pinch during slow motion aborts it)
      if (this.state === 'lockedPress' || this.state === 'locked') { out.push({ type: 'abort' }); this.locked = null; }
      this.state = 'pinch'; this.pinchD = this.#spread(); return out;
    }
    if (this.ptrs.size > 2) return out;
    this.main = { id, x0: x, y0: y, t0: t, x, y, hist: [[t, x, y]] };
    out.push({ type: 'hold' });   // a touch stops any glide
    this.state = this.state === 'locked' ? 'lockedPress' : 'press';
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
    const far = Math.hypot(x - m.x0, y - m.y0) > this.T.slop;
    if (this.state === 'press' && far) { this.state = 'pan'; out.push({ type: 'pan', dx: x - m.x, dy: y - m.y, x, y }); }
    else if (this.state === 'lockedPress' && far) {
      this.state = 'pan'; this.locked = null;
      out.push({ type: 'abort' }, { type: 'pan', dx: x - m.x, dy: y - m.y, x, y });
    } else if (this.state === 'pan') out.push({ type: 'pan', dx: x - m.x, dy: y - m.y, x, y });
    else { m.hist.push([t, x, y]); return out; }   // still inside the slop: no pan yet, keep the anchor at the last position
    m.x = x; m.y = y; m.hist.push([t, x, y]);
    while (m.hist.length > 2 && t - m.hist[0][0] > this.T.velWindow) m.hist.shift();
    return out;
  }

  up(id, x, y, t) {
    if (!this.ptrs.has(id)) return [];
    const out = this.main?.id === id && this.state !== 'pinch' ? this.move(id, x, y, t) : [];
    this.ptrs.delete(id);
    if (this.state === 'pinch') {   // back to one finger: carry on panning from where it is, without a jump
      if (this.ptrs.size === 1) { const [[rid, p]] = [...this.ptrs]; this.main = { id: rid, x0: p.x, y0: p.y, t0: t, x: p.x, y: p.y, hist: [[t, p.x, p.y]] }; this.state = 'pan'; }
      else if (this.ptrs.size === 0) { this.main = null; this.state = 'idle'; }
      return out;
    }
    const m = this.main; if (!m || m.id !== id) return out;
    const quick = t - m.t0 <= this.T.tapMs && Math.hypot(x - m.x0, y - m.y0) <= this.T.slop;
    this.main = null;
    switch (this.state) {
      case 'lockedPress':
        if (quick) { out.push({ type: 'fire' }); this.state = 'locked'; }   // the page unlocks once the shot lands
        else this.state = 'locked';                                          // a long still hold does nothing
        return out;
      case 'press': {
        this.state = 'idle';
        if (quick) { const j = this.q.pickAt(x, y); if (j) { out.push({ type: 'acquire', j, how: 'tap', x, y }); this.locked = j; this.state = 'locked'; } }
        return out;
      }
      case 'pan': {
        this.state = 'idle';
        const [vx, vy] = this.#velocity(m, t), sp = Math.hypot(vx, vy);
        if (sp < this.T.flick) {
          const j = this.q.overTarget();
          if (j) { out.push({ type: 'acquire', j, how: 'lift' }); this.locked = j; this.state = 'locked'; }
        } else out.push({ type: 'glide', vx, vy });
        return out;
      }
    }
    return out;
  }

  cancel(id) { this.ptrs.delete(id); if (this.main?.id === id) this.main = null; if (!this.ptrs.size) this.state = this.locked ? 'locked' : 'idle'; return []; }

  #spread() { const p = [...this.ptrs.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
  #velocity(m, t) {
    const h = m.hist.filter(([ht]) => t - ht <= this.T.velWindow);
    if (h.length < 2) return [0, 0];
    const [t0, x0, y0] = h[0], [t1, x1, y1] = h.at(-1), dt = Math.max(16, t1 - t0) / 1000;
    if (t - t1 > 60) return [0, 0];   // the finger stopped before it lifted: no throw
    return [(x1 - x0) / dt, (y1 - y0) / dt];
  }
}

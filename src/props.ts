/* =====================================================================
   PROPS — the opportunities. Each has hit(), shot(), update(), draw().
   ===================================================================== */
import { DUCKS, GNOMES, HANDLER, LINES, LOC, PAL, PAL_KEYS, type PalKey } from "./data";
import { circ, ell, ellS, g, ln, poly, ringS, rrect, txt } from "./draw";
import { drawNPC, mkNPC, say } from "./npc";
import { accident, addScore, award, beeChase, crowdSay, discover, escapeTarget, fallIn, floater, handler, killNPC, npcsIn, puff, shake, spark, splashAt, spray, startle } from "./rules";
import { toast } from "./ui";
import { sfx } from "./audio";
import { G, type Ammo, type NPC, type Prop, type PropHit, type ShotResult } from "./state";

interface Rocket { x: number; y: number; vx: number; vy: number; t: number; c: PalKey; burst: boolean; delay?: number; parts: { x: number; y: number; vx: number; vy: number; l: number }[] }
import { TAU, clamp, dist, inEll, lerp, pick, rand, rng, segDist, type Pt } from "./util";

/** Typed prop literal: `this` inside its methods is the literal's own type. */
function prop<T extends Prop>(p: T & ThisType<T>): T { return p; }

const GUMPATH: Pt[] = [[300, 244], [350, 300], [430, 372], [520, 446], [600, 505], [700, 548], [820, 590]];
const GUMLEN = (() => { let l = 0; for (let i = 1; i < GUMPATH.length; i++) l += dist(...GUMPATH[i - 1], ...GUMPATH[i]); return l; })();
function alongPath(d: number): [number, number, number, number] {
  for (let i = 1; i < GUMPATH.length; i++) {
    const [ax, ay] = GUMPATH[i - 1], [bx, by] = GUMPATH[i], l = dist(ax, ay, bx, by);
    if (d <= l) { const t = d / l; return [lerp(ax, bx, t), lerp(ay, by, t), (by - ay) / l, -(bx - ax) / l]; }
    d -= l;
  }
  const [x, y] = GUMPATH[GUMPATH.length - 1]; return [x, y, 0, 0];
}

export function makeProps(): Prop[] {
  const P: Prop[] = [];

  /* ---- THE $JIGGLE COIN (hung over the stage) ---- */
  P.push(prop({
    id: 'cake', opp: 'cake', x: 1000, y: 306, h: 100, vy: 0, state: 'hang', wob: 0, dx: 1000, dy: 200, dr: 70,
    hit(px: number, py: number): PropHit | null {
      if (this.state !== 'hang') return null;
      if (Math.abs(px - 1000) < 8 && py > 86 && py < 124) return { kind: 'rope', precise: true };
      if (inEll(px, py, { x: 1000, y: 306 - this.h - 40, rx: 44, ry: 44 })) return { kind: 'cake' };
      return null;
    },
    shot(hit: PropHit, ammo: Ammo): ShotResult {
      if (hit.kind === 'rope' || ammo === 'bomb') { this.state = 'fall'; sfx('snap'); crowdSay(1000, 400, 260, 'shocked', 4); discover('cake'); return 'prop'; }
      this.wob = 1; sfx('boing'); startle(1000, 260, 140, 'Did the coin just move?'); return 'lure';
    },
    update(dt: number): void {
      this.wob = Math.max(0, this.wob - dt * 1.6);
      if (this.state === 'fall') {
        this.vy += 1500 * dt; this.h -= this.vy * dt;
        if (this.h <= 0) {
          this.h = 0; this.state = 'smashed'; shake(16); sfx('splat'); sfx('boom', .5);
          spray(1000, 300, ['#ffd0e5', '#ffffff', '#ff7fb2', '#fff5b0'], 90, 1.4);
          const early = G.T < 50;
          G.flags.cakeDown = true;
          const vic = npcsIn(1000, 304, 74, 42);
          accident(vic, 'cake');
          if (early) { G.flags.cakeEarly = true; award('reroute'); handler(HANDLER.reroute); }
          crowdSay(1000, 380, 320, 'shocked', 6);
        }
      }
    },
    draw(): void {
      // the rigging crane, lifeguard red and white
      const cx = LOC.crane.x;
      ell(cx + 4, 268, 22, 7, '#5a3f6a30');
      for (let y = 262; y > 86; y -= 16) ln(cx, y, cx, Math.max(86, y - 16), (y / 16 | 0) % 2 ? '#ff5a4a' : '#fff6ea', 9);
      ln(cx + 6, 90, 980, 90, '#ff5a4a', 7); ln(cx + 6, 90, 980, 90, '#fff6ea', 2);
      ln(cx, 120, cx - 60, 90, '#ff5a4a', 4);
      rrect(cx - 12, 238, 24, 24, 5, '#ffd36b');
      if (this.state === 'smashed') {
        ell(1000, 304, 70, 22, '#d58c21'); ell(1000, 301, 64, 18, '#ffcc4c');
        txt('$J', 1000, 301, 16, '#b5851e');
        for (let i = 0; i < 9; i++) ell(940 + i * 15, 312 + Math.sin(i * 3) * 10, 7, 4, i % 2 ? '#f3d6a0' : '#ffe066');
        ln(1000, 90, 1000 + Math.sin(G.clock * 2) * 6, 132, '#fff3df', 2);
        return;
      }
      const by = 306 - this.h, w = Math.sin(G.clock * 18) * this.wob * 6, sway = Math.sin(G.clock * 1.3) * 1.2;
      ln(1000, 90, 1000 + sway, by - 80, '#fff3df', 2.5);
      if (this.h > 2) ell(1000, 306, 50 * (1 - this.h / 160), 12 * (1 - this.h / 160), '#5a3f6a30');
      g.save(); g.translate(1000 + sway + w, by - 40);
      const spin = Math.cos(G.clock * .9) * .25 + .75;
      ell(0, 3, 40 * spin + 4, 40, '#d58c21');
      ell(0, 0, 40 * spin, 40, '#ffcc4c');
      ell(0, 0, 31 * spin, 31, '#ffe066');
      ell(-11 * spin, -14, 9 * spin, 6, '#fff5b0');
      g.save(); g.scale(spin, 1); txt('$J', 0, 2, 26, '#d58c21'); g.restore();
      rrect(-5, -45, 10, 7, 3, '#d58c21');
      g.restore();
    }
  }));

  /* ---- THE RUSTY GRILL (BBQ cook-off) ---- */
  P.push(prop({
    id: 'oven', opp: 'oven', x: 660, y: 466, state: 'ok', t: 0, dx: 660, dy: 440, dr: 46,
    hit(px: number, py: number): PropHit | null { if (this.state === 'boom') return null; return px > 636 && px < 684 && py > 404 && py < 470 ? { kind: 'oven' } : null; },
    shot(_hit: PropHit, ammo: Ammo): ShotResult {
      if (this.state !== 'ok') return 'lure';
      this.state = 'heat'; this.t = ammo === 'bomb' ? .05 : 2.2; sfx('clank'); discover('oven');
      const j = G.byId.rick; if (j?.alive && dist(j.x, j.y, 660, 466) < 140) say(j, 'Is it hot in here, chief?', 2);
      return 'prop';
    },
    update(dt: number): void {
      if (this.state === 'heat') {
        this.t -= dt;
        if (Math.random() < dt * 20) puff(650 + rand(-6, 6), 400, '#ffffffaa');
        if (this.t <= 0) {
          this.state = 'boom'; G.flags.ovenBoom = true; shake(18); sfx('boom');
          spray(660, 440, ['#ffb84c', '#ff5c5c', '#fff5b0', '#5a3f6a'], 80, 1.3);
          for (let i = 0; i < 12; i++) puff(660 + rand(-40, 40), 430 + rand(-30, 20), '#5a4458aa');
          accident(npcsIn(660, 470, 96, 62), 'oven');
          startle(660, 466, 300, null);
        }
      }
    },
    draw(): void {
      const x = 660, y = 466, s = this.state === 'heat' ? Math.sin(G.clock * 60) * 2 : 0;
      ell(x + 4, y + 3, 30, 8, '#5a3f6a30');
      if (this.state === 'boom') { ell(x, y - 4, 26, 10, '#3a2a3a'); for (let i = 0; i < 4; i++) ln(x - 18 + i * 12, y - 6, x - 22 + i * 14, y - 30, '#2a1e2a', 4); return; }
      g.save(); g.translate(s, 0);
      ln(x - 16, y, x - 12, y - 30, '#5a4458', 4); ln(x + 16, y, x + 12, y - 30, '#5a4458', 4);
      rrect(x + 14, y - 22, 12, 22, 5, '#ff6b5a'); rrect(x + 16, y - 26, 8, 5, 2, '#c8c8d0');
      g.beginPath(); g.ellipse(x, y - 34, 24, 18, 0, 0, Math.PI); g.fillStyle = '#3a3a48'; g.fill();
      const hot = this.state === 'heat' ? .5 + Math.sin(G.clock * 20) * .5 : 0;
      ell(x, y - 34, 24, 7, hot ? `rgb(255,${140 - hot * 80},${60 - hot * 40})` : '#ff9a3a');
      for (let i = 0; i < 4; i++) rrect(x - 16 + i * 9, y - 39, 6, 6, 2, '#9a4a2a');
      for (let i = 0; i < 3; i++) { const ph = (G.clock * (hot ? 2.5 : 1) + i / 3) % 1; circ(x - 10 + i * 10 + Math.sin(G.clock * 3 + i) * 3, y - 46 - ph * 30, 4 + ph * 6, `rgba(255,255,255,${.45 * (1 - ph)})`); }
      g.beginPath(); g.ellipse(x - 26, y - 44, 18, 20, -.5, Math.PI * .9, Math.PI * 1.9); g.fillStyle = '#4a4a5a'; g.fill();
      g.restore();
    }
  }));

  /* ---- THE COCONUT PILE (a net of coconuts on the dune) ---- */
  P.push(prop({
    id: 'gumball', opp: 'gumball', x: 300, y: 244, state: 'ok', balls: [] as { d: number; off: number; sp: number; c: PalKey; r: number; x: number; y: number; live: boolean }[], dx: 300, dy: 180, dr: 50,
    hit(px: number, py: number): PropHit | null { if (this.state !== 'ok') return null; return dist(px, py, 300, 168) < 38 || (Math.abs(px - 300) < 16 && py > 200 && py < 244) ? { kind: 'globe' } : null; },
    shot(): ShotResult {
      if (this.state !== 'ok') return 'lure';
      this.state = 'broken'; sfx('glass'); sfx('rumble'); shake(10); discover('gumball');
      spray(300, 168, ['#8a5a2a', '#fff6ea', '#c8945e', '#4fb04a'], 50, 1);
      for (let i = 0; i < 34; i++) this.balls.push({ d: -i * 10 - rand(0, 20), off: rand(-16, 16), sp: rand(170, 230), c: PAL_KEYS[i % 6], r: rand(6, 9), x: 300, y: 200, live: true });
      accident(npcsIn(300, 256, 80, 46), 'gumball');
      startle(300, 250, 240, null);
      return 'prop';
    },
    update(dt: number): void {
      for (const b of this.balls) {
        if (!b.live) continue;
        b.d += b.sp * dt;
        if (b.d < 0) continue;
        if (b.d >= GUMLEN + b.off * 3) { b.live = false; }
        const [x, y, nx, ny] = alongPath(Math.min(b.d, GUMLEN + b.off * 3));
        b.x = x + nx * b.off; b.y = y + ny * b.off;
        for (const n of G.npcs) if (n.alive && !n.dying && dist(n.x, n.y, b.x, b.y) < n.r + b.r) accident([n], 'gumball');
      }
    },
    draw(): void {
      const x = 300, y = 244;
      ell(x + 4, y + 4, 34, 9, '#5a3f6a30');
      // a wooden coconut stand with a sagging net full of coconuts on top
      rrect(x - 26, y - 46, 52, 46, 6, '#c8945e'); rrect(x - 26, y - 46, 52, 8, 4, '#e0b07a');
      txt('COCONUTS', x, y - 22, 8, '#7a4a22');
      if (this.state === 'ok') {
        const r = rng(3);
        for (let i = 0; i < 26; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 30; const cx = x + Math.cos(a) * d, cy = y - 78 + Math.sin(a) * d * .9; circ(cx, cy, 7, i % 3 ? '#8a5a2a' : '#6a4422'); circ(cx - 2, cy - 2, 2, '#b07e4c'); }
        g.beginPath(); g.ellipse(x, y - 78, 40, 38, 0, 0, TAU); g.fillStyle = '#fff6ea22'; g.fill();
        rrect(x - 4, y - 122, 8, 10, 3, '#e8d0a0');
      } else {
        for (let i = 0; i < 8; i++) poly([x - 30 + i * 9, y - 46, x - 26 + i * 9, y - 56, x - 22 + i * 9, y - 46], '#e8d0a0');
      }
      for (const b of this.balls) if (b.d >= 0) { ell(b.x, b.y + b.r * .7, b.r, b.r * .35, '#5a3f6a30'); circ(b.x, b.y, b.r, '#8a5a2a'); circ(b.x - b.r * .3, b.y - b.r * .35, b.r * .3, '#b07e4c'); }
    }
  }));

  /* ---- THE JET-SKI DOCK (ground layer) ---- */
  P.push(prop({
    id: 'dock', opp: 'dock', ground: true, x: 584, y: 908, state: 'ok', t: 0, dx: 584, dy: 920, dr: 70,
    hit(px: number, py: number): PropHit | null {
      if (this.state !== 'ok') return null;
      for (const ppx of [552, 622]) if (Math.abs(px - ppx) < 9 && py > 922 && py < 958) return { kind: 'post', precise: true };
      return null;
    },
    shot(): ShotResult {
      this.state = 'collapse'; this.t = 0; G.flags.dockGone = true; sfx('crack'); sfx('splash'); discover('dock');
      for (const n of G.npcs) if (n.alive && n.x > 508 && n.x < 660 && n.y > 878 && n.y < 940) fallIn(n, 'dock', rand(.1, .35));
      return 'prop';
    },
    update(dt: number): void { if (this.state === 'collapse') { this.t += dt; if (this.t > 1.2) this.state = 'broken'; if (Math.random() < dt * 30) splashAt(rand(520, 650), rand(895, 930)); } },
    draw(): void {
      if (this.state === 'broken') { rrect(546, 922, 10, 18, 2, '#a8704f'); rrect(616, 924, 10, 14, 2, '#a8704f'); for (let i = 0; i < 4; i++) rrect(520 + i * 32, 900 + Math.sin(G.clock + i) * 3, 22, 6, 2, '#d9a77ecc'); return; }
      const k = this.state === 'collapse' ? clamp(this.t / 1, 0, 1) : 0;
      g.save(); g.globalAlpha = 1 - k * .6; g.translate(0, k * 18);
      rrect(548, 924, 8, 32, 2, '#8f5a3a'); rrect(618, 924, 8, 32, 2, '#8f5a3a');
      rrect(512, 884, 146, 42, 5, '#b07a52');
      rrect(512, 880, 146, 42, 5, '#e3b285');
      for (let i = 0; i < 8; i++) ln(520 + i * 18, 882, 520 + i * 18, 920, '#c9966b', 2);
      rrect(654, 876, 10, 26, 3, '#c9966b');
      g.restore();
      // the rental jet ski moored beside it
      const jb = Math.sin(G.clock * 2) * 1.5;
      ell(536, 950 + jb, 26, 8, '#e0c020'); ell(530, 946 + jb, 22, 6, '#ffe066'); rrect(530, 938 + jb, 12, 6, 3, '#2a2035'); ell(548, 944 + jb, 6, 3, '#7fd9ff');
    }
  }));

  /* ---- THE SEAGULL NEST (in a palm) ---- */
  P.push(prop({
    id: 'hive', opp: 'hive', x: 1640, y: 676, state: 'ok', bees: [] as { x: number; y: number; a: number; who: NPC | null; life: number }[], dx: 1620, dy: 610, dr: 40, fallT: 0,
    hit(px: number, py: number): PropHit | null { if (this.state !== 'ok') return null; return dist(px, py, 1612, 614) < 16 ? { kind: 'hive', precise: true } : null; },
    shot(): ShotResult {
      this.state = 'fallen'; sfx('buzz'); discover('hive');
      const vic = npcsIn(1600, 690, 170, 104);
      for (const n of vic) beeChase(n);
      for (let i = 0; i < 26; i++) this.bees.push({ x: 1612, y: 620, a: rand(0, TAU), who: vic.length ? vic[i % vic.length] : null, life: rand(8, 14) });
      return 'prop';
    },
    update(dt: number): void {
      if (this.state === 'fallen') this.fallT = Math.min(1, this.fallT + dt * 2.5);
      for (const b of this.bees) {
        b.life -= dt; b.a += dt * rand(6, 10);
        const tx = b.who?.alive ? b.who.x : 1612, ty = b.who?.alive ? b.who.y - 20 : 620;
        b.x += (tx + Math.cos(b.a) * 16 - b.x) * Math.min(1, dt * 5); b.y += (ty + Math.sin(b.a * 1.3) * 12 - b.y) * Math.min(1, dt * 5);
      }
      this.bees = this.bees.filter(b => b.life > 0);
    },
    draw(): void {
      const x = 1640, y = 676;
      ell(x + 10, y + 4, 44, 12, '#6a4a3a2a');
      for (let k = 0; k < 9; k++) { const t = k / 9; circ(x - 20 * t * t, y - t * 70, 9 - t * 3, k % 2 ? '#c8945e' : '#b07e4c'); }
      const cx = x - 20, cy = y - 72;
      const frond = (a: number, len: number, c: string) => {
        const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * .6 + len * .25, nx = -Math.sin(a), ny = Math.cos(a) * .6;
        g.beginPath(); g.moveTo(cx, cy);
        g.quadraticCurveTo(cx + Math.cos(a) * len * .5 + nx * 14, cy + Math.sin(a) * len * .3 - 18 + ny * 14, ex, ey);
        g.quadraticCurveTo(cx + Math.cos(a) * len * .5 - nx * 4, cy + Math.sin(a) * len * .3 - 6, cx, cy);
        g.fillStyle = c; g.fill();
      };
      for (const a of [Math.PI * .95, Math.PI * .05, Math.PI * .6]) frond(a, 60, '#2f8a3a');
      for (const a of [Math.PI * 1.1, -Math.PI * .1, Math.PI * .78, Math.PI * .22]) frond(a, 52, '#4fb04a');
      const hy = this.state === 'ok' ? 614 : lerp(614, 676, this.fallT);
      g.save(); g.translate(1612, hy); if (this.state !== 'ok') g.rotate(this.fallT * 1.4);
      ell(0, 2, 15, 8, '#8a6a42'); ell(0, -1, 12, 5, '#b8945e'); circ(-4, -3, 3.5, '#f4f0e0'); circ(3, -3, 3.5, '#e8e4d4');
      if (this.state === 'ok') { ell(2, -10, 7, 5, '#fffaf2'); circ(7, -14, 3.5, '#fffaf2'); poly([10, -15, 14, -14, 10, -13], '#ffb84c'); circ(8, -15, .9, '#50334f'); ell(-1, -10, 4, 2.5, '#b8bcc8'); }
      g.restore();
      for (const b of this.bees) { const fl = Math.sin(G.clock * 24 + b.a) * 3; ell(b.x, b.y, 4, 2.6, '#fffaf2'); poly([b.x - 5, b.y, b.x + 1, b.y, b.x - 2, b.y - 4 - fl], '#b8bcc8'); poly([b.x + 3, b.y - 1, b.x + 6, b.y, b.x + 3, b.y + 1], '#ffb84c'); }
    }
  }));

  /* ---- THE VOLLEYBALL NET POLE (spring-loaded, badly anchored) ---- */
  P.push(prop({
    id: 'maypole', opp: 'maypole', x: 1350, y: 968, state: 'up', k: 0, dx: 1350, dy: 860, dr: 40,
    top(): Pt { const a = this.k * Math.PI / 2; return [1350, 968 - 150 * Math.cos(a) + 108 * Math.sin(a)]; },
    hit(px: number, py: number): PropHit | null {
      if (this.state !== 'up') return null;
      if (dist(px, py, 1350, 818) < 14) return { kind: 'knot', precise: true };
      if (Math.abs(px - 1350) < 6 && py > 830 && py < 968) return { kind: 'pole' };
      return null;
    },
    shot(hit: PropHit, ammo: Ammo): ShotResult {
      if (hit.kind === 'pole' && ammo !== 'bomb') { sfx('thunk'); startle(1350, 968, 120, 'Did the net pole just twang?'); return 'lure'; }
      this.state = 'fall'; this.k = 0; sfx('crack'); discover('maypole'); crowdSay(1350, 970, 200, 'shocked', 4);
      return 'prop';
    },
    update(dt: number): void {
      if (this.state === 'fall') {
        this.k += dt * (0.8 + this.k * 3.5);
        if (this.k >= 1) {
          this.k = 1; this.state = 'down'; shake(12); sfx('thud'); G.flags.maypoleDown = true;
          spray(1350, 1060, ['#ff8fc1', '#ffe066', '#7fd9ff', '#fff'], 40, 1);
          const vic = G.npcs.filter(n => n.alive && !n.dying && segDist(n.x, n.y, 1350, 968, 1350, 1078) < n.r + 14);
          accident(vic, 'maypole');
        }
      }
    },
    draw(): void {
      const [tx, ty] = this.top();
      ell(1354, 972, 14, 5, '#5a3f6a30');
      // the net, strung to a short post on the west side of the court
      if (this.state === 'up') {
        ln(1236, 968, 1236, 880, '#fff6ea', 5);
        g.beginPath(); g.moveTo(1236, 884); g.lineTo(tx, ty + 40); g.lineTo(tx, ty + 70); g.lineTo(1236, 912); g.closePath(); g.fillStyle = '#ffffff40'; g.fill();
        for (let k = 0; k < 6; k++) { const t = k / 5; rrect(lerp(1236, tx, t) - 1, lerp(884, ty + 40, t), 2, 28, 1, '#ffffff55'); }
        rrect(1236, 882, tx - 1236, 4, 2, '#fffaf2');
      } else { rrect(1236, 950, 100, 18, 4, '#ffffff40'); ln(1236, 968, 1236, 880, '#fff6ea', 5); }
      g.beginPath(); g.moveTo(1350, 968); g.lineTo(tx, ty); g.strokeStyle = '#fff6ea'; g.lineWidth = 8; g.lineCap = 'round'; g.stroke();
      g.setLineDash([10, 10]); g.strokeStyle = '#3a7aff'; g.lineWidth = 8; g.stroke(); g.setLineDash([]);
      circ(tx, ty, 9, '#ffd36b'); circ(tx - 3, ty - 3, 3, '#fff5b0');
    }
  }));

  /* ---- SKYLAR'S PARASAIL (lands on and leaves from the pad) ---- */
  P.push(prop({
    id: 'balloon', opp: 'balloon', x: 1665, y: 262, h: 380, vy: 0, state: 'arrive', rider: null as NPC | null, t: 0, dx: 1665, dy: 150, dr: 70,
    envY(): number { return 262 - this.h - 120; },
    hit(px: number, py: number): PropHit | null {
      if (['deflated', 'crashed', 'gone'].includes(this.state)) return null;
      return inEll(px, py, { x: 1665, y: this.envY(), rx: 52, ry: 60 }) ? { kind: 'env' } : null;
    },
    shot(): ShotResult {
      discover('balloon');
      const air = this.h > 24;
      if (air && this.rider?.alive) { this.state = 'falling'; this.vy = 0; sfx('pop'); sfx('whistle'); G.flags.balloonGone = true; handler('Oh dear. Gravity.'); return 'prop'; }
      if (air) { this.state = 'falling'; this.vy = 0; sfx('pop'); G.flags.balloonGone = true; return 'prop'; }
      this.state = 'deflated'; G.flags.balloonGone = true; sfx('pop'); sfx('deflate');
      if (this.rider?.alive) { this.rider.inBalloon = false; this.rider.y = 280; this.rider = null; }
      handler(HANDLER.balloonDown);
      const b = G.byId.skylar; if (b?.alive) say(b, LINES.balloonGone[0], 3);
      return 'prop';
    },
    update(dt: number): void {
      const B = G.byId.skylar;
      if (this.state === 'arrive') {
        if (!this.rider && B?.alive && G.T < 1) { this.rider = B; B.inBalloon = true; }
        this.h = Math.max(0, 380 * (1 - G.T / 15));
        if (this.h <= 0) { this.state = 'landed'; if (this.rider) { this.rider.inBalloon = false; this.rider.x = 1665; this.rider.y = 284; this.rider = null; } }
      } else if (this.state === 'landed') {
        if (B?.alive && !B.inBalloon && (G.T >= 278 || G.lockdown) && dist(B.x, B.y, 1665, 280) < 22) { this.rider = B; B.inBalloon = true; this.state = 'board'; this.t = 1.4; }
      } else if (this.state === 'board') {
        this.t -= dt; if (this.t <= 0) { this.state = 'rise'; sfx('whoosh'); }
      } else if (this.state === 'rise') {
        this.h += (G.lockdown ? 40 : 24) * dt;
        if (this.h > 360) { this.state = 'gone'; if (this.rider?.alive) escapeTarget(this.rider); }
      } else if (this.state === 'falling') {
        this.vy += 520 * dt; this.h -= this.vy * dt;
        if (this.h <= 0) {
          this.h = 0; this.state = 'crashed'; shake(14); sfx('boom', .7); sfx('splat');
          spray(1665, 262, ['#ff7fb2', '#fff0cc', '#a8704f'], 50, 1.1);
          const vic = npcsIn(1665, 270, 50, 30);
          if (this.rider?.alive) { this.rider.inBalloon = false; this.rider.x = 1665; this.rider.y = 268; vic.push(this.rider); }
          this.rider = null;
          accident([...new Set(vic)], 'balloon');
        }
      }
    },
    draw(): void {
      const x = 1665, h = this.h;
      if (this.state === 'gone') return;
      if (this.state === 'deflated' || this.state === 'crashed') {
        ell(x - 30, 262, 60, 16, '#ff4f9a'); ell(x - 34, 258, 48, 10, '#ffc93c');
        rrect(x - 14, 246, 28, 16, 5, this.state === 'crashed' ? '#6b4a3a' : '#2fc4a8');
        return;
      }
      ell(x, 262, 40 * (1 - Math.min(h, 300) / 400), 12 * (1 - Math.min(h, 300) / 400), '#5a3f6a30');
      const ey = this.envY(), by = 262 - h;
      const sway = Math.sin(G.clock * 1.2) * (h > 5 ? 5 : 0);
      g.save(); g.translate(sway, 0);
      ln(x - 46, ey + 6, x - 10, by - 22, '#fff6ea', 1.5); ln(x + 46, ey + 6, x + 10, by - 22, '#fff6ea', 1.5); ln(x, ey + 8, x, by - 22, '#fff6ea', 1.5);
      // the canopy: a striped half-dome, seen from the front
      g.beginPath(); g.ellipse(x, ey + 8, 58, 56, 0, Math.PI, 0); g.fillStyle = '#ff4f9a'; g.fill();
      for (let i = -2; i <= 2; i += 2) { g.beginPath(); g.ellipse(x + i * 16, ey + 8, 9, 55 - Math.abs(i) * 8, 0, Math.PI, 0); g.fillStyle = '#ffc93c'; g.fill(); }
      g.beginPath(); g.ellipse(x, ey + 8, 58, 10, 0, 0, Math.PI); g.fillStyle = '#d03a7a'; g.fill();
      ell(x - 22, ey - 26, 12, 14, '#ffffff55');
      txt('SKY', x, ey - 18, 12, '#fff6ea');
      if (this.rider?.alive) drawNPC(this.rider, h + 6);
      rrect(x - 14, by - 18, 28, 12, 5, '#2fc4a8');
      if (this.state === 'falling') txt('!', x + 40, ey - 40, 28, '#ff4d6d');
      g.restore();
    }
  }));

  /* ---- FIREWORKS CRATES ---- */
  P.push(prop({
    id: 'fireworks', opp: 'fireworks', x: 1262, y: 288, state: 'ok', t: 0, rockets: [] as Rocket[], dx: 1262, dy: 262, dr: 46,
    hit(px: number, py: number): PropHit | null { if (this.state !== 'ok') return null; return px > 1230 && px < 1294 && py > 226 && py < 292 ? { kind: 'crates' } : null; },
    shot(_hit: PropHit, ammo: Ammo): ShotResult {
      this.state = 'fuse'; this.t = ammo === 'bomb' ? .05 : 1.2; sfx('fuse'); discover('fireworks');
      startle(1262, 300, 90, 'Is something fizzing?');
      return 'prop';
    },
    update(dt: number): void {
      if (this.state === 'fuse') {
        this.t -= dt; if (Math.random() < dt * 40) spark(1262 + rand(-20, 20), 240);
        if (this.t <= 0) {
          this.state = 'boom'; G.flags.shedGone = true; shake(24); sfx('boom'); sfx('crackle');
          for (let i = 0; i < 16; i++) this.rockets.push({ x: 1262 + rand(-20, 20), y: 260, vx: rand(-120, 120), vy: rand(-520, -380), t: rand(.5, 1.1), c: PAL_KEYS[i % PAL_KEYS.length], burst: false, parts: [] });
          spray(1262, 270, ['#ffe066', '#ff5c9e', '#7fd9ff', '#ffffff'], 120, 1.5);
          accident(npcsIn(1262, 312, 118, 72), 'fireworks');
          startle(1262, 300, 420, null);
          if (G.T < 262) { G.flags.meetBench = true; if (G.T >= 180) handler(HANDLER.meetingAlt); }
        }
      }
      for (const r of this.rockets) {
        if (r.delay && r.delay > 0) { r.delay -= dt; if (r.delay <= 0) sfx('whoosh', .3); continue; }
        if (!r.burst) { r.x += r.vx * dt; r.y += r.vy * dt; r.vy += 200 * dt; r.t -= dt; if (r.t <= 0) { r.burst = true; sfx('pop', .3); for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; r.parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * rand(80, 160), vy: Math.sin(a) * rand(80, 160), l: rand(.8, 1.4) }); } } }
        for (const p of r.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.vx *= .98; p.l -= dt; }
        r.parts = r.parts.filter(p => p.l > 0);
      }
      this.rockets = this.rockets.filter(r => !r.burst || r.parts.length);
    },
    draw(): void {
      const x = 1262, y = 288;
      if (this.state === 'show') { ell(x, y - 2, 34, 10, '#c9966b'); return; }
      if (this.state === 'boom') { ell(x, y - 4, 50, 16, '#3a2a3a'); for (let i = 0; i < 6; i++) ln(x - 30 + i * 12, y - 4, x - 34 + i * 14, y - 20 - (i % 3) * 6, '#2a1e2a', 4); }
      else {
        const s = this.state === 'fuse' ? Math.sin(G.clock * 70) * 1.5 : 0;
        g.save(); g.translate(s, 0);
        ell(x + 4, y + 2, 36, 8, '#5a3f6a30');
        rrect(x - 30, y - 26, 34, 26, 3, '#c9966b'); rrect(x + 2, y - 24, 30, 24, 3, '#b8845c'); rrect(x - 16, y - 48, 32, 24, 3, '#d9a77e');
        txt('TNT', x - 13, y - 13, 9, '#7a3a2a'); txt('★', x + 17, y - 12, 12, '#ff5c9e');
        for (let i = 0; i < 5; i++) { const rx = x - 12 + i * 6; ln(rx, y - 48, rx, y - 64 - (i % 2) * 6, ['#ff5c9e', '#7fd9ff', '#ffe066'][i % 3], 4); poly([rx - 3, y - 64 - (i % 2) * 6, rx + 3, y - 64 - (i % 2) * 6, rx, y - 72 - (i % 2) * 6], '#fff'); }
        g.restore();
      }
    },
    show(): void {
      this.state = 'show'; sfx('crackle');
      for (let i = 0; i < 24; i++) this.rockets.push({ x: 1262 + rand(-20, 20), y: 260, vx: rand(-160, 160), vy: rand(-560, -400), t: rand(.6, 1.1), delay: i * .28, c: PAL_KEYS[i % PAL_KEYS.length], burst: false, parts: [] });
      crowdSay(1000, 700, 600, 'cheer', 10);
    },
    drawSky(): void {
      for (const r of this.rockets) {
        if (r.delay && r.delay > 0) continue;
        if (!r.burst) { circ(r.x, r.y, 3, '#fff5b0'); ln(r.x, r.y, r.x - r.vx * .03, r.y - r.vy * .03, '#ffe06699', 2); }
        for (const p of r.parts) { g.globalAlpha = clamp(p.l, 0, 1); circ(p.x, p.y, 2.6, PAL[r.c][0]); circ(p.x, p.y, 1.2, '#fff'); }
        g.globalAlpha = 1;
      }
    }
  }));

  /* ---- RUBBER DUCKS (collectibles) ---- */
  P.push(prop({
    id: 'ducks', ground: true, x: 0, y: 0, list: DUCKS.map(([x, y]) => ({ x, y, alive: true, fly: 0 })),
    hit(px: number, py: number): PropHit | null { for (const d of this.list) if (d.alive && dist(px, py, d.x, d.y - 5) < 10) return { kind: 'duck', d, precise: true }; return null; },
    shot(hit: PropHit): ShotResult {
      if (!hit.d) return;
      hit.d.alive = false; hit.d.fly = 1; sfx('quack');
      G.stats.ducks++; floater(hit.d.x, hit.d.y - 20, `QUACK! ${G.stats.ducks}/6`, '#ffe066');
      addScore(150);
      if (G.stats.ducks >= DUCKS.length) award('ducks');
      return 'prop';
    },
    update(dt: number): void { for (const d of this.list) if (!d.alive && d.fly > 0) d.fly -= dt; },
    draw(): void {
      for (const d of this.list) {
        if (!d.alive) { if (d.fly > 0) { const k = 1 - d.fly; g.save(); g.translate(d.x + k * 60, d.y - k * 120); g.rotate(k * 12); duck(0, 0, d.y === 650); g.restore(); } continue; }
        duck(d.x, d.y + Math.sin(G.clock * 2 + d.x) * 1.5, d.x === 990);
      }
    }
  }));

  /* ---- PLASTIC FLAMINGOS (sequential collectibles) ---- */
  P.push(prop({
    id: 'gnomes', x: 0, y: 0, idx: 0, shards: 0, sx: 0, sy: 0,
    get yy() { return GNOMES[this.idx]?.[1] ?? 0; },
    hit(px: number, py: number): PropHit | null { const p = GNOMES[this.idx]; if (!p) return null; return dist(px, py, p[0], p[1] - 14) < 14 ? { kind: 'gnome', precise: true } : null; },
    shot(): ShotResult {
      const p = GNOMES[this.idx]; sfx('glass'); spray(p[0], p[1] - 10, ['#ff599c', '#ffffff', '#ff86b0'], 20, .7);
      this.idx++; G.stats.gnomes = this.idx; addScore(200);
      floater(p[0], p[1] - 30, `FLAMINGO ${this.idx}/5`, '#ffe066');
      if (this.idx >= GNOMES.length) award('gnomes'); else toast('ANOTHER FLAMINGO APPEARED…', 'somewhere far away');
      return 'prop';
    },
    update(): void { this.y = GNOMES[this.idx]?.[1] ?? 0; },
    draw(): void {
      const p = GNOMES[this.idx]; if (!p) return;
      const [x, y] = p;
      ell(x, y + 2, 10, 4, '#5a3f6a30');
      ln(x - 2, y, x - 2, y - 12, '#e0457a', 2); ln(x + 2, y, x + 2, y - 12, '#e0457a', 2);
      ell(x, y - 16, 9, 6, '#ff86b0'); ell(x - 3, y - 17, 5, 3, '#ffb3d1');
      g.beginPath(); g.moveTo(x + 6, y - 18); g.quadraticCurveTo(x + 12, y - 30, x + 5, y - 36); g.lineTo(x + 2, y - 34); g.quadraticCurveTo(x + 8, y - 28, x + 3, y - 18); g.closePath(); g.fillStyle = '#ff86b0'; g.fill();
      circ(x + 4, y - 37, 4, '#ff86b0'); poly([x + 1, y - 38, x - 4, y - 35, x + 1, y - 34], '#50334f'); circ(x + 5, y - 38, 1, '#50334f');
      if (Math.sin(G.clock * 3) > .9) txt('✦', x + 12, y - 40, 10, '#fff5b0');
    }
  }));

  /* ---- FOAM CANNON VALVE (beside the foam pit) ---- */
  P.push(prop({
    id: 'pump', opp: 'pump', x: 1122, y: 676, state: 'ok', t: 0, dx: 1122, dy: 658, dr: 30,
    hit(px: number, py: number): PropHit | null { if (this.state !== 'ok') return null; return px > 1106 && px < 1138 && py > 638 && py < 678 ? { kind: 'pump' } : null; },
    shot(_hit: PropHit, ammo: Ammo): ShotResult {
      if (this.state !== 'ok') return 'lure';
      this.state = 'surge'; this.t = ammo === 'bomb' ? .05 : 1.4; sfx('clank'); sfx('rumble'); discover('pump');
      startle(1000, 630, 160, 'Is the foam cannon... gurgling?');
      return 'prop';
    },
    update(dt: number): void {
      if (this.state === 'surge') {
        this.t -= dt; if (Math.random() < dt * 30) G.parts.push({ type: 'blob', x: 1000 + rand(-40, 40), y: 630, vx: rand(-20, 20), vy: rand(-120, -60), r: rand(3, 5), c: '#fffaf2', hl: '#ffffff', life: .6, g: 300 });
        if (this.t <= 0) {
          this.state = 'blown'; G.flags.chocFlood = true; shake(12); sfx('splat'); sfx('splash');
          for (let i = 0; i < 90; i++) { const a = rand(0, TAU), s = rand(60, 260); G.parts.push({ type: 'blob', x: 1000, y: 600, vx: Math.cos(a) * s, vy: -rand(200, 420), r: rand(3, 8), c: pick(['#fffaf2', '#e8f8ff', '#ffe0ee']), hl: '#ffffff', life: rand(.8, 1.4), g: 520 }); }
          const vic = npcsIn(1000, 630, 112, 64);
          const ev = ++G.eventId;
          for (const n of vic) killNPC(n, { cause: 'fountain', accident: true, concealed: true, ev });
          const tk = (G.evKills[ev] || []).filter(id => G.byId[id].kind === 'target');
          if (tk.includes('brayden') && tk.includes('skylar')) award('fondue');
          if (vic.length > 1) toast(`${vic.length}× FOAMED`, 'lost in the foam');
          if (tk.length) handler(pick(HANDLER.accident));
          crowdSay(1000, 640, 300, 'shocked', 5);
        }
      }
    },
    draw(): void {
      const x = 1122, y = 676, s = this.state === 'surge' ? Math.sin(G.clock * 60) * 1.5 : 0;
      ell(x + 3, y + 2, 18, 5, '#5a3f6a30');
      ln(x - 12, y - 8, 1070, y - 22, '#9aa0b0', 6);
      g.save(); g.translate(s, 0);
      rrect(x - 14, y - 34, 28, 34, 6, this.state === 'blown' ? '#5b4458' : '#3a7aff');
      circ(x, y - 22, 8, '#fff3df'); ln(x, y - 22, x + (this.state === 'surge' ? Math.sin(G.clock * 40) * 6 : 5), y - 26, '#ff4f9a', 2);
      rrect(x - 10, y - 10, 20, 5, 2, '#2a5ad0');
      if (this.state === 'blown') for (let i = 0; i < 3; i++) circ(x - 6 + i * 6, y - 40 - ((G.clock * 20 + i * 7) % 20), 4, '#ffffff55');
      g.restore();
    }
  }));

  /* ---- WELCOME SIGN over the exit gate ---- */
  P.push(prop({
    id: 'sign', opp: 'sign', x: 1000, y: 1280, h: 104, vy: 0, state: 'hang', dx: 1000, dy: 1150, dr: 60,
    hit(px: number, py: number): PropHit | null {
      if (this.state !== 'hang') return null;
      for (const cx of [948, 1052]) if (Math.abs(px - cx) < 7 && py > 1096 && py < 1152) return { kind: 'chain', precise: true };
      if (px > 930 && px < 1070 && py > 1148 && py < 1180) return { kind: 'sign' };
      return null;
    },
    shot(hit: PropHit, ammo: Ammo): ShotResult {
      if (hit.kind === 'sign' && ammo !== 'bomb') { sfx('boing'); startle(1000, 1260, 120, 'Did the sign just wobble?'); return 'lure'; }
      this.state = 'fall'; sfx('snap'); discover('sign'); return 'prop';
    },
    update(dt: number): void {
      if (this.state === 'fall') {
        this.vy += 1600 * dt; this.h -= this.vy * dt;
        if (this.h <= 0) {
          this.h = 0; this.state = 'down'; shake(14); sfx('thud'); sfx('crack');
          spray(1000, 1270, ['#fff0cc', '#ff7fb2', '#c9966b'], 50, 1);
          const vic = npcsIn(1000, 1274, 86, 38);
          const ev = ++G.eventId;
          for (const n of vic) killNPC(n, { cause: 'sign', accident: true, ev });
          if ((G.evKills[ev] || []).some(id => G.byId[id].kind === 'target')) { award('sign'); handler(pick(HANDLER.accident)); }
          G.flags.gateBlocked = true;
        }
      }
    },
    draw(): void {
      const x = 1000, y = 1278;
      ln(x - 80, y, x - 80, y - 110, '#ff7fb2', 12); ln(x + 80, y, x + 80, y - 110, '#ff7fb2', 12);
      g.beginPath(); g.arc(x, y - 110, 80, Math.PI, 0); g.strokeStyle = '#ff7fb2'; g.lineWidth = 12; g.stroke();
      for (let i = 0; i < 5; i++) circ(x - 80 + i * 40, y - 110 - Math.sin(i / 4 * Math.PI) * 80, 5, ['#ffe066', '#7fd9ff', '#ffffff'][i % 3]);
      const by = y - this.h;
      if (this.state === 'hang') { ln(948, 1100, 948, by - 26, '#8a7a92', 2.5); ln(1052, 1100, 1052, by - 26, '#8a7a92', 2.5); for (let k = 1104; k < by - 26; k += 7) { ellS(948, k, 2, 3, '#b8a8c0', 1); ellS(1052, k, 2, 3, '#b8a8c0', 1); } }
      if (this.state === 'down') { g.save(); g.translate(x, y - 6); g.rotate(.06); rrect(-70, -14, 140, 26, 10, '#e8d3a8'); txt('PALMETTO POINT', 0, -1, 12, '#a3477f'); g.restore(); return; }
      if (this.h < 100) ell(x, y, 70 * (1 - this.h / 160), 10, '#5a3f6a30');
      rrect(x - 70, by - 30, 140, 30, 12, '#fff0cc'); rrect(x - 70, by - 30, 140, 6, 6, '#ffffff');
      txt('PALMETTO POINT', x, by - 14, 12, '#c2407f');
    }
  }));

  /* ---- THE HERMIT'S DOORBELL (easter egg) ---- */
  P.push(prop({
    id: 'hut', x: 104, y: 876, state: 'shut',
    hit(px: number, py: number): PropHit | null { if (this.state !== 'shut') return null; return dist(px, py, 140, 826) < 8 ? { kind: 'bell', precise: true } : null; },
    shot(): ShotResult {
      this.state = 'open'; sfx('ding'); sfx('chime', .5);
      const n = mkNPC({ id: 'hermit', kind: 'civ', name: 'Old Salty', role: 'Beach hermit · first outing since 1994', col: 'cocoa', hat: 'beanie', r: 14, speed: 30, lines: 'hermit',
        plan: [{ t: 0, hot: 'plaza', act: 'wander', label: 'Socializing for the first time in 30 years' }] });
      n.x = 108; n.y = 892; G.npcs.push(n); G.byId.hermit = n;
      say(n, 'Visitors?! For ME?', 3); award('hermit');
      floater(110, 820, 'DING DONG!', '#ffe066');
      return 'prop';
    },
    draw(): void {
      const x = 104, y = 876;
      ell(x + 4, y + 4, 44, 12, '#5a3f6a30');
      rrect(x - 30, y - 44, 60, 44, 10, '#fff3df');
      g.beginPath(); g.ellipse(x, y - 46, 50, 34, 0, Math.PI, 0); g.fillStyle = '#e0457a'; g.fill();
      for (const [a, b] of [[-26, -58], [8, -70], [28, -52], [-6, -54]]) circ(x + a, y + b, 5, '#ffffff');
      rrect(x - 10, y - 30, 20, 30, 8, this.state === 'open' ? '#3a2a3a' : '#a8704f');
      circ(x + 18, y - 30, 6, '#7fd9ff'); ringS(x + 18, y - 30, 6, '#fff', 1.5);
      ln(x + 30, y - 36, x + 36, y - 54, '#a8704f', 2);
      circ(140, 826, 6, '#ffd36b'); circ(138, 824, 2, '#fff');
      if (this.state === 'shut' && Math.sin(G.clock * .7) > .6) txt('z', x + 20 + Math.sin(G.clock) * 3, y - 90, 12, '#7a5a8a');
    }
  }));

  /* ---- BAG OF FRIES on the BBQ tent (easter egg) ---- */
  P.push(prop({
    id: 'sack', x: 618, y: 452, state: 'ok', birds: [] as { x: number; y: number; tx: number; ty: number; c: PalKey; st: 'in' | 'peck' | 'out'; ph: number }[], t: 0,
    hit(px: number, py: number): PropHit | null { if (this.state !== 'ok') return null; return dist(px, py, 618, 372) < 11 ? { kind: 'sack', precise: true } : null; },
    shot(): ShotResult {
      this.state = 'spilt'; this.t = 0; sfx('splat', .4); award('birds');
      for (let i = 0; i < 60; i++) G.parts.push({ type: 'spark', x: 618 + rand(-6, 6), y: 372, vx: rand(-40, 40), vy: rand(0, 60), r: 1.8, c: pick(['#ffe066', '#ffcc4c', '#f6c27a']), life: rand(.6, 1.2), g: 300 });
      for (let i = 0; i < 12; i++) this.birds.push({ x: rand(-200, 0) + 300, y: rand(80, 200), tx: 470 + rand(0, 200), ty: 560 + rand(0, 70), c: PAL_KEYS[i % PAL_KEYS.length], st: 'in', ph: rand(0, TAU) });
      handler('Seagulls. You summoned seagulls. Why.');
      return 'prop';
    },
    update(dt: number): void {
      if (this.state !== 'spilt') return;
      this.t += dt;
      for (const b of this.birds) {
        if (this.t > 45 && b.st !== 'out') { b.st = 'out'; b.tx = b.x + 400; b.ty = -200; }
        const sp = b.st === 'peck' ? 0 : 160, dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
        if (d > 3) { b.x += dx / d * Math.min(d, sp * dt); b.y += dy / d * Math.min(d, sp * dt); } else if (b.st === 'in') b.st = 'peck';
        if (b.st === 'peck' && Math.random() < dt * .4) { b.tx = b.x + rand(-30, 30); b.ty = b.y + rand(-14, 14); b.st = 'in'; }
      }
    },
    draw(): void {
      if (this.state === 'ok') { rrect(610, 366, 16, 16, 3, '#ff5a4a'); for (let i = 0; i < 4; i++) rrect(611 + i * 4, 360 - (i % 2) * 3, 2.5, 9, 1, '#ffe066'); rrect(610, 372, 16, 4, 1, '#fff6ea'); }
      for (const b of this.birds) {
        const fly = b.st !== 'peck', fl = Math.sin(G.clock * 20 + b.ph) * 4;
        if (!fly) ell(b.x, b.y + 2, 6, 2, '#5a3f6a30');
        const by = b.y - (fly ? 0 : Math.abs(Math.sin(G.clock * 6 + b.ph)) * 2);
        ell(b.x, by - 4, 6, 5, '#fffaf2'); ell(b.x - 2, by - 5, 4, 2.5, '#b8bcc8'); circ(b.x + 4, by - 8, 3.5, '#fffaf2'); poly([b.x + 7, by - 8, b.x + 10, by - 7, b.x + 7, by - 6], '#ffb84c'); circ(b.x + 5, by - 9, .9, '#50334f');
        if (fly) { poly([b.x - 2, by - 5, b.x + 3, by - 5, b.x, by - 10 - fl], '#b8bcc8'); }
      }
    }
  }));

  /* ---- foam pit discovery-only ---- */
  P.push({ id: 'fountain', opp: 'fountain', ground: true, x: 1000, y: 640, dx: 1000, dy: 640, dr: 60, hit() { return null; }, draw() { } });

  return P;
}

function duck(x: number, y: number, choc: boolean) {
  ell(x, y + 1, 9, 3, '#4aa8c870');
  ell(x, y - 4, 8, 6, choc ? '#ff86b0' : '#ffe066');
  circ(x + 5, y - 10, 4.5, choc ? '#ff86b0' : '#ffe066');
  poly([x + 8, y - 11, x + 13, y - 9, x + 8, y - 8], '#ff9464');
  circ(x + 6, y - 11, 1, '#50334f');
}

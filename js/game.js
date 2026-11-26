'use strict';
/* =====================================================================
   JELLYSHOT — core loop: time, shooting, kills, witnesses, suspicion,
   lockdown, scoring, challenges, HUD, input, audio, rendering.
   ===================================================================== */

const $ = id => document.getElementById(id);
const canvas = $('world');
g = canvas.getContext('2d', { alpha: false });
const mini = $('minimap'), mg = mini.getContext('2d');
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- save / progression ---------- */
const SAVE_KEY = 'jellyshot.save.v1';
let SAVE = { xp: 0, done: [], best: 0, runs: 0, wins: 0 };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) SAVE = Object.assign(SAVE, s); } catch (e) { }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { } }
const levelOf = xp => { let l = 1; while (xp >= xpForLevel(l + 1)) l++; return l; };
const multOf = () => Math.min(3, 1 + SAVE.done.length * .08);

/* ---------- state ---------- */
const G = {
  T: 0, clock: 0, flags: {}, npcs: [], byId: {}, props: [], puddles: [], parts: [], floaters: [], marks: [], pending: [],
  stats: {}, score: 0, susp: 0, calmT: 0, lockdown: false, ended: true, started: false, paused: false, view: { x0: 0, y0: 0, x1: 0, y1: 0 },
  cam: { x: 1000, y: 560 }, zoom: 1, ammo: 'std', mag: 4, reloading: 0, breath: 1, breathLock: false, steady: 0, kick: 0, shake: 0,
  ff: false, slow: 0, hitstop: 0, phaseI: -1, eventId: 0, evKills: {}, aim: null, aimT: 0, aimKey: null, run: { done: new Set() },
  disc: new Set(), combo: 0, lastKill: -9, rifle: rifleFor(1), special: { fizz: 0, bomb: 0 }, handlerQ: [], handlerT: 0, quietT: 0, cues: new Set()
};

function newMission() {
  const lvl = levelOf(SAVE.xp);
  Object.assign(G, {
    T: 0, clock: 0, flags: {}, puddles: [], parts: [], floaters: [], marks: [], pending: [], score: 0, susp: 0, calmT: 0, lockdown: false,
    ended: false, started: true, paused: false, cam: { x: 1000, y: 560 }, zoom: .8, ammo: 'std', reloading: 0, breath: 1, breathLock: false,
    steady: 0, kick: 0, shake: 0, ff: false, slow: 0, hitstop: 0, phaseI: -1, eventId: 0, evKills: {}, aim: null, aimT: 0, aimKey: null,
    run: { done: new Set() }, disc: new Set(), combo: 0, lastKill: -9, rifle: rifleFor(lvl), handlerQ: [], handlerT: 0, quietT: 0, cues: new Set(), shots: 0, hits: 0,
    stats: { kills: [], found: 0, ducks: 0, gnomes: 0, concealed: 0, heads: 0, accidents: 0, collateral: 0, guards: 0, escaped: 0, fizzDunk: false }
  });
  G.mag = G.rifle.mag; G.special = { fizz: G.rifle.fizz, bomb: G.rifle.bomb };
  G.props = makeProps();
  G.npcs = buildCast();
  G.byId = {}; for (const n of G.npcs) G.byId[n.id] = n;
  for (const n of G.npcs) placeAtStart(n);
  setZoom(.8);
  $('feed').innerHTML = '';
  HANDLER.intro.forEach(l => handler(l));
  hud(); updateAmmoUI();
}

/* ---------- small world helpers used by props/NPCs ---------- */
function npcsIn(x, y, rx, ry) { return G.npcs.filter(n => n.alive && !n.dying && !n.inBalloon && inEll(n.x, n.y, { x, y, rx, ry })); }
function startle(x, y, r, line) {
  let said = false;
  for (const n of G.npcs) if (n.alive && !n.dying && dist(n.x, n.y, x, y) < r) { n.startled = .35; if (line && !said && dist(n.x, n.y, x, y) < r * .8) { say(n, line, 2.4); said = true; } }
}
function crowdSay(x, y, r, pool, count) {
  const list = G.npcs.filter(n => n.alive && !n.dying && dist(n.x, n.y, x, y) < r).sort(() => Math.random() - .5).slice(0, count);
  for (const n of list) { say(n, pick(LINES[pool]), 2.6); n.startled = .3; if (n.kind !== 'target' || !n.react) react(n, 'look', { time: 2.2 }); }
}
function fallIn(n, cause, delay) { if (!n.alive || n.dying) return; n.react = null; n.dying = .55 + delay; n.fallCause = cause; n.sink = 0; say(n, pick(['WHOA!', 'Eep!', 'Not the pond!', 'Glub!']), 1.4); }
function beeChase(n) { react(n, 'bees', { time: 99 }); say(n, pick(LINES.bees), 1.6); }
function shake(v) { if (!REDUCE) G.shake = Math.max(G.shake, v); }

function accident(list, cause) {
  const ev = ++G.eventId;
  for (const n of list) killNPC(n, { cause, accident: true, ev });
  const tk = (G.evKills[ev] || []).filter(id => G.byId[id].kind === 'target');
  if (cause === 'cake' && tk.length) award('cake');
  if (cause === 'cake' && tk.length === 3) award('cake3');
  if (cause === 'fireworks' && tk.length === 3) award('fireworks');
  if (cause === 'gumball' && tk.length) award('gumball');
  if (cause === 'maypole' && tk.includes('baroness')) award('maypole');
  if (cause === 'oven' && tk.includes('judge')) award('oven');
  const n = (G.evKills[ev] || []).length;
  if (n >= 2) { toast(`${n}× ACCIDENT!`, cause === 'cake' ? 'Let them eat cake' : 'Tragic. Truly.'); addScore((n - 1) * 250, null); }
  if (tk.length) handler(pick(HANDLER.accident));
}

/* ---------- the pop ---------- */
function killNPC(n, info = {}) {
  if (!n.alive) return;
  const lift = n.inBalloon ? (G.props.find(p => p.id === 'balloon')?.h || 0) : 0;
  n.alive = false; n.dying = 0; n.kb = null; n.inBalloon = false;
  const wasMourning = n.react?.type === 'mourn' && G.T - (n.react.at ?? G.T) > .5 ? n.react.who : null;
  n.react = null;
  const wAt = waterAt(n.x, n.y), bAt = bushAt(n.x, n.y);
  const concealed = !!(info.concealed || (wAt && !onDock(n.x, n.y)) || bAt || (wAt && info.cause === 'dock'));
  const where = wAt ? 'water' : bAt ? 'bush' : null;
  const r = n.r * 1.05;
  const p = {
    x: n.x, y: n.y, c: n.col, r, angle: rand(-.4, .4), age: 0, victim: n.id, t: G.T, concealed, where, accident: !!info.accident, found: false, seenBy: new Set(), hat: n.hat,
    eyes: true, drops: Array.from({ length: 9 }, () => ({ x: rand(-r * 2, r * 2), y: rand(-r * 1.1, r * 1.1), r: rand(1.5, 4.5) }))
  };
  G.puddles.push(p);
  const by = n.y - lift - n.r * .5;
  if (where === 'water') { splashAt(n.x, n.y); splashAt(n.x + 8, n.y - 3); }
  else { blobs(n.x, by, n.col, 26 + (n.kind === 'target' ? 20 : 0)); }
  sfx(n.kind === 'target' ? 'popBig' : 'pop');
  hitstop(n.kind === 'target' ? .07 : .035);
  shake(n.kind === 'target' ? 7 : 3);

  // ---------- scoring ----------
  const T = n.kind === 'target', parts = [];
  let pts = T ? 1000 : n.kind === 'guard' ? 150 : 25;
  parts.push(T ? 'TARGET' : n.kind === 'guard' ? 'GUARD' : 'COLLATERAL');
  if (info.head) { pts += T ? 300 : 50; parts.push('HEADSHOT'); G.stats.heads++; }
  if (info.moving) { pts += T ? 150 : 25; parts.push('MOVING'); }
  if (info.accident) { pts += T ? 600 : 100; parts.push('ACCIDENT'); G.stats.accidents++; }
  if (concealed) { pts += T ? 300 : 50; parts.push('CONCEALED'); G.stats.concealed++; }
  if (G.clock - G.lastKill < 2.5) G.combo++; else G.combo = 1;
  G.lastKill = G.clock;
  if (G.combo > 1) { pts += (G.combo - 1) * 100; parts.push(`COMBO ×${G.combo}`); }
  addScore(pts, null);
  floater(n.x, by - 22, `+${pts}`, T ? '#ffe066' : '#fff7cb', T ? 1.5 : 1);
  feed(`${T ? '◆ ' : ''}${n.name}`, parts.join(' · '), pts, T);
  G.stats.kills.push({ id: n.id, kind: n.kind, cause: info.cause || 'shot', accident: !!info.accident, head: !!info.head, concealed, t: G.T });
  if (info.ev) (G.evKills[info.ev] ||= []).push(n.id);
  if (!T && n.kind !== 'guard') G.stats.collateral++;
  if (n.kind === 'guard') G.stats.guards++;

  // ---------- consequences ----------
  if (T) {
    G.slow = REDUCE ? 0 : .55;
    toast(`TARGET POPPED`, n.name.toUpperCase());
    if (!info.accident) handler(pick(HANDLER.pop));
    if (info.cause === 'bees') { award('bees'); if (G.flags.meetBench && G.T >= 220) award('benchbees'); }
    if (info.cause === 'dock' && n.id === 'mayor') award('dock');
    if (info.cause === 'balloon' && n.id === 'baroness') award('balloon');
    const left = ['mayor', 'baroness', 'judge'].filter(id => G.byId[id].alive);
    if (!left.length) {
      setTimeout(() => handler(HANDLER.allDown), 900);
      $('extract').hidden = false;
      const tk = G.stats.kills.filter(k => k.kind === 'target');
      if (tk.every(k => k.accident)) award('accidents');
      if (tk.every(k => k.head)) award('heads');
      if (G.T < 120) award('speed');
    }
  }
  if (n.id === 'dmitri' && G.flags.proposing) { award('coldfeet'); G.flags.proposing = false; }
  if (n.id === 'granny') { award('client'); setTimeout(() => handler(HANDLER.client), 600); }
  if (wasMourning && (G.byId[wasMourning]?.partner === n.id || n.partner === wasMourning)) award('widow');
  if (G.stats.collateral === 12) handler(HANDLER.collateral);
  if (G.stats.concealed >= 5) award('concealed');
  if (G.npcs.filter(m => m.kind === 'guard').every(m => !m.alive && !m.gone)) award('guards');
  if (G.npcs.every(m => !m.alive && !m.gone && !m.escaped)) award('everyone');
  // people who loved them and didn't see it go looking
  for (const m of G.npcs) if (m.alive && m.kind !== 'target' && loves(m, n) && !p.seenBy.has(m.id)) { m.lostFor = n.id; }
  // immediate witnesses
  const wr = concealed ? 70 : 170;
  for (const m of G.npcs) if (m.alive && !m.dying && !m.inBalloon && dist(m.x, m.y, n.x, n.y) < wr) notice(m, p, true);
  hud();
}
function loves(m, n) { return m.partner === n.id || n.partner === m.id || m.parent === n.id || n.parent === m.id || (n.protects === m.id) || (m.protects === n.id); }

/* ---------- witnesses & suspicion ---------- */
function notice(m, p, live) {
  if (p.seenBy.has(m.id)) return;
  p.seenBy.add(m.id);
  const victim = G.byId[p.victim];
  G.calmT = 6;
  // each puddle can only stir up so much panic: accidents barely any
  const cap = p.accident ? 6 : 45;
  const bump = v => { const add = Math.min(v, cap - (p.susp || 0)); if (add > 0) { p.susp = (p.susp || 0) + add; bumpSusp(add); } };
  if (loves(m, victim) && m.kind !== 'guard' && m.kind !== 'target') {
    react(m, 'mourn', { x: p.x, y: p.y, time: 28, who: victim.id }); say(m, m.kind === 'kid' ? pick(LINES.mournKid) : `${victim.name.split(' ').pop().toUpperCase()}!!`, 2.6);
    bump(p.accident ? 4 : 9); markFound(p); return;
  }
  if (p.accident) { bump(m.kind === 'guard' ? 3 : 1); if (!m.react) react(m, 'look', { time: 2.6 }); if (Math.random() < .6) say(m, pick(LINES.accidentSeen), 2.4); return; }
  markFound(p);
  if (m.kind === 'guard') { bump(live ? 30 : 22); react(m, 'guard', { x: p.x, y: p.y, time: 14, p }); say(m, pick(LINES.guardAlert), 2.4); }
  else if (m.kind === 'target') { bump(live ? 34 : 26); react(m, 'panic', { x: p.x, y: p.y, time: 3 }); say(m, pick(LINES.flee), 2.2); }
  else { bump(live ? 14 : 10); react(m, 'panic', { x: p.x, y: p.y, time: 3.4 }); say(m, pick(LINES.panic), 2.2); }
}
function markFound(p) {
  if (p.found) return;
  p.found = true;
  if (!p.accident) { G.stats.found++; if (G.stats.found === 1) handler(HANDLER.ghostLost); }
}
function bumpSusp(v) {
  if (G.lockdown) return;
  G.susp = Math.min(100, G.susp + v);
  G.calmT = 6;
  if (G.susp >= 60 && !G.cues.has('susp')) { G.cues.add('susp'); handler(HANDLER.suspicious); }
  if (G.susp >= 100) triggerLockdown();
}
function triggerLockdown() {
  if (G.lockdown) return;
  G.lockdown = true; G.susp = 100;
  toast('LOCKDOWN!', 'The targets are making a run for it'); handler(HANDLER.lockdown);
  sfx('alarm'); music.setMood('tense');
  for (const n of G.npcs) {
    if (!n.alive || n.dying) continue;
    if (n.kind === 'target') {
      const bal = G.props.find(p => p.id === 'balloon');
      if (n.id === 'baroness' && bal.state === 'landed') react(n, 'flee', { g: [1665, 280], balloon: true });
      else if (n.inBalloon) { }
      else react(n, 'flee', { g: [1000, 1296] });
    } else if (n.kind === 'guard') { if (!n.protects) react(n, 'investigate', { x: 1000, y: 1100, time: 20 }); }
    else if (Math.random() < .45) react(n, 'flee', { g: [1000 + rand(-40, 40), 1296] });
    else react(n, 'cower', { time: 999 });
  }
}
function escapeTarget(n) {
  if (!n.alive) return;
  n.alive = false; n.escaped = true; n.react = null;
  G.stats.escaped++;
  toast('TARGET ESCAPED', n.name.toUpperCase()); handler(HANDLER.escape); sfx('fail');
  feed(`✕ ${n.name}`, 'ESCAPED', 0, true);
  checkEnd();
}
function leave(n) { n.alive = false; n.gone = true; n.react = null; }

/* ---------- discoveries, challenges, handler ---------- */
function discover(id) {
  if (!id || G.disc.has(id)) return;
  G.disc.add(id);
  const o = OPPS[id];
  toast('OPPORTUNITY', o.name.toUpperCase());
  handler(o.hint, true);
  sfx('ding');
  if (G.disc.size === Object.keys(OPPS).length) award('opps');
}
function award(id) {
  if (G.run.done.has(id) || G.ended) return;
  G.run.done.add(id);
  const c = CHALLENGES.find(c => c.id === id); if (!c) return;
  const fresh = !SAVE.done.includes(id);
  if (fresh) { SAVE.done.push(id); persist(); }
  addScore(500, null);
  setTimeout(() => { toast(fresh ? 'CHALLENGE COMPLETE' : 'CHALLENGE', c.name.toUpperCase()); sfx('chime'); }, 700);
}
function handler(text, urgent) {
  if (urgent) G.handlerQ.unshift(text); else G.handlerQ.push(text);
  if (G.handlerQ.length > 5) G.handlerQ.length = 5;
}
function tickHandler(dt) {
  G.handlerT -= dt;
  const el = $('handler');
  if (G.handlerT <= 0) {
    if (G.handlerQ.length) {
      const t = G.handlerQ.shift();
      $('handlerText').textContent = t;
      el.classList.add('show');
      G.handlerT = clamp(t.length * .055, 3.2, 7);
      G.quietT = 0;
    } else el.classList.remove('show');
  }
}

/* ---------- score, feed, toasts, particles ---------- */
function addScore(v) { G.score += v; hud(); }
let toastTimer = 0;
function toast(a, b = '') {
  $('toastA').textContent = a; $('toastB').textContent = b;
  const t = $('toast'); t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  toastTimer = 2.1;
}
function feed(name, detail, pts, big) {
  const li = document.createElement('div');
  li.className = 'feedrow' + (big ? ' big' : '');
  li.innerHTML = `<b></b><span></span><i></i>`;
  li.children[0].textContent = name; li.children[1].textContent = detail; li.children[2].textContent = pts ? `+${pts}` : '';
  const f = $('feed'); f.prepend(li);
  while (f.children.length > 4) f.lastChild.remove();
  setTimeout(() => li.classList.add('fade'), 4200);
  setTimeout(() => li.remove(), 5000);
}
function floater(x, y, t, c = '#fff7cb', s = 1) { G.floaters.push({ x, y, t, c, s, life: 1.2 }); }
function blobs(x, y, col, n) {
  const c = PAL[col];
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(40, 190); G.parts.push({ type: 'blob', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, r: rand(2, 6), c: c[i % 2 ? 0 : 2], hl: c[1], life: rand(.5, 1.1), g: 300 }); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; G.parts.push({ type: 'ring', x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 70, r: 4, c: c[0], life: .3, g: 0 }); }
}
function spray(x, y, cols, n, k = 1) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(50, 260) * k; G.parts.push({ type: 'blob', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .7 - 120 * k, r: rand(2, 7), c: pick(cols), hl: '#ffffffaa', life: rand(.6, 1.4), g: 340 }); } }
function puff(x, y, c) { G.parts.push({ type: 'puff', x, y, vx: rand(-10, 10), vy: rand(-40, -20), r: rand(5, 10), c, life: rand(.8, 1.4), g: -10 }); }
function spark(x, y) { G.parts.push({ type: 'spark', x, y, vx: rand(-60, 60), vy: rand(-90, -20), r: 2, c: pick(['#ffe066', '#fff', '#ff9464']), life: rand(.2, .5), g: 200 }); }
function splashAt(x, y) { for (let i = 0; i < 10; i++) G.parts.push({ type: 'blob', x, y, vx: rand(-60, 60), vy: rand(-170, -60), r: rand(2, 4), c: '#c1f6ff', hl: '#fff', life: rand(.4, .8), g: 420 }); G.parts.push({ type: 'ripple', x, y, vx: 0, vy: 0, r: 4, c: '#fff', life: 1, g: 0 }); }
function hitstop(t) { if (!REDUCE) G.hitstop = Math.max(G.hitstop, t); }

/* ---------- shooting ---------- */
function scale() { return G.zoom * baseScale; }
function sway() {
  const t = G.clock, amp = (5.5 + G.kick * 16) * (1 - G.steady * .86) * (G.breathLock ? 1.9 : 1) * (G.lockdown ? 1.15 : 1);
  return [(Math.sin(t * .83) * .6 + Math.sin(t * 1.97 + 1.3) * .4) * amp, (Math.sin(t * 1.13 + .5) * .6 + Math.sin(t * 2.41) * .4) * amp * .8];
}
function aimPoint() { const [sx, sy] = sway(), S = scale(); return [G.cam.x + sx / S, G.cam.y + sy / S]; }

function fire() {
  if (G.ended || !G.started || G.paused) return;
  initAudio();
  if (G.reloading > 0) { sfx('click'); return; }
  if (G.mag <= 0) { startReload(); return; }
  if (G.clock - G.lastShot < .3) return;
  let ammo = G.ammo;
  if (ammo !== 'std' && G.special[ammo] <= 0) ammo = G.ammo = 'std';
  G.mag--; if (ammo !== 'std') { G.special[ammo]--; if (G.special[ammo] <= 0) G.ammo = 'std'; }
  G.lastShot = G.clock; G.shots++;
  const [x, y] = aimPoint();
  G.pending.push({ x, y, t: .085, ammo });
  G.kick = 1; G.recoil = 9; G.flash = 1;
  sfx(ammo === 'bomb' ? 'shotBig' : 'shot');
  $('hint').classList.add('hidden');
  if (G.mag === 0) setTimeout(startReload, 380);
  updateAmmoUI();
}
function startReload() {
  if (G.reloading > 0 || G.mag === G.rifle.mag || G.ended) return;
  G.reloading = G.rifle.reload; sfx('reload'); updateAmmoUI();
}

function npcAt(x, y) {
  let best = null;
  for (const n of G.npcs) {
    if (!n.alive || n.dying) continue;
    const lift = n.inBalloon ? G.props.find(p => p.id === 'balloon').h + 6 : 0;
    const hop = (n.hopNow ?? 0);
    const bx = n.x, by = n.y - (n.inBalloon ? lift : hop) - n.r * .45;
    const dx = (x - bx) / (n.r * 1.02), dy = (y - by) / (n.r * .98);
    if (dx * dx + dy * dy < 1 && (!best || n.y > best.n.y)) best = { n, head: y < by - n.r * .32 };
  }
  return best;
}
function itemAt(x, y) {
  for (const n of G.npcs) {
    if (!n.alive || n.dying) continue;
    if (n.hasCone) { const [cx, cy] = conePos(n); if (dist(x, y, cx, cy) < 6.5) return { kind: 'cone', n }; }
    if (n.id === 'bill' && !G.flags.banjoBroken) { const [cx, cy] = itemPos(n); if (dist(x, y, cx, cy + 2) < 8.5) return { kind: 'banjo', n }; }
    if (n.item === 'bunch') for (let i = 0; i < n.balloons; i++) { const [bx, by] = bunchPos(n, i); if (dist(x, y, bx, by) < 8.5) return { kind: 'bunch', n, i }; }
    if (n.id === 'finn' && n.acting === 'fish' && !G.flags.fishCaught && dist(x, y, BOBBER[0], BOBBER[1]) < 8) return { kind: 'bobber', n };
  }
  return null;
}
function propAt(x, y, precise) {
  for (const p of G.props) { const h = p.hit?.(x, y); if (h && !!h.precise === precise) return { p, h }; }
  return null;
}
function targetAt(x, y) {
  return propAt(x, y, true) && { what: 'prop', ...propAt(x, y, true) } || (itemAt(x, y) && { what: 'item', ...itemAt(x, y) }) || (npcAt(x, y) && { what: 'npc', ...npcAt(x, y) }) || (propAt(x, y, false) && { what: 'prop', ...propAt(x, y, false) }) || null;
}

function impact(b) {
  G.marks.push({ x: b.x, y: b.y, life: 2.5 });
  const hit = targetAt(b.x, b.y);
  if (b.ammo === 'bomb') return sugarBomb(b.x, b.y, hit);
  if (hit) G.hits++;
  if (hit?.what === 'prop') {
    const r = hit.p.shot(hit.h, b.ammo);
    if (r === 'lure') lure(b.x, b.y);
    if (b.ammo === 'fizz') fizz(b.x, b.y, null);
    return;
  }
  if (hit?.what === 'item') { itemShot(hit); if (b.ammo === 'fizz') fizz(b.x, b.y, null); return; }
  if (hit?.what === 'npc') {
    if (b.ammo === 'fizz') return fizz(b.x, b.y, hit.n);
    killNPC(hit.n, { head: hit.head, moving: hit.n.moving > 5, cause: 'shot' });
    return;
  }
  // ground / water
  if (waterAt(b.x, b.y)) { splashAt(b.x, b.y); sfx('plip'); } else { for (let i = 0; i < 4; i++) puff(b.x, b.y, '#fff3df'); sfx('thunk', .4); }
  if (b.ammo === 'fizz') fizz(b.x, b.y, null); else lure(b.x, b.y);
}
function lure(x, y) {
  let guardNear = false;
  for (const n of G.npcs) {
    if (!n.alive || n.dying || n.inBalloon) continue;
    const d = dist(n.x, n.y, x, y);
    if (d < 120) {
      n.startled = .3;
      if (n.kind === 'target') { if (d < 70) { bumpSusp(7); say(n, pick(['Was that a BULLET?!', 'Did you hear that?', 'Guards?!']), 2.2); } }
      else if (!n.react || n.react.type === 'investigate' || n.react.type === 'look') { react(n, 'investigate', { x, y, time: 7 }); if (Math.random() < .5) say(n, pick(LINES.investigate), 2); }
      if (n.kind === 'guard') guardNear = true;
    }
  }
  if (guardNear) bumpSusp(3);
}
function fizz(x, y, direct) {
  sfx('fizz'); spray(x, y, ['#c1f6ff', '#ffffff', '#ffd0e5'], 30, .8);
  for (const n of G.npcs) {
    if (!n.alive || n.dying || n.inBalloon) continue;
    const d = dist(n.x, n.y, x, y);
    if (n === direct || d < 64) {
      let dx = n.x - x, dy = n.y - y, m = Math.hypot(dx, dy);
      if (m < 2) { const a = rand(0, TAU); dx = Math.cos(a); dy = Math.sin(a); m = 1; }
      const pow = n === direct ? 420 : 330 * (1 - d / 64) + 120;
      n.kb = { vx: dx / m * pow, vy: dy / m * pow * .8, t: .4 }; n.kbx = x; n.kby = y; n.react = null; n.startled = .4;
      if (Math.random() < .6) say(n, pick(LINES.dazed), 1.6);
    }
  }
  bumpSusp(4);
}
function sugarBomb(x, y, hit) {
  shake(14); sfx('boom'); spray(x, y, ['#ffe066', '#ff5c9e', '#ffffff', '#ffb84c'], 60, 1.2);
  for (const p of G.props) { if (!p.hit) continue; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; const h = p.hit(x + Math.cos(a) * 30, y + Math.sin(a) * 20) || p.hit(x, y); if (h) { p.shot(h, 'bomb'); break; } } }
  const vic = npcsIn(x, y, 66, 40);
  const ev = ++G.eventId;
  for (const n of vic) killNPC(n, { cause: 'bomb', ev });
  if (vic.length >= 4) award('bomb');
  if (vic.length >= 2) toast(`${vic.length}× SUGAR BOMB`, 'subtle.');
  bumpSusp(12);
  lure(x, y);
}
function itemShot(h) {
  const n = h.n;
  if (h.kind === 'cone') {
    n.hasCone = false; sfx('splat', .4); spray(...conePos(n), ['#ffd0e5', '#fff5b0', '#e7b06a'], 14, .5);
    react(n, 'sad', { time: 7 }); say(n, pick(LINES.sad), 2.4);
    const par = G.byId[n.parent];
    if (par?.alive && !par.react) { react(par, 'argue', { x: 800, y: 832, time: 9 }); say(par, pick(LINES.argue), 2.6); const sam = G.byId.sam; if (sam?.alive) setTimeout(() => { if (sam.alive) say(sam, pick(LINES.argueBack), 2.6); }, 1800); }
    discover('icecream'); award('scoop'); if (!G.cues.has('kid')) { G.cues.add('kid'); handler(HANDLER.kid); }
    floater(n.x, n.y - 30, 'SCOOPED!', '#ffd0e5');
  } else if (h.kind === 'banjo') {
    G.flags.banjoBroken = true; sfx('twang'); say(n, pick(LINES.sadBusker), 3); discover('banjo'); award('banjo'); handler(HANDLER.banjo);
    crowdSay(n.x, n.y, 160, 'boo', 3); floater(n.x, n.y - 30, 'TWANG!', '#ffe066');
  } else if (h.kind === 'bunch') {
    const [bx, by] = bunchPos(n, h.i);
    n.balloons--; sfx('pop', .5);
    G.parts.push({ type: 'balloon', x: bx, y: by, vx: rand(-10, 10), vy: -50, r: 7, c: PAL[PAL_KEYS[h.i]][0], life: 5, g: -6 });
    discover('bunch'); react(n, 'chase', { x: bx + rand(-30, 30), y: n.y - 20, time: 2 }); say(n, pick(LINES.vendorChase), 2);
    if (n.balloons <= 0) { award('balloons'); floater(n.x, n.y - 40, 'UP, UP & AWAY', '#c1f6ff'); }
    for (const k of G.npcs) if (k.kind === 'kid' && k.alive && dist(k.x, k.y, n.x, n.y) < 140) { react(k, 'sad', { time: 4 }); say(k, 'My balloon!!', 2); }
  } else if (h.kind === 'bobber') {
    G.flags.fishCaught = true; sfx('reel'); splashAt(...BOBBER); say(n, pick(LINES.bobber), 3); discover('bobber'); award('fish');
    floater(n.x, n.y - 30, 'A BOOT!', '#c1f6ff');
  }
  lure(n.x, n.y + 30);
}

/* ---------- timeline ---------- */
function timeline() {
  let pi = 0; for (let i = 0; i < PHASES.length; i++) if (PHASES[i].t <= G.T) pi = i;
  if (pi !== G.phaseI) {
    G.phaseI = pi;
    const ph = PHASES[pi];
    if (pi > 0) { toast(ph.name, ph.sub); sfx('fanfare'); }
    if (ph.id === 'cake' && !G.flags.cakeDown) handler(HANDLER.cake);
    if (ph.id === 'pie') { handler(HANDLER.pie); }
    if (ph.id === 'maypole') handler(HANDLER.maypole);
    if (ph.id === 'meeting') handler(G.flags.meetBench ? HANDLER.meetingAlt : HANDLER.meeting);
    if (ph.id === 'farewell') handler(HANDLER.farewell);
  }
  const cue = (k, t, fn) => { if (G.T >= t && !G.cues.has(k)) { G.cues.add(k); fn(); } };
  cue('arrivals', 18, () => { if (G.byId.mayor.alive && G.byId.baroness.alive) handler(HANDLER.arrivals); });
  cue('cakeSoon', 36, () => { if (!G.flags.cakeDown) handler(HANDLER.cakeSoon); });
  cue('pie2', 114, () => { if (G.byId.mayor.alive) handler(HANDLER.pie2); });
  cue('pie3', 128, () => { if (G.byId.baroness.alive) handler(HANDLER.pie3); });
  cue('oneMin', MISSION_LEN - 60, () => { if (!$('extract').hidden === false) handler(HANDLER.oneMin); });
  // ---- little scripted scenes that make the town feel alive ----
  const A = id => { const n = G.byId[id]; return n && n.alive && !n.react ? n : null; };
  cue('crane', 47, () => { const k = A('kranz'); if (k && !G.flags.cakeDown) say(k, 'Cake is UP! Nobody sneeze.', 3); });
  cue('mcCake', 56, () => { const m = A('sprinkles'); if (m) say(m, G.flags.cakeEarly ? 'Uh... the ceremony has MOVED to the fountain!' : 'Give it up for MAYOR WOBBLETON!', 3); });
  cue('nibbles', 118, () => { const n = A('nibbles'); if (n) say(n, '*sneaks a pie*', 2.5); });
  cue('granny1', 140, () => { const n = A('granny'); if (n) say(n, G.byId.judge.alive ? 'He’s not even CHEWING!' : 'Well. No judge. Pity.', 3); });
  cue('results', 156, () => {
    const m = A('sprinkles'), j = G.byId.judge;
    if (!m) return;
    if (j.alive) { say(m, 'And the winner is... BARNABY CRUMB!', 3.5); setTimeout(() => { const b = A('barnaby'); if (b) say(b, 'I WON?! I used store-bought!', 3); const gr = A('granny'); if (gr) say(gr, 'RIGGED! RIGGED, I SAY!', 3); }, 1600); }
    else { say(m, 'The judge is... unavailable. Everyone wins!', 3.5); setTimeout(() => { const gr = A('granny'); if (gr) say(gr, 'Heh. Heh heh heh.', 3); }, 1600); }
  });
  cue('propose', 204, () => {
    const d = A('dmitri'), t = A('dot');
    if (!d || !t || G.lockdown) return;
    G.flags.proposing = true; d.pose = 'kneel'; d.poseT = 6; react(t, 'look', { time: 6 }); t.x = d.x + 22; t.y = d.y; say(d, 'Dot... will you marry me?', 4);
    crowdSay(d.x, d.y, 120, 'watch', 3);
  });
  cue('yes', 209, () => {
    G.flags.proposing = false;
    const d = G.byId.dmitri, t = A('dot');
    if (d) d.pose = null;
    if (t && d?.alive) { say(t, 'YES!! A THOUSAND TIMES YES!', 3.5); spray(t.x, t.y - 20, ['#ff8fc1', '#ffe066', '#ffffff', '#7fd9ff'], 40, .8); crowdSay(t.x, t.y, 140, 'cheer', 4); sfx('chime', .6); }
  });
  cue('mcFire', 268, () => { const m = A('sprinkles'); if (m) say(m, G.flags.shedGone ? 'The fireworks... already happened. Early.' : 'Fireworks in thirty seconds, folks!', 3.5); });
  cue('show', 286, () => { const f = G.props.find(p => p.id === 'fireworks'); if (f.state === 'ok') f.show(); });
  // carriage departure
  if (G.T >= MISSION_LEN - 4) for (const id of ['mayor', 'judge', 'baroness']) { const n = G.byId[id]; if (n.alive && !n.inBalloon && dist(n.x, n.y, 1000, 1205) < 60) escapeTarget(n); }
  if (G.T >= MISSION_LEN) { for (const id of ['mayor', 'judge', 'baroness']) if (G.byId[id].alive) escapeTarget(G.byId[id]); endMission(); }
  // quiet tips
  G.quietT += 1 / 60;
}
function checkEnd() {
  const tg = ['mayor', 'baroness', 'judge'].map(id => G.byId[id]);
  if (tg.every(n => !n.alive)) { if (tg.some(n => n.escaped)) setTimeout(endMission, 1800); }
}

/* ---------- main update ---------- */
let last = 0, baseScale = 1, W = 0, H = 0, D = 1;
const keys = new Set();
let holdBreath = false;
function step(now) {
  let raw = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
  if (G.started && !G.paused && !G.ended) {
    let dt = raw;
    if (G.hitstop > 0) { G.hitstop -= raw; dt = 0; }
    if (G.slow > 0) { G.slow -= raw; dt *= .3; }
    const sim = dt * (G.ff ? 3 : 1);
    update(sim, raw);
  } else if (G.started && G.ended) { G.clock += raw * .3; updateParticles(raw * .3); }
  render();
  if (toastTimer > 0) { toastTimer -= raw; if (toastTimer <= 0) $('toast').classList.remove('show'); }
  requestAnimationFrame(step);
}
let scanT = 0, hudT = 0;
function update(dt, raw) {
  G.T += dt; G.clock += dt;
  timeline();
  // shots in flight
  for (const b of G.pending) { b.t -= raw; if (b.t <= 0) impact(b); }
  G.pending = G.pending.filter(b => b.t > 0);
  // reload
  if (G.reloading > 0) { G.reloading -= raw; if (G.reloading <= 0) { G.reloading = 0; G.mag = G.rifle.mag; sfx('cock'); updateAmmoUI(); } }
  // breath
  const want = (holdBreath || keys.has('ShiftLeft') || keys.has('ShiftRight')) && !G.breathLock;
  if (want && G.breath > 0) { G.steady = Math.min(1, G.steady + raw * 5); G.breath -= raw * .3 / G.rifle.breath; if (G.breath <= 0) { G.breath = 0; G.breathLock = true; sfx('gasp'); } }
  else { G.steady = Math.max(0, G.steady - raw * 4); G.breath = Math.min(1, G.breath + raw * .2); if (G.breathLock && G.breath > .4) G.breathLock = false; }
  G.kick = Math.max(0, G.kick - raw * 2.6);
  G.recoil = Math.max(0, (G.recoil || 0) - raw * 50);
  G.flash = Math.max(0, (G.flash || 0) - raw * 5);
  G.shake = Math.max(0, G.shake - raw * 30);
  // keyboard pan
  const sp = 320 * raw / scale();
  if (keys.has('ArrowLeft') || keys.has('KeyA')) G.cam.x -= sp;
  if (keys.has('ArrowRight') || keys.has('KeyD')) G.cam.x += sp;
  if (keys.has('ArrowUp') || keys.has('KeyW')) G.cam.y -= sp;
  if (keys.has('ArrowDown') || keys.has('KeyS')) G.cam.y += sp;
  bound();
  // world
  for (const p of G.props) p.update?.(dt);
  for (const n of G.npcs) { if (n.startled > 0) n.startled -= dt; updateNPC(n, dt); }
  separate(dt);
  for (const n of G.npcs) if (n.alive && n.lostFor && !n.react && n.kind !== 'guard') { const v = G.byId[n.lostFor]; n.lostFor = null; if (!v.escaped) { react(n, 'lost', { x: v.x, y: v.y, time: 16 }); say(n, `${v.name.split(' ').pop()}? Where'd you go?`, 2.6); } }
  for (const p of G.puddles) p.age += dt;
  // witness scan (4×/sec)
  scanT -= dt;
  if (scanT <= 0) {
    scanT = .25;
    for (const n of G.npcs) {
      if (!n.alive || n.dying || n.inBalloon || n.kb) continue;
      const range = n.kind === 'guard' ? 150 : 115;
      for (const p of G.puddles) if (!p.concealed && !p.secured && p.age > .3 && !p.seenBy.has(n.id) && Math.abs(n.x - p.x) < range && Math.abs(n.y - p.y) < range && dist(n.x, n.y, p.x, p.y) < range) notice(n, p, false);
    }
  }
  // suspicion cools
  G.calmT -= dt;
  if (!G.lockdown && G.calmT <= 0) G.susp = Math.max(0, G.susp - dt * 2.2);
  updateParticles(dt);
  tickHandler(raw);
  if (G.quietT > 45 && !G.handlerQ.length) { G.quietT = 0; handler(pick(HANDLER.quiet)); }
  // aim / discovery
  const [ax, ay] = aimPoint();
  const t = targetAt(ax, ay);
  G.aim = t;
  let key = t ? (t.what === 'npc' ? 'n:' + t.n.id : t.what === 'item' ? 'i:' + t.kind : 'p:' + t.p.id) : null;
  if (!key) for (const p of G.props) if (p.opp && !G.disc.has(p.opp) && dist(ax, ay, p.dx, p.dy) < p.dr) { key = 'd:' + p.opp; break; }
  if (key !== G.aimKey) { G.aimKey = key; G.aimT = 0; } else G.aimT += raw;
  if (key === 'n:lars' && G.aimT > 2.2 && !G.cues.has('lars')) { G.cues.add('lars'); const l = G.byId.lars; say(l, '...I see you.', 3); setTimeout(() => { if (l.alive) say(l, '*waves*', 2); }, 2600); }
  if (key?.startsWith('n:') && G.aim?.n?.kind === 'target' && !G.cues.has('firstTarget')) { G.cues.add('firstTarget'); handler('That’s one of them. Their full schedules are in the intel menu (☰). Patience pays.'); }
  if (G.aimT > .45 && key) {
    if (key.startsWith('p:')) discover(t.p.opp); else if (key.startsWith('d:')) discover(key.slice(2));
    else if (key === 'i:cone') discover('icecream'); else if (key === 'i:banjo') discover('banjo'); else if (key === 'i:bunch') discover('bunch'); else if (key === 'i:bobber') discover('bobber');
  }
  hudT -= raw; if (hudT <= 0) { hudT = .1; hudTick(); }
}
function separate(dt) {
  const a = G.npcs;
  for (let i = 0; i < a.length; i++) {
    const n = a[i]; if (!n.alive || n.dying || n.inBalloon || n.kb) continue;
    for (let j = i + 1; j < a.length; j++) {
      const m = a[j]; if (!m.alive || m.dying || m.inBalloon || m.kb) continue;
      const dx = m.x - n.x, dy = (m.y - n.y) * 1.6, d = Math.hypot(dx, dy), min = (n.r + m.r) * .82;
      if (d > 0 && d < min) { const push = (min - d) * .5 * Math.min(1, dt * 12); n.x -= dx / d * push; n.y -= dy / d * push * .6; m.x += dx / d * push; m.y += dy / d * push * .6; }
    }
  }
}
function updateParticles(dt) {
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; if (p.type === 'puff') p.r += dt * 8; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
  for (const f of G.floaters) { f.life -= dt; f.y -= 26 * dt; }
  G.floaters = G.floaters.filter(f => f.life > 0);
  for (const m of G.marks) m.life -= dt;
  G.marks = G.marks.filter(m => m.life > 0);
}
function bound() { G.cam.x = clamp(G.cam.x, 0, WORLD.w); G.cam.y = clamp(G.cam.y, -60, WORLD.h); }
function setZoom(z) { G.zoom = clamp(z, .5, G.rifle.maxZoom); $('zoom').textContent = G.zoom.toFixed(1) + '×'; }

/* ---------- rendering ---------- */
function scopeGeom() { const R = Math.min(W * .475, H * .4); return { cx: W / 2, cy: H * (W < H ? .47 : .5), R }; }
function render() {
  if (!W || !H) return;
  g.setTransform(D, 0, 0, D, 0, 0);
  g.fillStyle = '#1b1228'; g.fillRect(0, 0, W, H);
  if (!G.started) return;
  const { cx, cy, R } = scopeGeom(), S = scale();
  const [sx, sy] = sway();
  const shx = G.shake ? rand(-G.shake, G.shake) : 0, shy = G.shake ? rand(-G.shake, G.shake) : 0;
  const camX = G.cam.x + sx / S, camY = G.cam.y + sy / S;
  G.view = { x0: camX - R / S - 40, x1: camX + R / S + 40, y0: camY - R / S - 40, y1: camY + R / S + 140 };
  g.save();
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  g.translate(cx + shx, cy + shy - (G.recoil || 0) * .5);
  g.scale(S, S);
  g.translate(-camX, -camY);
  drawGround();
  // sorted sprites
  const V = G.view, inV = (x, y) => x > V.x0 - 80 && x < V.x1 + 80 && y > V.y0 - 40 && y < V.y1 + 140;
  const list = [];
  for (const d of DECOR.sorted) list.push(d);
  for (const p of G.props) if (!p.ground) list.push(p);
  for (const n of G.npcs) if (n.alive && !n.inBalloon && inV(n.x, n.y)) list.push({ y: n.y, npc: n });
  list.sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
  for (const o of list) { if (o.npc) drawNPC(o.npc); else o.draw(); }
  // particles
  for (const p of G.parts) {
    g.globalAlpha = clamp(p.life * 2.5, 0, 1);
    if (p.type === 'blob') { circ(p.x, p.y, p.r, p.c); circ(p.x - p.r * .3, p.y - p.r * .3, p.r * .3, p.hl || '#fff'); }
    else if (p.type === 'puff') { circ(p.x, p.y, p.r, p.c); }
    else if (p.type === 'spark') { circ(p.x, p.y, p.r, p.c); }
    else if (p.type === 'ring') { circ(p.x, p.y, p.r * p.life * 3, p.c); }
    else if (p.type === 'ripple') { ellS(p.x, p.y, 30 * (1 - p.life) + 4, 12 * (1 - p.life) + 2, '#ffffff', 2); }
    else if (p.type === 'balloon') { g.globalAlpha = 1; ln(p.x, p.y + 8, p.x + Math.sin(p.life * 4) * 3, p.y + 22, '#ffffff99', 1); ell(p.x, p.y, 7, 8.5, p.c); }
  }
  g.globalAlpha = 1;
  drawOverhead();
  for (const p of G.props) p.drawSky?.();
  // impact marks
  for (const m of G.marks) { g.globalAlpha = clamp(m.life, 0, 1) * .7; circ(m.x, m.y, 2 / S * 1.5, '#50334f'); g.globalAlpha = 1; }
  // speech bubbles & floaters at constant screen size
  for (const n of G.npcs) if (n.bubble && (n.alive) && inV(n.x, n.y)) drawBubble(n, S);
  for (const f of G.floaters) {
    g.globalAlpha = clamp(f.life * 2, 0, 1);
    const fs = 17 * f.s / S;
    g.font = `950 ${fs}px ui-rounded, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeStyle = '#813c82'; g.lineWidth = 4 / S; g.strokeText(f.t, f.x, f.y); g.fillStyle = f.c; g.fillText(f.t, f.x, f.y);
  }
  g.globalAlpha = 1;
  // lockdown tint
  if (G.lockdown) { g.fillStyle = `rgba(255,60,100,${.06 + Math.sin(G.clock * 5) * .03})`; g.fillRect(V.x0 - 100, V.y0 - 100, V.x1 - V.x0 + 200, V.y1 - V.y0 + 200); }
  g.restore();
  drawScope(cx, cy, R);
}

function drawScope(cx, cy, R) {
  // outer housing
  g.beginPath(); g.rect(0, 0, W, H); g.arc(cx, cy, R, 0, TAU); g.fillStyle = '#1b1228'; g.fill('evenodd');
  const vg = g.createRadialGradient(cx, cy, R * .6, cx, cy, R);
  vg.addColorStop(0, '#2a1c3c00'); vg.addColorStop(1, G.steady > .2 ? '#1b1228aa' : '#2a1c3c70');
  circ(cx, cy, R, vg);
  if (G.steady > 0) { const k = G.steady; const v2 = g.createRadialGradient(cx, cy, R * (1 - .25 * k), cx, cy, R); v2.addColorStop(0, '#00000000'); v2.addColorStop(1, `rgba(20,10,30,${.5 * k})`); circ(cx, cy, R, v2); }
  ringS(cx, cy, R + 4, '#120b1c', 7);
  ringS(cx, cy, R, '#e5c6e34d', 1.5);
  if (SAVE && G.rifle.golden) ringS(cx, cy, R + 1, '#ffd36baa', 2.5);
  // reticle colour by what is under it
  const a = G.aim;
  let ink = '#39274399';
  if (a?.what === 'npc') ink = a.n.kind === 'target' ? '#ff2d63' : a.n.kind === 'guard' ? '#3a5bd9' : '#a2457a';
  else if (a?.what === 'prop' || a?.what === 'item') ink = '#d98a00';
  ln(cx - R + 10, cy, cx - 14, cy, ink, 1.2); ln(cx + 14, cy, cx + R - 10, cy, ink, 1.2);
  ln(cx, cy - R + 10, cx, cy - 14, ink, 1.2); ln(cx, cy + 14, cx, cy + R - 10, ink, 1.2);
  ln(cx - R + 10, cy, cx - R * .55, cy, ink, 3.5); ln(cx + R * .55, cy, cx + R - 10, cy, ink, 3.5); ln(cx, cy + R * .55, cx, cy + R - 10, ink, 3.5);
  for (let j = -4; j <= 4; j++) if (j) { const d = j * R * .12; ln(cx + d, cy - 3, cx + d, cy + 3, ink, 1); ln(cx - 3, cy + d, cx + 3, cy + d, ink, 1); }
  ringS(cx, cy, 10, ink, 1.2); circ(cx, cy, 1.8, ink);
  if (a?.what === 'npc' && a.head) ringS(cx, cy, 5, ink, 1.4);
  // breath & reload arcs
  g.beginPath(); g.arc(cx, cy, R - 8, Math.PI * .62, Math.PI * .62 + Math.PI * .26 * G.breath); g.strokeStyle = G.breathLock ? '#ff4d6d' : '#c1f6ffaa'; g.lineWidth = 4; g.lineCap = 'round'; g.stroke();
  if (G.reloading > 0) { const k = 1 - G.reloading / G.rifle.reload; g.beginPath(); g.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.strokeStyle = '#ffe066'; g.lineWidth = 3; g.stroke(); txt('RELOADING', cx, cy + 36, 10, '#ffe066'); }
  if (G.flash > 0) circ(cx, cy, R, `rgba(255,242,210,${G.flash * (REDUCE ? .06 : .18)})`);
}

/* ---------- minimap ---------- */
function drawMini() {
  const w = mini.width, h = mini.height, k = w / WORLD.w;
  mg.setTransform(1, 0, 0, 1, 0, 0);
  mg.clearRect(0, 0, w, h);
  mg.fillStyle = '#d4f0b0cc'; mg.beginPath(); mg.roundRect(0, 0, w, h, 10); mg.fill();
  mg.scale(k, k);
  mg.fillStyle = '#ffe0eacc'; mg.beginPath(); mg.ellipse(1000, 648, 298, 180, 0, 0, TAU); mg.fill();
  mg.fillStyle = '#ffd8ea'; mg.fillRect(826, 222, 348, 100);
  for (const wt of WATER) { mg.fillStyle = wt.id === 'choc' ? '#7a4630' : '#7fcde8'; mg.beginPath(); mg.ellipse(wt.x, wt.y, wt.rx, wt.ry, 0, 0, TAU); mg.fill(); }
  for (const p of G.puddles) if (p.found && !p.concealed) { mg.fillStyle = '#ff4d6d'; mg.beginPath(); mg.arc(p.x, p.y, 24, 0, TAU); mg.fill(); }
  for (const n of G.npcs) {
    if (!n.alive) continue;
    const big = n.kind === 'target';
    mg.fillStyle = big ? '#ff2d63' : n.kind === 'guard' ? '#3a4fae' : '#ffffffcc';
    mg.beginPath(); mg.arc(n.x, n.inBalloon ? 280 : n.y, big ? 34 : n.kind === 'guard' ? 18 : 12, 0, TAU); mg.fill();
    if (big) { mg.strokeStyle = '#fff'; mg.lineWidth = 8; mg.stroke(); }
  }
  const { R } = scopeGeom(), S = scale();
  mg.strokeStyle = '#50334f'; mg.lineWidth = 10; mg.beginPath(); mg.arc(G.cam.x, G.cam.y, R / S, 0, TAU); mg.stroke();
  mg.strokeStyle = '#fff'; mg.lineWidth = 4; mg.stroke();
}

/* ---------- HUD ---------- */
function fmt(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function hud() { $('score').textContent = String(G.score).padStart(5, '0'); }
function hudTick() {
  $('clock').textContent = fmt(MISSION_LEN - G.T);
  const ph = PHASES[Math.max(0, G.phaseI)], nx = PHASES[G.phaseI + 1];
  $('phase').textContent = ph.name;
  $('next').textContent = nx ? `NEXT ${fmt(nx.t - G.T)} · ${nx.name}` : 'FINAL MINUTES';
  const s = $('susp');
  s.style.setProperty('--v', (G.susp / 100).toFixed(3));
  const lvl = G.lockdown ? 'LOCKDOWN' : G.susp > 66 ? 'SUSPICIOUS' : G.susp > 30 ? 'UNEASY' : 'CALM';
  $('suspLabel').textContent = lvl; s.dataset.level = lvl.toLowerCase();
  for (const id of ['mayor', 'baroness', 'judge']) { const n = G.byId[id], el = $('t_' + id); el.className = 'pip ' + (n.alive ? 'alive' : n.escaped ? 'escaped' : 'dead'); }
  // aim tag
  const a = G.aim, tag = $('aimtag');
  if (a?.what === 'npc') {
    const n = a.n;
    tag.className = 'aimtag show ' + n.kind;
    $('aimName').textContent = n.name + (a.head ? '  ◎ HEAD' : '');
    $('aimRole').textContent = n.role;
    $('aimAct').textContent = stepLabel(n);
  } else if (a?.what === 'prop' || a?.what === 'item') {
    const id = a.what === 'prop' ? a.p.opp : ({ cone: 'icecream', banjo: 'banjo', bunch: 'bunch', bobber: 'bobber' })[a.kind];
    const o = id && OPPS[id];
    tag.className = 'aimtag show prop';
    $('aimName').textContent = o ? o.name : a.p?.id === 'ducks' ? 'Rubber Duck' : a.p?.id === 'gnomes' ? 'Gumdrop Gnome' : 'Something';
    $('aimRole').textContent = a.what === 'prop' && a.p.id === 'ducks' ? 'Collectible · ' + G.stats.ducks + '/6' : a.p?.id === 'gnomes' ? 'Collectible · ' + G.stats.gnomes + '/5' : 'OPPORTUNITY';
    $('aimAct').textContent = o && G.disc.has(id) ? o.hint : 'Hold steady to study it…';
  } else tag.className = 'aimtag';
  drawMini();
  $('ff').classList.toggle('on', G.ff);
}
function updateAmmoUI() {
  const pips = $('mag'); pips.innerHTML = '';
  for (let i = 0; i < G.rifle.mag; i++) { const s = document.createElement('i'); if (i >= G.mag) s.className = 'spent'; pips.appendChild(s); }
  const name = { std: 'GUMMY', fizz: 'FIZZ', bomb: 'BOMB' }[G.ammo];
  $('ammoName').textContent = name + (G.ammo !== 'std' ? ` ×${G.special[G.ammo]}` : '');
  $('ammo').dataset.type = G.ammo;
  $('ammo').disabled = !G.rifle.fizz && !G.rifle.bomb;
}
function cycleAmmo() {
  const opts = ['std']; if (G.special.fizz > 0) opts.push('fizz'); if (G.special.bomb > 0) opts.push('bomb');
  G.ammo = opts[(opts.indexOf(G.ammo) + 1) % opts.length];
  sfx('click'); updateAmmoUI();
}
function cycleZoom() { const z = G.zoom; setZoom(z < .75 ? 1 : z < 1.3 ? 1.6 : z < G.rifle.maxZoom - .1 ? G.rifle.maxZoom : .55); }

/* ---------- overlays: briefing / intel / end ---------- */
function portrait(cv, id) {
  const c = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = 80 * dpr; cv.height = 80 * dpr;
  const old = g; g = c;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = mkNPC({ id, kind: 'portrait', ...({ mayor: { col: 'lime', r: 22, hat: 'tophat', sash: true }, baroness: { col: 'grape', r: 22, hat: 'tiara', item: 'fan' }, judge: { col: 'peach', r: 22, hat: 'chef' } })[id], x: 40, y: 62, acting: 'idle', face: 1 });
  const keep = G.clock; drawNPC(n); G.clock = keep;
  g = old;
}
function showBrief() {
  G.started = false; G.ended = true;
  const lvl = levelOf(SAVE.xp), lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1), into = SAVE.xp - lo;
  $('lvl').textContent = lvl; $('xpbar').style.setProperty('--v', (into / (hi - lo)).toFixed(3));
  $('xptext').textContent = `${into.toLocaleString()} / ${(hi - lo).toLocaleString()} XP to level ${lvl + 1}`;
  $('mult').textContent = multOf().toFixed(2) + '×';
  $('chcount').textContent = `${SAVE.done.length} / ${CHALLENGES.length}`;
  $('best').textContent = SAVE.best.toLocaleString();
  const rf = rifleFor(lvl);
  $('loadout').textContent = `Gummy Rifle · ${rf.mag} rounds · ${rf.maxZoom}× zoom${rf.fizz ? ` · ${rf.fizz} fizz` : ''}${rf.bomb ? ` · ${rf.bomb} bombs` : ''}`;
  const nextU = UNLOCKS.find(u => u.lvl > lvl);
  $('nextunlock').textContent = nextU ? `Level ${nextU.lvl}: ${nextU.text}` : 'Everything unlocked. You monster.';
  const tc = $('targets'); tc.innerHTML = '';
  for (const id of ['mayor', 'baroness', 'judge']) {
    const t = TARGET_INFO[id], d = document.createElement('div');
    d.className = 'tcard';
    d.innerHTML = `<canvas></canvas><div><b></b><p></p></div>`;
    d.querySelector('b').textContent = t.name; d.querySelector('p').textContent = t.dossier;
    tc.appendChild(d); portrait(d.querySelector('canvas'), id);
  }
  renderChallenges($('chlist'), new Set(SAVE.done));
  $('brief').hidden = false; $('intel').hidden = true; $('end').hidden = true;
  $('hudwrap').hidden = true;
}
function renderChallenges(el, done) {
  el.innerHTML = '';
  let grp = '';
  for (const c of CHALLENGES) {
    if (c.group !== grp) { grp = c.group; const h = document.createElement('h4'); h.textContent = grp; el.appendChild(h); }
    const d = document.createElement('div'); d.className = 'ch' + (done.has(c.id) ? ' done' : '') + (G.run.done.has(c.id) ? ' now' : '');
    d.innerHTML = '<i></i><div><b></b><span></span></div>';
    d.querySelector('b').textContent = c.name; d.querySelector('span').textContent = c.desc;
    el.appendChild(d);
  }
}
function startMission() {
  initAudio();
  newMission();
  $('brief').hidden = true; $('end').hidden = true; $('intel').hidden = true; $('hudwrap').hidden = false; $('extract').hidden = true;
  $('hint').classList.remove('hidden');
  music.setMood('festive');
  canvas.focus({ preventScroll: true });
  resize();
}
function openIntel() {
  if (!G.started || G.ended) return;
  G.paused = true;
  const tl = $('intelTargets'); tl.innerHTML = '';
  for (const id of ['mayor', 'baroness', 'judge']) {
    const n = G.byId[id], t = TARGET_INFO[id], d = document.createElement('div');
    d.className = 'itarget ' + (n.alive ? '' : n.escaped ? 'escaped' : 'dead');
    const status = n.alive ? stepLabel(n) : n.escaped ? 'ESCAPED' : 'POPPED';
    d.innerHTML = '<canvas></canvas><div><b></b><em></em><ol></ol></div><button class="locate">LOCATE</button>';
    d.querySelector('b').textContent = t.name; d.querySelector('em').textContent = status;
    const ol = d.querySelector('ol');
    t.sched.forEach((s, i) => { const li = document.createElement('li'); li.textContent = s; const ph = PHASES[i]; if (ph && G.T >= ph.t && (!PHASES[i + 1] || G.T < PHASES[i + 1].t)) li.className = 'now'; else if (PHASES[i + 1] && G.T >= PHASES[i + 1].t) li.className = 'past'; ol.appendChild(li); });
    d.querySelector('.locate').onclick = () => { if (n.alive) { G.cam.x = n.x; G.cam.y = n.inBalloon ? 200 : n.y - 10; } closeIntel(); };
    d.querySelector('.locate').hidden = !n.alive;
    tl.appendChild(d); portrait(d.querySelector('canvas'), id);
  }
  const ol = $('intelOpps'); ol.innerHTML = '';
  for (const [id, o] of Object.entries(OPPS)) {
    const d = document.createElement('div'); d.className = 'opp' + (G.disc.has(id) ? ' found' : '');
    d.innerHTML = '<b></b><span></span>';
    d.querySelector('b').textContent = G.disc.has(id) ? o.name : '???';
    d.querySelector('span').textContent = G.disc.has(id) ? o.hint : 'Linger your scope on interesting things to discover this.';
    ol.appendChild(d);
  }
  renderChallenges($('intelCh'), new Set(SAVE.done));
  $('intelStats').textContent = `${fmt(MISSION_LEN - G.T)} left · ${G.stats.kills.length} popped · ${G.disc.size}/${Object.keys(OPPS).length} opportunities · ducks ${G.stats.ducks}/6 · gnomes ${G.stats.gnomes}/5`;
  $('intel').hidden = false;
}
function closeIntel() { $('intel').hidden = true; G.paused = false; last = 0; canvas.focus({ preventScroll: true }); }

function endMission() {
  if (G.ended) return;
  G.ended = true; G.paused = false;
  const tg = ['mayor', 'baroness', 'judge'].map(id => G.byId[id]);
  const success = tg.every(n => !n.alive && !n.escaped);
  const st = G.stats;
  if (success && !G.lockdown && st.found === 0) award('ghost');
  if (success && st.kills.length === 3) award('targetsOnly');
  const timeBonus = success ? Math.round((MISSION_LEN - G.T) * 15) : 0;
  const ghostBonus = success && !G.lockdown && st.found === 0 ? 2500 : 0;
  const lockPen = G.lockdown ? -1500 : 0;
  const base = Math.max(0, G.score + timeBonus + ghostBonus + lockPen);
  const final = Math.round(base * (success ? multOf() : 1));
  const xp = Math.round(final * (success ? 1 : .4));
  const before = levelOf(SAVE.xp);
  SAVE.xp += xp; SAVE.runs++; if (success) SAVE.wins++;
  const best = final > SAVE.best; if (best) SAVE.best = final;
  persist();
  const after = levelOf(SAVE.xp);
  const rating = !success ? 'CONTRACT FAILED' : ghostBonus ? 'SUGAR GHOST' : !G.lockdown ? 'PROFESSIONAL' : 'MESSY';
  $('endTitle').innerHTML = success ? 'CONTRACT<br>COMPLETE' : 'THEY<br>GOT AWAY';
  $('rating').textContent = rating;
  const rows = [
    ['Targets popped', `${tg.filter(n => !n.alive && !n.escaped).length} / 3`],
    ['Accidents', st.accidents], ['Headshots', st.heads], ['Concealed', st.concealed],
    ['Collateral jellies', st.collateral], ['Guards popped', `${st.guards} / 6`],
    ['Puddles discovered', st.found], ['Accuracy', G.shots ? Math.round(G.hits / G.shots * 100) + '%' : '—'],
    ['Challenges this run', G.run.done.size],
    ['Contract score', G.score.toLocaleString()],
    ['Time bonus', timeBonus ? '+' + timeBonus.toLocaleString() : '—'],
    ['Ghost bonus', ghostBonus ? '+' + ghostBonus.toLocaleString() : '—'],
    ['Lockdown penalty', lockPen ? lockPen.toLocaleString() : '—'],
    ['Challenge multiplier', success ? multOf().toFixed(2) + '×' : 'void (failed)']
  ];
  const tb = $('endRows'); tb.innerHTML = '';
  for (const [a, b] of rows) { const r = document.createElement('div'); r.innerHTML = '<span></span><b></b>'; r.children[0].textContent = a; r.children[1].textContent = b; tb.appendChild(r); }
  $('final').textContent = final.toLocaleString() + (best ? '  ★ NEW BEST' : '');
  $('xpgain').textContent = `+${xp.toLocaleString()} XP` + (after > before ? `  ·  RIFLE LEVEL ${after}!` : '');
  const unl = UNLOCKS.filter(u => u.lvl > before && u.lvl <= after);
  $('unlocks').textContent = unl.map(u => 'UNLOCKED: ' + u.text).join('\n');
  const done = $('endCh'); done.innerHTML = '';
  for (const id of G.run.done) { const c = CHALLENGES.find(c => c.id === id); if (!c) continue; const s = document.createElement('span'); s.textContent = '✓ ' + c.name; done.appendChild(s); }
  setTimeout(() => { $('end').hidden = false; }, 1200);
  music.setMood(success ? 'win' : 'sad');
}

/* ---------- input ---------- */
const pointers = new Map();
let gesture = null, tapStart = null;
function startGesture() {
  const p = [...pointers.values()];
  gesture = p.length === 1 ? { x: p[0].x, y: p[0].y, cx: G.cam.x, cy: G.cam.y, s: scale() }
    : p.length >= 2 ? { dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, z: G.zoom, x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, cx: G.cam.x, cy: G.cam.y, s: scale() } : null;
}
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  startGesture();
  tapStart = pointers.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType } : null;
  canvas.focus({ preventScroll: true });
});
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const p = [...pointers.values()];
  const sens = G.steady > .5 ? .55 : 1;
  if (p.length === 1) { G.cam.x = gesture.cx - (p[0].x - gesture.x) / gesture.s * sens; G.cam.y = gesture.cy - (p[0].y - gesture.y) / gesture.s * sens; }
  else {
    const x = (p[0].x + p[1].x) / 2, y = (p[0].y + p[1].y) / 2;
    setZoom(gesture.z * Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) / gesture.dist);
    G.cam.x = gesture.cx - (x - gesture.x) / gesture.s; G.cam.y = gesture.cy - (y - gesture.y) / gesture.s;
  }
  bound();
});
for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, e => {
  if (type === 'pointerup' && tapStart && tapStart.type === 'mouse' && e.button === 0 && performance.now() - tapStart.t < 260 && dist(e.clientX, e.clientY, tapStart.x, tapStart.y) < 5) fire();
  pointers.delete(e.pointerId); tapStart = null; startGesture();
});
canvas.addEventListener('lostpointercapture', e => { pointers.delete(e.pointerId); startGesture(); });
canvas.addEventListener('wheel', e => { e.preventDefault(); setZoom(G.zoom * Math.exp(-e.deltaY * .0015)); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
mini.addEventListener('pointerdown', e => {
  const r = mini.getBoundingClientRect();
  G.cam.x = (e.clientX - r.left) / r.width * WORLD.w; G.cam.y = (e.clientY - r.top) / r.height * WORLD.h; bound(); e.preventDefault();
});
window.addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'Tab' || e.code === 'KeyI') { e.preventDefault(); if (!$('intel').hidden) closeIntel(); else openIntel(); return; }
  if (G.paused || !G.started || G.ended) { if (e.code === 'Enter' && !$('brief').hidden) startMission(); return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyZ', 'ShiftLeft', 'ShiftRight', 'KeyR', 'KeyQ', 'KeyF', 'Digit1', 'Digit2', 'Digit3'].includes(e.code) && !e.target.closest?.('button')) {
    e.preventDefault(); keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'Space') fire();
    if (e.code === 'KeyZ') cycleZoom();
    if (e.code === 'KeyR') startReload();
    if (e.code === 'KeyQ') cycleAmmo();
    if (e.code === 'KeyF') G.ff = !G.ff;
    if (e.code === 'Digit1') { G.ammo = 'std'; updateAmmoUI(); }
    if (e.code === 'Digit2' && G.special.fizz) { G.ammo = 'fizz'; updateAmmoUI(); }
    if (e.code === 'Digit3' && G.special.bomb) { G.ammo = 'bomb'; updateAmmoUI(); }
  }
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); pointers.clear(); gesture = null; holdBreath = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.started && !G.ended && !G.paused) openIntel(); });

const tapBtn = (id, fn) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('pressed'); fn(); }); b.addEventListener('pointerup', () => b.classList.remove('pressed')); b.addEventListener('pointerleave', () => b.classList.remove('pressed')); b.addEventListener('click', e => e.preventDefault()); };
tapBtn('fire', fire);
tapBtn('zoom', cycleZoom);
tapBtn('ammo', cycleAmmo);
tapBtn('ff', () => { G.ff = !G.ff; hudTick(); });
tapBtn('intelBtn', openIntel);
tapBtn('reloadBtn', startReload);
const br = $('breath');
br.addEventListener('pointerdown', e => { e.preventDefault(); br.setPointerCapture(e.pointerId); holdBreath = true; br.classList.add('pressed'); });
for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) br.addEventListener(t, () => { holdBreath = false; br.classList.remove('pressed'); });
$('sound').addEventListener('click', () => { audioMuted = !audioMuted; music.mute(audioMuted); $('sound').classList.toggle('off', audioMuted); });
$('start').addEventListener('click', startMission);
$('again').addEventListener('click', startMission);
$('menu').addEventListener('click', showBrief);
$('resume').addEventListener('click', closeIntel);
$('restart').addEventListener('click', () => { $('intel').hidden = true; startMission(); });
$('abort').addEventListener('click', () => { $('intel').hidden = true; G.paused = false; for (const id of ['mayor', 'judge', 'baroness']) if (G.byId[id].alive) { G.byId[id].alive = false; G.byId[id].escaped = true; } endMission(); });
$('extract').addEventListener('click', () => endMission());
$('showCh').addEventListener('click', () => $('chwrap').classList.toggle('open'));
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tabpane').forEach(p => p.hidden = p.id !== b.dataset.tab);
}));

function resize() {
  const r = canvas.getBoundingClientRect();
  W = r.width; H = r.height; D = Math.min(devicePixelRatio || 1, 2.5);
  canvas.width = Math.max(1, Math.round(W * D)); canvas.height = Math.max(1, Math.round(H * D));
  baseScale = clamp(Math.min(W, H) / 420, .8, 1.6);
  const md = Math.min(2, devicePixelRatio || 1), mw = W < 500 ? 112 : 150;
  mini.style.width = mw + 'px'; mini.style.height = Math.round(mw * WORLD.h / WORLD.w) + 'px';
  mini.width = mw * md; mini.height = Math.round(mw * WORLD.h / WORLD.w) * md;
  const sg = scopeGeom();
  document.documentElement.style.setProperty('--scopeBottom', Math.round(sg.cy + sg.R) + 'px');
}

/* =====================================================================
   AUDIO — everything synthesized. No files.
   ===================================================================== */
let actx = null, master = null, audioMuted = false, noiseBuf = null;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume().catch(() => { }); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = .9; master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 1.5, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    music.start();
  } catch (e) { actx = null; }
}
function tone(f, dur, type = 'sine', vol = .06, f2 = null, delay = 0, dest = master) {
  if (!actx || audioMuted) return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), v = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  v.gain.setValueAtTime(.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + .008); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(v); v.connect(dest); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol = .1, freq = 1200, type = 'lowpass', delay = 0, f2 = null) {
  if (!actx || audioMuted) return;
  const t = actx.currentTime + delay, s = actx.createBufferSource(), f = actx.createBiquadFilter(), v = actx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(v); v.connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
}
function sfx(n, k = 1) {
  if (!actx || audioMuted) return;
  switch (n) {
    case 'shot': noise(.09, .22 * k, 3000, 'lowpass', 0, 400); tone(140, .12, 'triangle', .12 * k, 60); break;
    case 'shotBig': noise(.2, .3, 2000, 'lowpass', 0, 200); tone(90, .25, 'triangle', .16, 40); break;
    case 'pop': [260, 480, 740].forEach((f, i) => tone(f, .14, i ? 'sine' : 'triangle', .06 * k, f * .48, i * .025)); noise(.08, .05 * k, 900); break;
    case 'popBig': [180, 330, 520, 760].forEach((f, i) => tone(f, .22, i ? 'sine' : 'triangle', .08, f * .45, i * .03)); noise(.16, .08, 700); break;
    case 'splat': noise(.25, .14 * k, 900, 'lowpass', 0, 120); tone(160, .2, 'sine', .07 * k, 50); break;
    case 'boom': noise(.9, .32 * k, 900, 'lowpass', 0, 60); tone(70, .7, 'sine', .22 * k, 30); break;
    case 'snap': noise(.05, .14, 5000, 'highpass'); tone(900, .06, 'square', .03, 300); break;
    case 'crack': noise(.12, .18, 2500, 'bandpass'); tone(200, .15, 'square', .03, 80); break;
    case 'glass': for (let i = 0; i < 6; i++) tone(rand(1800, 3600), .2, 'sine', .03, null, i * .03); noise(.15, .1, 6000, 'highpass'); break;
    case 'rumble': noise(1.4, .12, 300, 'lowpass', .1); break;
    case 'quack': tone(520, .09, 'square', .04, 360); tone(480, .1, 'square', .035, 330, .11); break;
    case 'buzz': { if (!actx) break; const t = actx.currentTime, o = actx.createOscillator(), v = actx.createGain(), l = actx.createOscillator(), lg = actx.createGain(); o.type = 'sawtooth'; o.frequency.value = 220; l.frequency.value = 30; lg.gain.value = 40; l.connect(lg); lg.connect(o.frequency); v.gain.setValueAtTime(.0001, t); v.gain.exponentialRampToValueAtTime(.05, t + .05); v.gain.exponentialRampToValueAtTime(.0001, t + 2.2); o.connect(v); v.connect(master); o.start(t); l.start(t); o.stop(t + 2.3); l.stop(t + 2.3); break; }
    case 'boing': tone(220, .3, 'sine', .07, 660); tone(660, .25, 'sine', .05, 220, .15); break;
    case 'clank': tone(320, .12, 'square', .04, 180); noise(.08, .08, 3000, 'bandpass'); break;
    case 'thunk': noise(.06, .08 * k, 600); tone(120, .08, 'triangle', .05 * k, 70); break;
    case 'thud': noise(.3, .2, 400, 'lowpass'); tone(80, .3, 'sine', .14, 40); break;
    case 'fuse': noise(1.2, .06, 4000, 'highpass'); break;
    case 'crackle': for (let i = 0; i < 12; i++) noise(.05, .1, 3000, 'bandpass', .4 + i * rand(.08, .16)); break;
    case 'fizz': noise(.4, .1, 6000, 'highpass', 0, 2000); tone(800, .2, 'sine', .03, 1600); break;
    case 'plip': tone(900, .08, 'sine', .04, 1400); break;
    case 'splash': noise(.4, .12, 2000, 'lowpass', 0, 300); break;
    case 'whoosh': noise(.8, .06, 500, 'bandpass', 0, 2000); break;
    case 'whistle': tone(1600, 1.2, 'sine', .04, 300); break;
    case 'deflate': tone(400, .9, 'sawtooth', .025, 80); break;
    case 'twang': tone(330, .6, 'sawtooth', .04, 160); tone(110, .5, 'triangle', .04, 90); break;
    case 'reel': for (let i = 0; i < 6; i++) tone(1400, .03, 'square', .015, null, i * .05); break;
    case 'ding': tone(1320, .3, 'sine', .05); tone(1980, .4, 'sine', .03, null, .08); break;
    case 'chime': [784, 988, 1175, 1568].forEach((f, i) => tone(f, .3, 'triangle', .05, null, i * .07)); break;
    case 'fanfare': [523, 659, 784, 1046].forEach((f, i) => tone(f, .22, 'square', .025, null, i * .09)); break;
    case 'alarm': for (let i = 0; i < 6; i++) tone(i % 2 ? 660 : 880, .22, 'square', .035, null, i * .24); break;
    case 'fail': [392, 330, 262].forEach((f, i) => tone(f, .3, 'triangle', .05, null, i * .16)); break;
    case 'reload': tone(600, .05, 'square', .03); tone(420, .05, 'square', .03, null, .12); break;
    case 'cock': tone(300, .05, 'square', .04); noise(.04, .06, 4000, 'highpass', .05); break;
    case 'click': tone(1200, .03, 'square', .02); break;
    case 'gasp': noise(.35, .05, 1400, 'bandpass'); break;
  }
}
const music = (() => {
  let gain = null, timer = null, stepN = 0, nextT = 0, mood = 'festive', muted = false;
  const scales = { festive: [0, 2, 4, 7, 9, 12, 14, 16], tense: [0, 1, 3, 6, 7, 8, 12, 13], win: [0, 4, 7, 12, 16, 19], sad: [0, 3, 7, 10, 12] };
  const prog = { festive: [0, 5, 7, 5], tense: [0, 1, 0, 6], win: [0, 5, 7, 0], sad: [0, 8, 5, 7] };
  const r = rng(11); const mel = Array.from({ length: 32 }, () => r() < .62 ? Math.floor(r() * 8) : -1);
  function note(semi, t, dur, type, vol) {
    const o = actx.createOscillator(), v = actx.createGain();
    o.type = type; o.frequency.value = 261.6 * Math.pow(2, semi / 12);
    v.gain.setValueAtTime(.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + .01); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(v); v.connect(gain); o.start(t); o.stop(t + dur + .02);
  }
  function tick() {
    if (!actx) return;
    const bpm = mood === 'tense' ? 150 : mood === 'sad' ? 80 : 118, s8 = 60 / bpm / 2;
    while (nextT < actx.currentTime + .25) {
      const bar = Math.floor(stepN / 8) % 4, root = prog[mood][bar] - 12, sc = scales[mood], i = stepN % 8;
      if (!muted && G.started && !G.paused) {
        if (i % 4 === 0) note(root - 12, nextT, s8 * 1.6, 'triangle', .05);
        if (i % 4 === 2) { note(root + 4 - (mood === 'tense' || mood === 'sad' ? 1 : 0), nextT, s8 * .7, 'triangle', .022); note(root + 7, nextT, s8 * .7, 'triangle', .02); }
        const m = mel[stepN % 32];
        if (m >= 0 && !(G.flags.banjoBroken && mood === 'festive')) note(sc[m % sc.length] + (mood === 'tense' ? 0 : 12), nextT, s8 * .9, mood === 'tense' ? 'sawtooth' : 'square', mood === 'tense' ? .012 : .014);
        if (mood === 'tense' && i % 2 === 0) note(36, nextT, .05, 'square', .01);
      }
      nextT += s8; stepN++;
    }
  }
  return {
    start() { gain = actx.createGain(); gain.gain.value = .6; gain.connect(master); nextT = actx.currentTime + .1; timer = setInterval(tick, 80); },
    setMood(m) { mood = m; },
    mute(m) { muted = m; }
  };
})();

/* ---------- boot ---------- */
buildDecor();
G.props = makeProps(); G.npcs = []; G.byId = {};
new ResizeObserver(resize).observe(canvas);
resize();
showBrief();
requestAnimationFrame(step);

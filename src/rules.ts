/* =====================================================================
   RULES — time, shooting, kills, witnesses, suspicion, lockdown,
   scoring, challenges and the per-frame simulation step.
   ===================================================================== */
import { music, sfx } from "./audio";
import { CAST_CIVS, CAST_GUARDS, CHALLENGES, HANDLER, LINES, MISSION_LEN, OPPS, OPP_IDS, PAL, PAL_KEYS, PHASES, TARGET_IDS, WORLD, rifleFor, type LineKey, type OppId, type PalKey } from "./data";
import { BOBBER, buildCast, bunchPos, conePos, itemPos, placeAtStart, react, say, updateNPC } from "./npc";
import { makeProps } from "./props";
import { SAVE, levelOf, persist } from "./save";
import { G, INPUT, REDUCE, VIEW, freshStats, resetGame, type Ammo, type Aim, type Job, type KillInfo, type NPC, type Puddle, type Shot } from "./state";
import { comboCall, feed, hud, hudTick, setExtractVisible, tickHandlerUI, toast, updateAmmoUI, setWordmark, clearFeed, hideHint } from "./ui";
import { TAU, clamp, dist, inEll, pick, rand, shuffle } from "./util";
import { bushAt, onDock, waterAt } from "./world";

/* ---------- side jobs: fresh mini-objectives every contract ---------- */
const adults = () => CAST_CIVS.filter(c => !c.kid);
const JOB_GEN: (() => Omit<Job, 'done'>)[] = [
  () => { const c = pick(adults()); return { text: `Pop ${c.name} with an accident`, test: (n, i) => n.id === c.id && !!i.accident }; },
  () => { const c = pick(adults()); return { text: `Pop ${c.name} and hide the puddle`, test: (n, _i, p) => n.id === c.id && p.concealed }; },
  () => { const gd = pick(CAST_GUARDS); return { text: `Headshot ${gd.name}`, test: (n, i) => n.id === gd.id && !!i.head }; },
  () => { const c = pick(adults()); return { text: `Pop ${c.name} in the first 2 minutes`, test: n => n.id === c.id && G.T < 120 }; },
  () => ({ text: 'Headshot a target while they’re walking', test: (n, i) => n.kind === 'target' && !!i.head && !!i.moving }),
  () => ({ text: 'Pop a guard hiding in the dune grass', test: (n, _i, p) => n.kind === 'guard' && p.where === 'bush' }),
  () => ({ text: 'Pop 3 jellies within a few seconds', test: () => G.combo >= 3 }),
  () => ({ text: 'Pop a target while they’re in the conga', test: n => n.kind === 'target' && n.acting === 'dance' }),
  () => ({ text: 'Dunk a guard in the lagoon', test: (n, _i, p) => n.kind === 'guard' && p.where === 'water' && waterAt(n.x, n.y)?.id === 'pond' }),
  () => ({ text: 'Pop a bodyguard before their boss', test: n => !!n.protects && G.byId[n.protects].alive })
];
const rollJobs = (): Job[] => shuffle(JOB_GEN).slice(0, 3).map(f => ({ ...f(), done: false }));
export let nextJobs = rollJobs();
function checkJobs(n: NPC, info: KillInfo, p: Puddle): void {
  for (const j of G.jobs) if (!j.done && j.test(n, info, p)) {
    j.done = true; addScore(1500 * (G.pro ? 1.5 : 1) | 0);
    setTimeout(() => { toast('SIDE JOB DONE  +1500', j.text.toUpperCase()); sfx('chime'); }, 1100);
  }
}

export function newMission(): void {
  const lvl = levelOf(SAVE.xp);
  const rifle = rifleFor(lvl);
  resetGame({
    ended: false, started: true, zoom: .8, rifle, mag: rifle.mag, special: { fizz: rifle.fizz, bomb: rifle.bomb },
    jobs: nextJobs, pro: !!SAVE.pro && lvl >= 4, stats: freshStats()
  });
  nextJobs = rollJobs();
  setWordmark(G.pro ? 'JELLYSHOT · PRO' : 'JELLYSHOT');
  G.props = makeProps();
  G.npcs = buildCast();
  G.byId = {}; for (const n of G.npcs) G.byId[n.id] = n;
  for (const n of G.npcs) placeAtStart(n);
  setZoom(.8);
  clearFeed();
  HANDLER.intro.forEach(l => handler(l));
  hud(); updateAmmoUI();
}

/* ---------- small world helpers used by props/NPCs ---------- */
export function npcsIn(x: number, y: number, rx: number, ry: number): NPC[] {
  return G.npcs.filter(n => n.alive && !n.dying && !n.inBalloon && inEll(n.x, n.y, { x, y, rx, ry }));
}
export function startle(x: number, y: number, r: number, line: string | null): void {
  let said = false;
  for (const n of G.npcs) if (n.alive && !n.dying && dist(n.x, n.y, x, y) < r) {
    n.startled = .35;
    if (line && !said && dist(n.x, n.y, x, y) < r * .8) { say(n, line, 2.4); said = true; }
  }
}
export function crowdSay(x: number, y: number, r: number, pool: LineKey, count: number): void {
  const list = shuffle(G.npcs.filter(n => n.alive && !n.dying && dist(n.x, n.y, x, y) < r)).slice(0, count);
  for (const n of list) { say(n, pick(LINES[pool]), 2.6); n.startled = .3; if (n.kind !== 'target' || !n.react) react(n, 'look', { time: 2.2 }); }
}
export function fallIn(n: NPC, cause: string, delay: number): void {
  if (!n.alive || n.dying) return;
  n.react = null; n.dying = .55 + delay; n.fallCause = cause; n.sink = 0;
  say(n, pick(['WHOA!', 'Eep!', 'Not the lagoon!', 'Glub!']), 1.4);
}
export function beeChase(n: NPC): void { react(n, 'bees', { time: 99 }); say(n, pick(LINES.bees), 1.6); }
export function shake(v: number): void { if (!REDUCE) G.shake = Math.max(G.shake, v); }

const evTargets = (ev: number): string[] => (G.evKills[ev] || []).filter(id => G.byId[id].kind === 'target');

export function accident(list: NPC[], cause: string): void {
  const ev = ++G.eventId;
  for (const n of list) killNPC(n, { cause, accident: true, ev });
  const tk = evTargets(ev);
  if (cause === 'cake' && tk.length) award('cake');
  if (cause === 'cake' && tk.length === 3) award('cake3');
  if (cause === 'fireworks' && tk.length === 3) award('fireworks');
  if (cause === 'gumball' && tk.length) award('gumball');
  if (cause === 'maypole' && tk.includes('skylar')) award('maypole');
  if (cause === 'oven' && tk.includes('rick')) award('oven');
  const n = (G.evKills[ev] || []).length;
  if (n >= 2) { toast(`${n}× ACCIDENT!`, cause === 'cake' ? 'To the moon' : 'Tragic. Truly.'); addScore((n - 1) * 250); }
  if (tk.length) handler(pick(HANDLER.accident));
}
/* ---------- the pop ---------- */
export function killNPC(n: NPC, info: KillInfo = {}): void {
  if (!n.alive) return;
  const lift = n.inBalloon ? (G.props.find(p => p.id === 'balloon')?.h || 0) : 0;
  n.alive = false; n.dying = 0; n.kb = null; n.inBalloon = false;
  const wasMourning = n.react?.type === 'mourn' && G.T - (n.react.at ?? G.T) > .5 ? n.react.who : null;
  n.react = null;
  const wAt = waterAt(n.x, n.y), bAt = bushAt(n.x, n.y);
  const concealed = !!(info.concealed || (wAt && !onDock(n.x, n.y)) || bAt || (wAt && info.cause === 'dock'));
  const where = wAt ? 'water' : bAt ? 'bush' : null;
  const r = n.r * 1.05;
  const p: Puddle = {
    x: n.x, y: n.y, c: n.col, r, angle: rand(-.4, .4), age: 0, victim: n.id, t: G.T, concealed, where, accident: !!info.accident,
    found: false, seenBy: new Set(), hat: n.hat, eyes: true,
    drops: Array.from({ length: 9 }, () => ({ x: rand(-r * 2, r * 2), y: rand(-r * 1.1, r * 1.1), r: rand(1.5, 4.5) }))
  };
  G.puddles.push(p);
  const by = n.y - lift - n.r * .5;
  if (where === 'water') { splashAt(n.x, n.y); splashAt(n.x + 8, n.y - 3); }
  else blobs(n.x, by, n.col, 26 + (n.kind === 'target' ? 20 : 0));
  sfx(n.kind === 'target' ? 'popBig' : 'pop');
  G.hitmark = 1; G.hitmarkC = n.kind === 'target' ? '#ff2d63' : '#ffffff';
  hitstop(n.kind === 'target' ? .07 : .035);
  shake(n.kind === 'target' ? 7 : 3);

  // ---------- scoring ----------
  const T = n.kind === 'target', parts: string[] = [];
  let pts = T ? 1000 : n.kind === 'guard' ? 150 : 25;
  parts.push(T ? 'TARGET' : n.kind === 'guard' ? 'GUARD' : 'COLLATERAL');
  if (info.head) { pts += T ? 300 : 50; parts.push('HEADSHOT'); G.stats.heads++; }
  if (info.moving) { pts += T ? 150 : 25; parts.push('MOVING'); }
  if (info.accident) { pts += T ? 600 : 100; parts.push('ACCIDENT'); G.stats.accidents++; }
  if (concealed) { pts += T ? 300 : 50; parts.push('CONCEALED'); G.stats.concealed++; }
  if (G.clock - G.lastKill < 2.5) G.combo++; else G.combo = 1;
  G.lastKill = G.clock;
  if (G.combo > 1) { pts += (G.combo - 1) * 100; parts.push(`COMBO ×${G.combo}`); comboCall(G.combo); }
  addScore(pts);
  floater(n.x, by - 22, `+${pts}`, T ? '#ffe066' : '#fff7cb', T ? 1.5 : 1);
  feed(`${T ? '◆ ' : ''}${n.name}`, parts.join(' · '), pts, T);
  G.stats.kills.push({ id: n.id, kind: n.kind, cause: info.cause || 'shot', accident: !!info.accident, head: !!info.head, concealed, t: G.T });
  if (info.ev) (G.evKills[info.ev] ||= []).push(n.id);
  checkJobs(n, { ...info, moving: info.moving || n.moving > 5 }, p);
  if (!T && n.kind !== 'guard') G.stats.collateral++;
  if (n.kind === 'guard') G.stats.guards++;

  // ---------- consequences ----------
  if (T) {
    G.slow = REDUCE ? 0 : .55;
    toast('TARGET POPPED', n.name.toUpperCase());
    if (!info.accident) handler(pick(HANDLER.pop));
    if (info.cause === 'bees') { award('bees'); if (G.flags.meetBench && G.T >= 220) award('benchbees'); }
    if (info.cause === 'dock' && n.id === 'brayden') award('dock');
    if (info.cause === 'balloon' && n.id === 'skylar') award('balloon');
    if (!TARGET_IDS.some(id => G.byId[id].alive)) {
      setTimeout(() => handler(HANDLER.allDown), 900);
      setExtractVisible(true);
      const tk = G.stats.kills.filter(k => k.kind === 'target');
      if (tk.every(k => k.accident)) award('accidents');
      if (tk.every(k => k.head)) award('heads');
      if (G.T < 120) award('speed');
    }
  }
  if (n.id === 'dmitri' && G.flags.proposing) { award('coldfeet'); G.flags.proposing = false; }
  if (n.id === 'doris') { award('client'); setTimeout(() => handler(HANDLER.client), 600); }
  if (wasMourning && (G.byId[wasMourning]?.partner === n.id || n.partner === wasMourning)) award('widow');
  if (G.stats.collateral === 12) handler(HANDLER.collateral);
  if (G.stats.concealed >= 5) award('concealed');
  if (G.npcs.filter(m => m.kind === 'guard').every(m => !m.alive && !m.gone)) award('guards');
  if (G.npcs.every(m => !m.alive && !m.gone && !m.escaped)) award('everyone');
  // people who loved them and didn't see it go looking
  for (const m of G.npcs) if (m.alive && m.kind !== 'target' && loves(m, n) && !p.seenBy.has(m.id)) m.lostFor = n.id;
  // immediate witnesses
  const wr = concealed ? 70 : 170;
  for (const m of G.npcs) if (m.alive && !m.dying && !m.inBalloon && dist(m.x, m.y, n.x, n.y) < wr) notice(m, p, true);
  hud();
}
function loves(m: NPC, n: NPC): boolean {
  return m.partner === n.id || n.partner === m.id || m.parent === n.id || n.parent === m.id || n.protects === m.id || m.protects === n.id;
}

/* ---------- witnesses & suspicion ---------- */
function notice(m: NPC, p: Puddle, live: boolean): void {
  if (p.seenBy.has(m.id)) return;
  p.seenBy.add(m.id);
  const victim = G.byId[p.victim];
  G.calmT = 6;
  // each puddle can only stir up so much panic: accidents barely any
  const cap = p.accident ? 6 : 45;
  const bump = (v: number) => { const add = Math.min(v, cap - (p.susp || 0)); if (add > 0) { p.susp = (p.susp || 0) + add; bumpSusp(add); } };
  if (loves(m, victim) && m.kind !== 'guard' && m.kind !== 'target') {
    react(m, 'mourn', { x: p.x, y: p.y, time: 28, who: victim.id });
    say(m, m.kind === 'kid' ? pick(LINES.mournKid) : `${victim.name.split(' ').pop()?.toUpperCase()}!!`, 2.6);
    bump(p.accident ? 4 : 9); markFound(p); return;
  }
  if (p.accident) { bump(m.kind === 'guard' ? 3 : 1); if (!m.react) react(m, 'look', { time: 2.6 }); if (Math.random() < .6) say(m, pick(LINES.accidentSeen), 2.4); return; }
  markFound(p);
  if (m.kind === 'guard') { bump(live ? 30 : 22); react(m, 'guard', { x: p.x, y: p.y, time: 14, p }); say(m, pick(LINES.guardAlert), 2.4); }
  else if (m.kind === 'target') { bump(live ? 34 : 26); react(m, 'panic', { x: p.x, y: p.y, time: 3 }); say(m, pick(LINES.flee), 2.2); }
  else { bump(live ? 14 : 10); react(m, 'panic', { x: p.x, y: p.y, time: 3.4 }); say(m, pick(LINES.panic), 2.2); }
}
function markFound(p: Puddle): void {
  if (p.found) return;
  p.found = true;
  if (!p.accident) { G.stats.found++; if (G.stats.found === 1) handler(HANDLER.ghostLost); }
}
export function bumpSusp(v: number): void {
  if (G.lockdown) return;
  if (G.pro) v *= 1.6;
  G.susp = Math.min(100, G.susp + v);
  G.calmT = 6;
  if (G.susp >= 60 && !G.cues.has('susp')) { G.cues.add('susp'); handler(HANDLER.suspicious); }
  if (G.susp >= 100) triggerLockdown();
}
function triggerLockdown(): void {
  if (G.lockdown) return;
  G.lockdown = true; G.susp = 100;
  toast('LOCKDOWN!', 'The targets are making a run for it'); handler(HANDLER.lockdown);
  sfx('alarm'); music.setMood('tense');
  for (const n of G.npcs) {
    if (!n.alive || n.dying) continue;
    if (n.kind === 'target') {
      const bal = G.props.find(p => p.id === 'balloon');
      if (n.id === 'skylar' && bal?.state === 'landed') react(n, 'flee', { g: [1665, 280], balloon: true });
      else if (!n.inBalloon) react(n, 'flee', { g: [1000, 1296] });
    } else if (n.kind === 'guard') { if (!n.protects) react(n, 'investigate', { x: 1000, y: 1100, time: 20 }); }
    else if (Math.random() < .45) react(n, 'flee', { g: [1000 + rand(-40, 40), 1296] });
    else react(n, 'cower', { time: 999 });
  }
}
export function escapeTarget(n: NPC): void {
  if (!n.alive) return;
  n.alive = false; n.escaped = true; n.react = null;
  G.stats.escaped++;
  toast('TARGET ESCAPED', n.name.toUpperCase()); handler(HANDLER.escape); sfx('fail');
  feed(`✕ ${n.name}`, 'ESCAPED', 0, true);
  checkEnd();
}
export function leave(n: NPC): void { n.alive = false; n.gone = true; n.react = null; }

/* ---------- discoveries, challenges, handler ---------- */
export function discover(id: OppId | undefined): void {
  if (!id || G.disc.has(id)) return;
  G.disc.add(id);
  const o = OPPS[id];
  toast('OPPORTUNITY', o.name.toUpperCase());
  handler(o.hint, true);
  sfx('ding');
  if (G.disc.size === OPP_IDS.length) award('opps');
}
export function award(id: string): void {
  if (G.run.done.has(id) || G.ended) return;
  G.run.done.add(id);
  const c = CHALLENGES.find(c => c.id === id); if (!c) return;
  const fresh = !SAVE.done.includes(id);
  if (fresh) { SAVE.done.push(id); persist(); }
  addScore(500);
  setTimeout(() => { toast(fresh ? 'CHALLENGE COMPLETE' : 'CHALLENGE', c.name.toUpperCase()); sfx('chime'); }, 700);
}
const ALWAYS_SAY: string[] = [HANDLER.lockdown, HANDLER.allDown, HANDLER.escape, HANDLER.client];
const SCRIPTED = new Set<string>(Object.values(HANDLER).flat());
export function handler(text: string, urgent = false): void {
  // PRO mode: the handler stays quiet except for hints you earned and true emergencies
  if (G.pro && !urgent && G.T > 12 && !G.ended && SCRIPTED.has(text) && !ALWAYS_SAY.includes(text)) return;
  if (urgent) G.handlerQ.unshift(text); else G.handlerQ.push(text);
  if (G.handlerQ.length > 5) G.handlerQ.length = 5;
}
function tickHandler(dt: number): void {
  G.handlerT -= dt;
  if (G.handlerT > 0) return;
  const t = G.handlerQ.shift();
  tickHandlerUI(t ?? null);
  if (t) { G.handlerT = clamp(t.length * .055, 3.2, 7); G.quietT = 0; }
}

/* ---------- score & particles ---------- */
export function addScore(v: number): void { G.score += v; hud(); }
export function floater(x: number, y: number, t: string, c = '#fff7cb', s = 1): void { G.floaters.push({ x, y, t, c, s, life: 1.2 }); }
function blobs(x: number, y: number, col: PalKey, n: number): void {
  const c = PAL[col];
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(40, 190); G.parts.push({ type: 'blob', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, r: rand(2, 6), c: c[i % 2 ? 0 : 2], hl: c[1], life: rand(.5, 1.1), g: 300 }); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; G.parts.push({ type: 'ring', x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 70, r: 4, c: c[0], life: .3, g: 0 }); }
}
export function spray(x: number, y: number, cols: string[], n: number, k = 1): void {
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(50, 260) * k; G.parts.push({ type: 'blob', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .7 - 120 * k, r: rand(2, 7), c: pick(cols), hl: '#ffffffaa', life: rand(.6, 1.4), g: 340 }); }
}
export function puff(x: number, y: number, c: string): void { G.parts.push({ type: 'puff', x, y, vx: rand(-10, 10), vy: rand(-40, -20), r: rand(5, 10), c, life: rand(.8, 1.4), g: -10 }); }
export function spark(x: number, y: number): void { G.parts.push({ type: 'spark', x, y, vx: rand(-60, 60), vy: rand(-90, -20), r: 2, c: pick(['#ffe066', '#fff', '#ff9464']), life: rand(.2, .5), g: 200 }); }
export function splashAt(x: number, y: number): void {
  for (let i = 0; i < 10; i++) G.parts.push({ type: 'blob', x, y, vx: rand(-60, 60), vy: rand(-170, -60), r: rand(2, 4), c: '#c1f6ff', hl: '#fff', life: rand(.4, .8), g: 420 });
  G.parts.push({ type: 'ripple', x, y, vx: 0, vy: 0, r: 4, c: '#fff', life: 1, g: 0 });
}
function hitstop(t: number): void { if (!REDUCE) G.hitstop = Math.max(G.hitstop, t); }

/* =====================================================================
   SHOOTING & THE SCOPE
   A fire press is never thrown away: it is queued, and goes off the
   instant the rifle can shoot (cooldown over, reload done, scope up).
   ===================================================================== */
const COOLDOWN_MS = 220;     // real time, so hit-stop / slow-mo never eat a shot
const QUEUE_MS = 2500;       // a press stays live this long while the rifle gets ready

/** On-screen magnified scale while scoped. */
export function scale(): number { return G.zoom * VIEW.base; }
/** Naked-eye scale: the blurred periphery while scoped, and the whole survey view. */
export function surveyScale(): number {
  const { W, H } = VIEW;
  return Math.min(clamp(Math.min(W / 1150, H / 820), .3, 1.1), VIEW.base * .62);
}
/** The scale input should use right now (dragging, keyboard pan, minimap). */
export function liveScale(): number { return G.lower > .5 ? surveyScale() : scale(); }
export const scoped = (): boolean => !G.survey && G.lower < .12;

export function sway(): [number, number] {
  const t = G.clock, amp = (5.5 + G.kick * 16) * (1 - G.steady * .86) * (G.breathLock ? 1.9 : 1) * (G.lockdown ? 1.15 : 1) * (G.pro ? 1.3 : 1);
  return [(Math.sin(t * .83) * .6 + Math.sin(t * 1.97 + 1.3) * .4) * amp, (Math.sin(t * 1.13 + .5) * .6 + Math.sin(t * 2.41) * .4) * amp * .8];
}
export function aimPoint(): [number, number] { const [sx, sy] = sway(), S = scale(); return [G.cam.x + sx / S, G.cam.y + sy / S]; }

const canPlay = () => G.started && !G.ended && !G.paused;

/** The player pressed fire. Shoots now if possible, otherwise as soon as possible. */
export function requestFire(): void {
  if (!canPlay()) return;
  if (G.mag <= 0 && G.reloading <= 0) startReload();
  // a partial manual reload is interrupted: you still have rounds, so shoot them
  if (G.reloading > 0 && G.mag > 0) { G.reloading = 0; updateAmmoUI(); }
  // from a manual survey, fire brings the scope up; mid-reload it comes up by itself when the bolt closes
  if (G.survey && !(G.surveyByReload && G.reloading > 0)) raiseScope();
  G.fireQueuedAt = performance.now();
  tryFire();
}
function tryFire(): void {
  if (!G.fireQueuedAt) return;
  const now = performance.now();
  if (now - G.fireQueuedAt > QUEUE_MS || !canPlay()) { G.fireQueuedAt = 0; return; }
  if (G.reloading > 0 || G.mag <= 0 || !scoped() || now - G.lastShotAt < COOLDOWN_MS) return;
  G.fireQueuedAt = 0;
  shoot();
}
function shoot(): void {
  let ammo: Ammo = G.ammo;
  if (ammo !== 'std' && G.special[ammo] <= 0) ammo = G.ammo = 'std';
  G.mag--;
  if (ammo !== 'std') { G.special[ammo]--; if (G.special[ammo] <= 0) G.ammo = 'std'; }
  G.lastShotAt = performance.now(); G.shots++;
  const [x, y] = aimPoint();
  G.pending.push({ x, y, t: .085, ammo });
  G.kick = 1; G.recoil = 9; G.flash = 1;
  sfx(ammo === 'bomb' ? 'shotBig' : 'shot');
  hideHint();
  if (G.mag === 0) setTimeout(() => { if (G.mag === 0) startReload(); }, 380);
  updateAmmoUI();
}
export function startReload(): void {
  if (G.reloading > 0 || G.mag === G.rifle.mag || G.ended) return;
  G.reloading = G.rifle.reload; sfx('reload'); updateAmmoUI();
  // the rifle comes down while you work the bolt: a free look at the whole grounds
  if (!G.survey) { lowerScope(); G.surveyByReload = true; }
}
export function lowerScope(): void {
  if (G.survey || !canPlay()) return;
  G.survey = true; G.surveyByReload = false; sfx('lower');
}
export function raiseScope(at?: { x: number; y: number }): void {
  if (at) { G.cam.x = at.x; G.cam.y = at.y; bound(); }
  if (!G.survey) return;
  G.survey = false; G.surveyByReload = false; sfx('raise');
}
export const toggleSurvey = (): void => { if (G.survey) raiseScope(); else lowerScope(); };

function npcAt(x: number, y: number): { n: NPC; head: boolean } | null {
  let best: { n: NPC; head: boolean } | null = null;
  for (const n of G.npcs) {
    if (!n.alive || n.dying) continue;
    const lift = n.inBalloon ? (G.props.find(p => p.id === 'balloon')?.h ?? 0) + 6 : 0;
    const hop = n.hopNow ?? 0;
    const bx = n.x, by = n.y - (n.inBalloon ? lift : hop) - n.r * .45;
    const dx = (x - bx) / (n.r * 1.02), dy = (y - by) / (n.r * .98);
    if (dx * dx + dy * dy < 1 && (!best || n.y > best.n.y)) best = { n, head: y < by - n.r * .32 };
  }
  return best;
}
function itemAt(x: number, y: number): Aim | null {
  for (const n of G.npcs) {
    if (!n.alive || n.dying) continue;
    if (n.hasCone) { const [cx, cy] = conePos(n); if (dist(x, y, cx, cy) < 6.5) return { what: 'item', kind: 'cone', n }; }
    if (n.id === 'bill' && !G.flags.banjoBroken) { const [cx, cy] = itemPos(n); if (dist(x, y, cx, cy + 2) < 8.5) return { what: 'item', kind: 'banjo', n }; }
    if (n.item === 'bunch') for (let i = 0; i < n.balloons; i++) { const [bx, by] = bunchPos(n, i); if (dist(x, y, bx, by) < 8.5) return { what: 'item', kind: 'bunch', n, i }; }
    if (n.id === 'finn' && n.acting === 'fish' && !G.flags.fishCaught && dist(x, y, BOBBER[0], BOBBER[1]) < 8) return { what: 'item', kind: 'bobber', n };
  }
  return null;
}
function propAt(x: number, y: number, precise: boolean): Aim | null {
  for (const p of G.props) { const h = p.hit?.(x, y); if (h && !!h.precise === precise) return { what: 'prop', p, h }; }
  return null;
}
export function targetAt(x: number, y: number): Aim | null {
  const n = () => { const r = npcAt(x, y); return r ? { what: 'npc' as const, ...r } : null; };
  return propAt(x, y, true) ?? itemAt(x, y) ?? n() ?? propAt(x, y, false);
}

function impact(b: Shot): void {
  G.marks.push({ x: b.x, y: b.y, life: 2.5 });
  const hit = targetAt(b.x, b.y);
  if (b.ammo === 'bomb') return sugarBomb(b.x, b.y);
  if (hit) G.hits++;
  if (hit?.what === 'prop') {
    const r = hit.p.shot?.(hit.h, b.ammo);
    if (r === 'prop') { G.hitmark = 1; G.hitmarkC = '#ffd36b'; }
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
function lure(x: number, y: number): void {
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
function fizz(x: number, y: number, direct: NPC | null): void {
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
function sugarBomb(x: number, y: number): void {
  shake(14); sfx('boom'); spray(x, y, ['#ffe066', '#ff5c9e', '#ffffff', '#ffb84c'], 60, 1.2);
  for (const p of G.props) {
    if (!p.hit) continue;
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; const h = p.hit(x + Math.cos(a) * 30, y + Math.sin(a) * 20) || p.hit(x, y); if (h) { p.shot?.(h, 'bomb'); break; } }
  }
  const vic = npcsIn(x, y, 66, 40);
  const ev = ++G.eventId;
  for (const n of vic) killNPC(n, { cause: 'bomb', ev });
  if (vic.length >= 4) award('bomb');
  if (vic.length >= 2) toast(`${vic.length}× SUGAR BOMB`, 'subtle.');
  bumpSusp(12);
  lure(x, y);
}
function itemShot(h: Extract<Aim, { what: 'item' }>): void {
  const n = h.n;
  if (h.kind === 'cone') {
    n.hasCone = false; sfx('splat', .4); spray(...conePos(n), ['#ffd0e5', '#fff5b0', '#e7b06a'], 14, .5);
    react(n, 'sad', { time: 7 }); say(n, pick(LINES.sad), 2.4);
    const par = n.parent ? G.byId[n.parent] : undefined;
    if (par?.alive && !par.react) {
      react(par, 'argue', { x: 800, y: 832, time: 9 }); say(par, pick(LINES.argue), 2.6);
      const sam = G.byId.sam; if (sam?.alive) setTimeout(() => { if (sam.alive) say(sam, pick(LINES.argueBack), 2.6); }, 1800);
    }
    discover('icecream'); award('scoop'); if (!G.cues.has('kid')) { G.cues.add('kid'); handler(HANDLER.kid); }
    floater(n.x, n.y - 30, 'SCOOPED!', '#ffd0e5');
  } else if (h.kind === 'banjo') {
    G.flags.banjoBroken = true; sfx('twang'); say(n, pick(LINES.sadBusker), 3); discover('banjo'); award('banjo'); handler(HANDLER.banjo);
    crowdSay(n.x, n.y, 160, 'boo', 3); floater(n.x, n.y - 30, 'TWANG!', '#ffe066');
  } else if (h.kind === 'bunch') {
    const i = h.i ?? 0;
    const [bx, by] = bunchPos(n, i);
    n.balloons--; sfx('pop', .5);
    G.parts.push({ type: 'balloon', x: bx, y: by, vx: rand(-10, 10), vy: -50, r: 7, c: PAL[PAL_KEYS[i]][0], life: 5, g: -6 });
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
function timeline(): void {
  let pi = 0; for (let i = 0; i < PHASES.length; i++) if (PHASES[i].t <= G.T) pi = i;
  if (pi !== G.phaseI) {
    G.phaseI = pi;
    const ph = PHASES[pi];
    if (pi > 0) { toast(ph.name, ph.sub); sfx('fanfare'); }
    if (ph.id === 'cake' && !G.flags.cakeDown) handler(HANDLER.cake);
    if (ph.id === 'pie') handler(HANDLER.pie);
    if (ph.id === 'maypole') handler(HANDLER.maypole);
    if (ph.id === 'meeting') handler(G.flags.meetBench ? HANDLER.meetingAlt : HANDLER.meeting);
    if (ph.id === 'farewell') handler(HANDLER.farewell);
  }
  const cue = (k: string, t: number, fn: () => void) => { if (G.T >= t && !G.cues.has(k)) { G.cues.add(k); fn(); } };
  cue('arrivals', 18, () => { if (G.byId.brayden.alive && G.byId.skylar.alive) handler(HANDLER.arrivals); });
  cue('cakeSoon', 36, () => { if (!G.flags.cakeDown) handler(HANDLER.cakeSoon); });
  cue('pie2', 114, () => { if (G.byId.brayden.alive) handler(HANDLER.pie2); });
  cue('pie3', 128, () => { if (G.byId.skylar.alive) handler(HANDLER.pie3); });
  cue('oneMin', MISSION_LEN - 60, () => { if (TARGET_IDS.some(id => G.byId[id].alive)) handler(HANDLER.oneMin); });
  // ---- little scripted scenes that make the town feel alive ----
  const A = (id: string): NPC | null => { const n = G.byId[id]; return n && n.alive && !n.react ? n : null; };
  cue('crane', 47, () => { const k = A('kranz'); if (k && !G.flags.cakeDown) say(k, 'Coin is UP! Nobody sneeze.', 3); });
  cue('mcCake', 56, () => { const m = A('sprinkles'); if (m) say(m, G.flags.cakeEarly ? 'Uh... the launch has MOVED to the foam pit!' : 'Give it up for BRAYDEN "MOONBOY" KESSLER!', 3); });
  cue('nibbles', 118, () => { const n = A('nibbles'); if (n) say(n, '*sneaks a rib*', 2.5); });
  cue('doris1', 140, () => { const n = A('doris'); if (n) say(n, G.byId.rick.alive ? 'He’s not even CHEWING!' : 'Well. No judge. Pity.', 3); });
  cue('results', 156, () => {
    const m = A('sprinkles'), j = G.byId.rick;
    if (!m) return;
    if (j.alive) { say(m, 'And the winner is... THE GRAND FLAMINGO KITCHEN!', 3.5); setTimeout(() => { say(A('barnaby'), 'That’s HIS OWN restaurant!', 3); say(A('doris'), 'RIGGED! RIGGED, I SAY!', 3); }, 1600); }
    else { say(m, 'The judge is... unavailable. Everyone wins!', 3.5); setTimeout(() => say(A('doris'), 'Heh. Heh heh heh.', 3), 1600); }
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
  cue('show', 286, () => { const f = G.props.find(p => p.id === 'fireworks'); if (f?.state === 'ok') f.show?.(); });
  // carriage departure
  if (G.T >= MISSION_LEN) { for (const id of TARGET_IDS) if (G.byId[id].alive) escapeTarget(G.byId[id]); onMissionOver(); }
}
let onMissionOver: () => void = () => { };
/** ui.ts registers the results screen here (keeps rules free of a hard dependency on it). */
export function setMissionOver(fn: () => void): void { onMissionOver = fn; }
function checkEnd(): void {
  const tg = TARGET_IDS.map(id => G.byId[id]);
  if (tg.every(n => !n.alive) && tg.some(n => n.escaped)) setTimeout(() => onMissionOver(), 1800);
}

/* ---------- main update ---------- */
let scanT = 0, hudT = 0;
const LOWER_SPEED = 5.5; // scope raise/lower takes ~0.2s
export function update(dt: number, raw: number): void {
  G.T += dt; G.clock += dt;
  timeline();
  // shots in flight
  for (const b of G.pending) { b.t -= raw; if (b.t <= 0) impact(b); }
  G.pending = G.pending.filter(b => b.t > 0);
  // reload
  if (G.reloading > 0) {
    G.reloading -= raw;
    if (G.reloading <= 0) {
      G.reloading = 0; G.mag = G.rifle.mag; sfx('cock'); updateAmmoUI();
      if (G.surveyByReload) raiseScope();
    }
  }
  // scope up / down
  G.lower = clamp(G.lower + (G.survey ? 1 : -1) * raw * LOWER_SPEED, 0, 1);
  tryFire();
  // breath (only means anything with your eye to the glass)
  const want = (INPUT.holdBreath || INPUT.keys.has('ShiftLeft') || INPUT.keys.has('ShiftRight')) && !G.breathLock && scoped();
  if (want && G.breath > 0) { G.steady = Math.min(1, G.steady + raw * 5); G.breath -= raw * .3 / G.rifle.breath; if (G.breath <= 0) { G.breath = 0; G.breathLock = true; sfx('gasp'); } }
  else { G.steady = Math.max(0, G.steady - raw * 4); G.breath = Math.min(1, G.breath + raw * .2); if (G.breathLock && G.breath > .4) G.breathLock = false; }
  G.kick = Math.max(0, G.kick - raw * 2.6);
  G.hitmark = Math.max(0, G.hitmark - raw * 2.5);
  if (G.steady > .5) { G.beatT -= raw; if (G.beatT <= 0) { G.beatT = .85 - (1 - G.breath) * .35; sfx('beat'); } }
  G.recoil = Math.max(0, G.recoil - raw * 50);
  G.flash = Math.max(0, G.flash - raw * 5);
  G.shake = Math.max(0, G.shake - raw * 30);
  // keyboard pan
  const k = INPUT.keys, sp = 320 * raw / liveScale();
  if (k.has('ArrowLeft') || k.has('KeyA')) G.cam.x -= sp;
  if (k.has('ArrowRight') || k.has('KeyD')) G.cam.x += sp;
  if (k.has('ArrowUp') || k.has('KeyW')) G.cam.y -= sp;
  if (k.has('ArrowDown') || k.has('KeyS')) G.cam.y += sp;
  bound();
  // world
  for (const p of G.props) p.update?.(dt);
  for (const n of G.npcs) { if (n.startled > 0) n.startled -= dt; updateNPC(n, dt); }
  separate(dt);
  for (const n of G.npcs) if (n.alive && n.lostFor && !n.react && n.kind !== 'guard') {
    const v = G.byId[n.lostFor]; n.lostFor = null;
    if (!v.escaped) { react(n, 'lost', { x: v.x, y: v.y, time: 16 }); say(n, `${v.name.split(' ').pop()}? Where'd you go?`, 2.6); }
  }
  for (const p of G.puddles) p.age += dt;
  witnessScan(dt);
  // suspicion cools
  G.calmT -= dt;
  if (!G.lockdown && G.calmT <= 0) G.susp = Math.max(0, G.susp - dt * 2.2);
  updateParticles(dt);
  tickHandler(raw);
  G.quietT += dt;
  if (G.quietT > 45 && !G.handlerQ.length) { G.quietT = 0; handler(pick(HANDLER.quiet)); }
  aimAndDiscover(raw);
  hudT -= raw; if (hudT <= 0) { hudT = .1; hudTick(); }
}
function witnessScan(dt: number): void {
  scanT -= dt;
  if (scanT > 0) return;
  scanT = .25;
  for (const n of G.npcs) {
    if (!n.alive || n.dying || n.inBalloon || n.kb) continue;
    const range = n.kind === 'guard' ? 150 : 115;
    let best: Puddle | null = null, bd = 1e9;
    for (const p of G.puddles) {
      if (p.concealed || p.secured || p.age < .3 || p.seenBy.has(n.id) || Math.abs(n.x - p.x) > range * 1.5 || Math.abs(n.y - p.y) > range * 1.5) continue;
      const d = dist(n.x, n.y, p.x, p.y); if (d < bd) { bd = d; best = p; }
    }
    // a beat of "huh?" before they actually clock the puddle
    if (best && bd < range) {
      n.noticeT = (n.noticeT || 0) + .25;
      if (n.noticeT >= (n.kind === 'guard' ? .5 : .75)) { n.noticeT = 0; n.warn = 0; notice(n, best, false); } else n.warn = n.noticeT / .75;
    } else { n.noticeT = 0; n.warn = best && bd < range * 1.5 ? .15 : 0; }
  }
}
const ITEM_OPP = { cone: 'icecream', banjo: 'banjo', bunch: 'bunch', bobber: 'bobber' } as const;
function aimAndDiscover(raw: number): void {
  // lowered rifle: no reticle, nothing gets studied
  if (G.lower > .5) { G.aim = null; G.aimKey = null; G.aimT = 0; return; }
  const [ax, ay] = aimPoint();
  const t = targetAt(ax, ay);
  G.aim = t;
  let key = t ? (t.what === 'npc' ? 'n:' + t.n.id : t.what === 'item' ? 'i:' + t.kind : 'p:' + t.p.id) : null;
  let near: OppId | undefined;
  if (!key) for (const p of G.props) if (p.opp && !G.disc.has(p.opp) && p.dx != null && p.dy != null && dist(ax, ay, p.dx, p.dy) < (p.dr ?? 0)) { key = 'd:' + p.opp; near = p.opp; break; }
  if (key !== G.aimKey) { G.aimKey = key; G.aimT = 0; } else G.aimT += raw;
  if (key === 'n:lars' && G.aimT > 2.2 && !G.cues.has('lars')) {
    G.cues.add('lars'); const l = G.byId.lars; say(l, '...I see you.', 3); setTimeout(() => { if (l.alive) say(l, '*waves*', 2); }, 2600);
  }
  if (t?.what === 'npc' && t.n.kind === 'target' && !G.cues.has('firstTarget')) { G.cues.add('firstTarget'); handler('That’s one of them. Their full schedules are in the intel menu (☰). Patience pays.'); }
  if (G.aimT > .45 && key) {
    if (t?.what === 'prop') discover(t.p.opp);
    else if (t?.what === 'item') discover(ITEM_OPP[t.kind]);
    else if (near) discover(near);
  }
}
function separate(dt: number): void {
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
export function updateParticles(dt: number): void {
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; if (p.type === 'puff') p.r += dt * 8; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
  for (const f of G.floaters) { f.life -= dt; f.y -= 26 * dt; }
  G.floaters = G.floaters.filter(f => f.life > 0);
  for (const m of G.marks) m.life -= dt;
  G.marks = G.marks.filter(m => m.life > 0);
}
export function bound(): void { G.cam.x = clamp(G.cam.x, 0, WORLD.w); G.cam.y = clamp(G.cam.y, -60, WORLD.h); }
export function setZoom(z: number): void { G.zoom = clamp(z, .5, G.rifle.maxZoom); hud(); }
export function cycleZoom(): void { const z = G.zoom; setZoom(z < .75 ? 1 : z < 1.3 ? 1.6 : z < G.rifle.maxZoom - .1 ? G.rifle.maxZoom : .55); }
export function cycleAmmo(): void {
  const opts: Ammo[] = ['std']; if (G.special.fizz > 0) opts.push('fizz'); if (G.special.bomb > 0) opts.push('bomb');
  G.ammo = opts[(opts.indexOf(G.ammo) + 1) % opts.length];
  sfx('click'); updateAmmoUI();
}
export function selectAmmo(a: Ammo): void { if (a === 'std' || G.special[a] > 0) { G.ammo = a; updateAmmoUI(); } }

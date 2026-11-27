/* =====================================================================
   UI — DOM HUD, toasts, feed, and the briefing / intel / results sheets.
   ===================================================================== */
import { initAudio, music } from "./audio";
import { CHALLENGES, MISSION_LEN, OPPS, OPP_IDS, PHASES, TARGET_IDS, TARGET_INFO, UNLOCKS, rifleFor, xpForLevel, type TargetId } from "./data";
import { withCtx } from "./draw";
import { drawNPC, mkNPC, stepLabel } from "./npc";
import { award, newMission, nextJobs } from "./rules";
import { SAVE, levelOf, multOf, persist } from "./save";
import { G } from "./state";

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

/* ---------- small HUD pieces ---------- */
let toastTimer = 0;
export function toast(a: string, b = ''): void {
  $('toastA').textContent = a; $('toastB').textContent = b;
  const t = $('toast'); t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  toastTimer = 2.1;
}
export function tickToast(raw: number): void {
  if (toastTimer > 0) { toastTimer -= raw; if (toastTimer <= 0) $('toast').classList.remove('show'); }
}
export function feed(name: string, detail: string, pts: number, big: boolean): void {
  const li = document.createElement('div');
  li.className = 'feedrow' + (big ? ' tgt' : '');
  const b = document.createElement('b'), s = document.createElement('span'), i = document.createElement('i');
  b.textContent = name; s.textContent = detail; i.textContent = pts ? `+${pts}` : '';
  li.append(b, s, i);
  const f = $('feed'); f.prepend(li);
  while (f.children.length > 3) f.lastChild?.remove();
  setTimeout(() => li.classList.add('fade'), 4200);
  setTimeout(() => li.remove(), 5000);
}
export const clearFeed = (): void => { $('feed').replaceChildren(); };
export function comboCall(n: number): void {
  const el = $('combo'); el.textContent = ['', '', 'DOUBLE POP!', 'TRIPLE POP!', 'QUAD SQUISH!', 'JELLYPOCALYPSE!'][n] || 'UNSTOPPABLE GOO!';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
export function tickHandlerUI(text: string | null): void {
  const el = $('handler');
  if (text) { $('handlerText').textContent = text; el.classList.add('show'); } else el.classList.remove('show');
}
export const setExtractVisible = (v: boolean): void => { $('extract').hidden = !v; $('susp').hidden = v; };
export const setWordmark = (t: string): void => { $('wordmark').textContent = t; };
export const hideHint = (): void => { $('hint').classList.add('hidden'); };

export function fmt(s: number): string { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
export function hud(): void {
  $('score').textContent = String(G.score).padStart(5, '0');
  $('zoom').textContent = G.zoom.toFixed(1) + '×';
}
export function hudTick(): void {
  $('clock').textContent = fmt(MISSION_LEN - G.T);
  const ph = PHASES[Math.max(0, G.phaseI)], nx = PHASES[G.phaseI + 1];
  $('phase').textContent = ph.name;
  $('next').textContent = nx ? `NEXT ${fmt(nx.t - G.T)} · ${nx.name}` : 'FINAL MINUTES';
  const s = $('susp');
  s.style.setProperty('--v', (G.susp / 100).toFixed(3));
  const lvl = G.lockdown ? 'LOCKDOWN' : G.susp > 66 ? 'SUSPICIOUS' : G.susp > 30 ? 'UNEASY' : 'CALM';
  $('suspLabel').textContent = lvl; s.dataset.level = lvl.toLowerCase();
  for (const id of TARGET_IDS) { const n = G.byId[id]; $('t_' + id).className = 'pip ' + (n.alive ? 'alive' : n.escaped ? 'escaped' : 'dead'); }
  // aim tag
  const a = G.aim, tag = $('aimtag');
  if (a?.what === 'npc') {
    const n = a.n;
    tag.className = 'aimtag show ' + n.kind;
    $('aimName').textContent = n.name + (a.head ? '  ◎ HEAD' : '');
    $('aimRole').textContent = n.role;
    $('aimAct').textContent = stepLabel(n);
  } else if (a?.what === 'prop' || a?.what === 'item') {
    const id = a.what === 'prop' ? a.p.opp : ({ cone: 'icecream', banjo: 'banjo', bunch: 'bunch', bobber: 'bobber' } as const)[a.kind];
    const o = id && OPPS[id];
    const pid = a.what === 'prop' ? a.p.id : null;
    tag.className = 'aimtag show prop';
    $('aimName').textContent = o ? o.name : pid === 'ducks' ? 'Rubber Duck' : pid === 'gnomes' ? 'Plastic Flamingo' : 'Something';
    $('aimRole').textContent = pid === 'ducks' ? `Collectible · ${G.stats.ducks}/6` : pid === 'gnomes' ? `Collectible · ${G.stats.gnomes}/5` : 'OPPORTUNITY';
    $('aimAct').textContent = o && id && G.disc.has(id) ? o.hint : 'Hold steady to study it…';
  } else tag.className = 'aimtag';
  $('ff').classList.toggle('on', G.ff);
  $('surveyBtn').classList.toggle('on', G.survey);
  document.body.classList.toggle('surveying', G.survey);
}
export function updateAmmoUI(): void {
  const pips = $('mag');
  pips.replaceChildren(...Array.from({ length: G.rifle.mag }, (_, i) => { const s = document.createElement('i'); if (i >= G.mag) s.className = 'spent'; return s; }));
  const name = { std: 'GUMMY', fizz: 'FIZZ', bomb: 'BOMB' }[G.ammo];
  $('ammoName').textContent = name + (G.ammo !== 'std' ? ` ×${G.special[G.ammo]}` : '');
  const ammo = $<HTMLButtonElement>('ammo');
  ammo.dataset.type = G.ammo;
  ammo.disabled = !G.rifle.fizz && !G.rifle.bomb;
}

/* ---------- overlays: briefing / intel / end ---------- */
const PORTRAIT = {
  brayden: { col: 'lemon', r: 22, hat: 'backcap', look: 'crypto', item: 'phone' },
  skylar: { col: 'pink', r: 22, hat: 'sunhat', look: 'influencer', item: 'selfie' },
  rick: { col: 'peach', r: 23, hat: 'captain', look: 'tycoon' }
} as const;
function portrait(cv: HTMLCanvasElement, id: TargetId): void {
  const c = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  if (!c) return;
  cv.width = 80 * dpr; cv.height = 80 * dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = mkNPC({ id, kind: 'portrait', ...PORTRAIT[id], x: 40, y: 62, acting: 'idle', face: 1 });
  withCtx(c, () => drawNPC(n));
}
function li(text: string, cls = ''): HTMLLIElement { const l = document.createElement('li'); l.textContent = text; if (cls) l.className = cls; return l; }

export function showBrief(): void {
  G.started = false; G.ended = true;
  const lvl = levelOf(SAVE.xp), lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1), into = SAVE.xp - lo;
  $('lvl').textContent = String(lvl); $('xpbar').style.setProperty('--v', (into / (hi - lo)).toFixed(3));
  $('xptext').textContent = `${into.toLocaleString()} / ${(hi - lo).toLocaleString()} XP to level ${lvl + 1}`;
  $('mult').textContent = multOf().toFixed(2) + '×';
  $('chcount').textContent = `${SAVE.done.length} / ${CHALLENGES.length}`;
  $('best').textContent = SAVE.best.toLocaleString();
  const rf = rifleFor(lvl);
  $('loadout').textContent = `Gummy Rifle · ${rf.mag} rounds · ${rf.maxZoom}× zoom${rf.fizz ? ` · ${rf.fizz} fizz` : ''}${rf.bomb ? ` · ${rf.bomb} bombs` : ''}`;
  const nextU = UNLOCKS.find(u => u.lvl > lvl);
  $('nextunlock').textContent = nextU ? `Level ${nextU.lvl}: ${nextU.text}` : 'Everything unlocked. You monster.';
  $('jobs').replaceChildren(...nextJobs.map(j => li(j.text)));
  const pro = $('proToggle'); pro.hidden = lvl < 4; pro.classList.toggle('on', !!SAVE.pro);
  pro.textContent = SAVE.pro ? 'PRO MODE: ON  (×1.5 score · twitchier crowd · no hints)' : 'PRO MODE: OFF';
  const tc = $('targets'); tc.replaceChildren();
  for (const id of TARGET_IDS) {
    const t = TARGET_INFO[id], d = document.createElement('div');
    d.className = 'tcard';
    const cv = document.createElement('canvas'), body = document.createElement('div'), b = document.createElement('b'), p = document.createElement('p');
    b.textContent = t.name; p.textContent = t.dossier; body.append(b, p); d.append(cv, body);
    tc.appendChild(d); portrait(cv, id);
  }
  renderChallenges($('chlist'), new Set(SAVE.done));
  $('brief').hidden = false; $('intel').hidden = true; $('end').hidden = true;
  $('hudwrap').hidden = true;
}
function renderChallenges(el: HTMLElement, done: Set<string>): void {
  el.replaceChildren();
  let grp = '';
  for (const c of CHALLENGES) {
    if (c.group !== grp) { grp = c.group; const h = document.createElement('h4'); h.textContent = grp; el.appendChild(h); }
    const d = document.createElement('div'); d.className = 'ch' + (done.has(c.id) ? ' done' : '') + (G.run.done.has(c.id) ? ' now' : '');
    const body = document.createElement('div'), b = document.createElement('b'), s = document.createElement('span');
    b.textContent = c.name; s.textContent = c.desc; body.append(b, s);
    d.append(document.createElement('i'), body);
    el.appendChild(d);
  }
}
let onStart: () => void = () => { };
export function setOnStart(fn: () => void): void { onStart = fn; }
export function startMission(): void {
  initAudio();
  newMission();
  $('brief').hidden = true; $('end').hidden = true; $('intel').hidden = true; $('hudwrap').hidden = false;
  setExtractVisible(false);
  $('hint').classList.remove('hidden');
  music.setMood('festive');
  onStart();
}
export function openIntel(): void {
  if (!G.started || G.ended) return;
  G.paused = true;
  const tl = $('intelTargets'); tl.replaceChildren();
  for (const id of TARGET_IDS) {
    const n = G.byId[id], t = TARGET_INFO[id], d = document.createElement('div');
    d.className = 'itarget ' + (n.alive ? '' : n.escaped ? 'escaped' : 'dead');
    const cv = document.createElement('canvas'), body = document.createElement('div'), b = document.createElement('b'), em = document.createElement('em'), ol = document.createElement('ol');
    b.textContent = t.name; em.textContent = n.alive ? stepLabel(n) : n.escaped ? 'ESCAPED' : 'POPPED';
    t.sched.forEach((s, i) => {
      const ph = PHASES[i], nx = PHASES[i + 1];
      ol.appendChild(li(s, ph && G.T >= ph.t && (!nx || G.T < nx.t) ? 'now' : nx && G.T >= nx.t ? 'past' : ''));
    });
    const loc = document.createElement('button'); loc.className = 'locate'; loc.textContent = 'LOCATE'; loc.hidden = !n.alive;
    loc.onclick = () => { if (n.alive) { G.cam.x = n.x; G.cam.y = n.inBalloon ? 200 : n.y - 10; } closeIntel(); };
    body.append(b, em, ol); d.append(cv, body, loc);
    tl.appendChild(d); portrait(cv, id);
  }
  $('intelOpps').replaceChildren(...OPP_IDS.map(id => {
    const o = OPPS[id], d = document.createElement('div'), b = document.createElement('b'), s = document.createElement('span');
    d.className = 'opp' + (G.disc.has(id) ? ' found' : '');
    b.textContent = G.disc.has(id) ? o.name : '???';
    s.textContent = G.disc.has(id) ? o.hint : 'Linger your scope on interesting things to discover this.';
    d.append(b, s); return d;
  }));
  renderChallenges($('intelCh'), new Set(SAVE.done));
  $('intelJobs').replaceChildren(...G.jobs.map(j => li((j.done ? '✓ ' : '○ ') + j.text, j.done ? 'done' : '')));
  $('intelStats').textContent = `${fmt(MISSION_LEN - G.T)} left · ${G.stats.kills.length} popped · ${G.disc.size}/${OPP_IDS.length} opportunities · ducks ${G.stats.ducks}/6 · flamingos ${G.stats.gnomes}/5`;
  $('intel').hidden = false;
}
let onResume: () => void = () => { };
export function setOnResume(fn: () => void): void { onResume = fn; }
export function closeIntel(): void { $('intel').hidden = true; G.paused = false; onResume(); }

export function endMission(): void {
  if (G.ended) return;
  G.ended = true; G.paused = false; G.survey = false;
  const tg = TARGET_IDS.map(id => G.byId[id]);
  const success = tg.every(n => !n.alive && !n.escaped);
  const st = G.stats;
  if (success && !G.lockdown && st.found === 0) award('ghost');
  if (success && st.kills.length === 3) award('targetsOnly');
  const timeBonus = success ? Math.round((MISSION_LEN - G.T) * 15) : 0;
  const ghostBonus = success && !G.lockdown && st.found === 0 ? 2500 : 0;
  const lockPen = G.lockdown ? -1500 : 0;
  const base = Math.max(0, G.score + timeBonus + ghostBonus + lockPen);
  const final = Math.round(base * (success ? multOf() : 1) * (G.pro ? 1.5 : 1));
  const xp = Math.round(final * (success ? 1 : .4));
  const before = levelOf(SAVE.xp);
  SAVE.xp += xp; SAVE.runs++; if (success) SAVE.wins++;
  const best = final > SAVE.best; if (best) SAVE.best = final;
  persist();
  const after = levelOf(SAVE.xp);
  $('endTitle').innerHTML = success ? 'CONTRACT<br>COMPLETE' : 'THEY<br>GOT AWAY';
  $('rating').textContent = !success ? 'CONTRACT FAILED' : ghostBonus ? 'SUGAR GHOST' : !G.lockdown ? 'PROFESSIONAL' : 'MESSY';
  const rows: [string, string | number][] = [
    ['Targets popped', `${tg.filter(n => !n.alive && !n.escaped).length} / 3`],
    ['Accidents', st.accidents], ['Headshots', st.heads], ['Concealed', st.concealed],
    ['Collateral jellies', st.collateral], ['Guards popped', `${st.guards} / 6`],
    ['Puddles discovered', st.found], ['Accuracy', G.shots ? Math.round(G.hits / G.shots * 100) + '%' : '—'],
    ['Challenges this run', G.run.done.size],
    ['Side jobs', `${G.jobs.filter(j => j.done).length} / ${G.jobs.length}`],
    ...(G.pro ? [['PRO mode', '×1.5'] as [string, string]] : []),
    ['Contract score', G.score.toLocaleString()],
    ['Time bonus', timeBonus ? '+' + timeBonus.toLocaleString() : '—'],
    ['Ghost bonus', ghostBonus ? '+' + ghostBonus.toLocaleString() : '—'],
    ['Lockdown penalty', lockPen ? lockPen.toLocaleString() : '—'],
    ['Challenge multiplier', success ? multOf().toFixed(2) + '×' : 'void (failed)']
  ];
  $('endRows').replaceChildren(...rows.map(([a, b]) => {
    const r = document.createElement('div'), s = document.createElement('span'), v = document.createElement('b');
    s.textContent = a; v.textContent = String(b); r.append(s, v); return r;
  }));
  $('final').textContent = final.toLocaleString() + (best ? '  ★ NEW BEST' : '');
  $('xpgain').textContent = `+${xp.toLocaleString()} XP` + (after > before ? `  ·  RIFLE LEVEL ${after}!` : '');
  $('unlocks').textContent = UNLOCKS.filter(u => u.lvl > before && u.lvl <= after).map(u => 'UNLOCKED: ' + u.text).join('\n');
  $('endCh').replaceChildren(...[...G.run.done].flatMap(id => {
    const c = CHALLENGES.find(c => c.id === id); if (!c) return [];
    const s = document.createElement('span'); s.textContent = '✓ ' + c.name; return [s];
  }));
  setTimeout(() => { $('end').hidden = false; }, 1200);
  music.setMood(success ? 'win' : 'sad');
}

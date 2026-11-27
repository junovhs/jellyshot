/* =====================================================================
   NPCs: every jelly has a schedule, a job, people they care about,
   and a way of freaking out. Plans are lists of timed steps.
   ===================================================================== */
import { CAST_CIVS, CAST_GUARDS, LINES, LOC, PAL, PAL_KEYS, TARGET_IDS, TARGET_INFO, WORLD, isLineKey, type Hat, type HotKey, type ItemKind, type PalKey } from "./data";
import { circ, ell, g, ln, poly, ringS, rrect, txt } from "./draw";
import { award, escapeTarget, killNPC, leave } from "./rules";
import { G, type Dyn, type Look, type NPC, type Reaction, type ReactType, type Step } from "./state";
import { TAU, clamp, dist, pick, rand, type Ellipse, type Pt } from "./util";
import { onDock, waterAt } from "./world";

export const HOT: Record<HotKey, Ellipse> = {
  plaza: { x: 1000, y: 712, rx: 240, ry: 110 },
  stalls: { x: 1000, y: 1108, rx: 230, ry: 46 },
  icecream: { x: 806, y: 872, rx: 70, ry: 32 },
  busker: { x: 1168, y: 836, rx: 80, ry: 34 },
  garden: { x: 1470, y: 650, rx: 110, ry: 60 },
  pondside: { x: 740, y: 960, rx: 66, ry: 50 },
  pie: { x: 560, y: 590, rx: 96, ry: 30 },
  maypoleWatch: { x: 1350, y: 1080, rx: 120, ry: 22 }
};
const HOTNAME: Record<HotKey, string> = { plaza: 'the deck', stalls: 'the drink stands', icecream: 'the ice cream cart', busker: 'Kazoo Kevin', garden: 'the dune grass', pondside: 'the lagoon', pie: 'the BBQ tent', maypoleWatch: 'the volleyball court' };
const SHED_SPOTS: Pt[] = [[1222, 320], [1302, 320], [1262, 340]];
const BENCH_SPOTS: Pt[] = [[1488, 706], [1532, 706], [1510, 724]];
const meet = (i: number) => (): Pt => G.flags.meetBench ? BENCH_SPOTS[i] : SHED_SPOTS[i];

function pointIn(h: Ellipse): Pt {
  for (let k = 0; k < 20; k++) {
    const a = Math.random() * TAU, d = Math.sqrt(Math.random());
    const x = h.x + Math.cos(a) * h.rx * d, y = h.y + Math.sin(a) * h.ry * d;
    if (!waterAt(x, y, 12)) return [x, y];
  }
  return [h.x, h.y];
}

/* ---------- plan builders ---------- */
function targetPlans(): Record<typeof TARGET_IDS[number], Step[]> {
  const ce = () => G.flags.cakeEarly;
  return {
    brayden: [
      { t: 0, at: [1000, 594], act: 'greet', label: 'Hyping $JIGGLE by the foam pit' },
      { t: 50, at: () => ce() ? [1000, 594] : [1000, 300], act: 'speech', lines: () => ce() ? 'speechAlt' : 'speech', label: 'Pitching $JIGGLE' },
      { t: 100, at: [598, 905], act: 'feed', label: 'Showing off a jet ski on the dock' },
      { t: 160, at: [334, 262], act: 'admire', label: 'Filming an ad by the coconut pile' },
      { t: 220, at: meet(0), act: 'whisper', label: 'Splitting the $JIGGLE money' },
      { t: 270, at: [976, 1196], act: 'leave', label: 'Waiting for the shuttle' },
      { t: 288, at: [990, 1302], act: 'leave', exit: true, label: 'Leaving through the gate' }
    ],
    skylar: [
      { t: 0, at: [1665, 284], act: 'idle', label: 'Arriving by parasail' },
      { t: 16, at: [1044, 600], act: 'chat', label: 'Filming Brayden for content' },
      { t: 50, at: () => ce() ? [1046, 598] : [1052, 300], act: 'clap', lines: 'cheer', label: 'Filming the launch' },
      { t: 100, at: [1598, 692], act: 'sniff', label: 'Shooting content under the palms' },
      { t: 160, circle: true, act: 'dance', label: 'In the conga round the net pole' },
      { t: 220, at: meet(1), act: 'whisper', label: 'Splitting the $JIGGLE money' },
      { t: 270, at: () => G.flags.balloonGone ? [1026, 1200] : [1665, 280], act: 'leave', label: () => G.flags.balloonGone ? 'Waiting for the shuttle' : 'Heading to her parasail' },
      { t: 289, at: () => G.flags.balloonGone ? [1012, 1302] : [1665, 280], act: 'leave', exit: true, label: () => G.flags.balloonGone ? 'Leaving through the gate' : 'Strapping into her parasail' }
    ],
    rick: [
      { t: 0, hot: { x: 590, y: 540, rx: 60, ry: 20 }, act: 'inspect', label: 'Collecting "fees" at the BBQ tent' },
      { t: 50, at: () => ce() ? [956, 598] : [948, 300], act: 'clap', lines: 'cheer', label: 'Standing on stage' },
      { t: 100, at: [606, 478], act: 'taste', label: 'Judging the ribs' },
      { t: 160, at: [270, 262], act: 'admire', label: 'Admiring the coconut pile' },
      { t: 220, at: meet(2), act: 'whisper', label: 'Splitting the $JIGGLE money' },
      { t: 270, at: [1024, 1212], act: 'leave', label: 'Waiting for the shuttle' },
      { t: 290, at: [1010, 1302], act: 'leave', exit: true, label: 'Leaving through the gate' }
    ]
  };
}

function attendeePlan(c: { home?: HotKey; alt?: HotKey; dances?: boolean }): Step[] {
  const home = c.home ?? 'plaza', alt = c.alt ?? 'stalls';
  const j = () => rand(0, 8);
  const crowd: Pt = [rand(866, 1134), rand(366, 452)];
  const pie: Pt = [rand(462, 666), rand(548, 606)];
  const view: Pt = [rand(870, 1130), rand(705, 820)];
  const p: Step[] = [
    { t: 0, hot: home, act: 'wander', label: `Browsing ${HOTNAME[home]}` },
    { t: 44 + j(), at: crowd, act: 'cheer', label: 'Watching the $JIGGLE launch' },
    Math.random() < .55 ? { t: 100 + j(), at: pie, act: 'watch', label: 'Watching the BBQ judging' } : { t: 100 + j(), hot: alt, act: 'wander', label: `Wandering ${HOTNAME[alt]}` },
    c.dances ? { t: 158 + j(), circle: true, act: 'dance', label: 'In the conga round the net pole' } : { t: 158 + j(), hot: 'maypoleWatch', act: 'watch', label: 'Watching the volleyball final' },
    { t: 220 + j(), hot: alt, act: 'wander', label: `Wandering ${HOTNAME[alt]}` },
    { t: 266 + j(), at: view, act: 'watch', label: 'Waiting for the fireworks' }
  ];
  return p;
}

export function buildCast(): NPC[] {
  const out: NPC[] = [];
  const TP = targetPlans();
  const tdef: Record<typeof TARGET_IDS[number], { col: PalKey; r: number; hat: Hat; look: Look; item?: ItemKind }> = {
    brayden: { col: 'lemon', r: 17, hat: 'backcap', look: 'crypto', item: 'phone' },
    skylar: { col: 'pink', r: 17, hat: 'sunhat', look: 'influencer', item: 'selfie' },
    rick: { col: 'peach', r: 19, hat: 'captain', look: 'tycoon' }
  };
  for (const id of TARGET_IDS) {
    out.push(mkNPC({ id, kind: 'target', name: TARGET_INFO[id].name, role: 'TARGET · ' + TARGET_INFO[id].short, speed: 64, plan: TP[id], ...tdef[id] }));
  }
  for (const gd of CAST_GUARDS) {
    const plan: Step[] = gd.follow ? [{ t: 0, follow: gd.follow, off: gd.off, act: 'guard', lines: 'bodyguard', label: `Guarding ${TARGET_INFO[gd.follow].name}` }]
      : [{ t: 0, patrol: gd.patrol ?? [], act: 'guard', lines: 'guard', label: 'On patrol' }];
    out.push(mkNPC({ id: gd.id, kind: 'guard', name: gd.name, role: gd.role, col: 'navy', r: 15, hat: 'guard', speed: 50, plan, protects: gd.follow }));
  }
  const circleIds = ['skylar'];
  for (const c of CAST_CIVS) {
    let plan: Step[] = [], extra: Partial<NPC> = {};
    switch (c.plan) {
      case 'attendee': plan = attendeePlan(c); if (c.dances) circleIds.push(c.id); break;
      case 'partner': plan = [{ t: 0, follow: c.who, off: [20, 6], act: 'copy', lines: 'couple', label: `Out with ${CAST_CIVS.find(x => x.id === c.who)?.name}` }]; break;
      case 'kid': {
        const k = out.filter(n => n.parent === c.parent).length + (c.parent === 'praline' ? 2 : 0);
        const f = { follow: c.parent, off: [k % 2 ? 22 : -22, 14] as Pt, act: 'copy', lines: 'kid' as const, label: `Tagging along with ${c.parent === 'gelato' ? 'Mom' : 'Dad'}` };
        plan = [{ t: 0, ...f }];
        for (const bt of [20, 126, 200]) { plan.push({ t: bt + k * 6, at: [762 + k * 16, 846], act: 'buy', label: 'Buying ice cream' }); plan.push({ t: bt + k * 6 + 12, ...f }); }
        extra = { r: 10, speed: 54 };
        break;
      }
      case 'contestant': {
        const s = c.slot ?? 0;
        plan = [
          { t: 0, hot: 'pie', act: 'wander', item: 'pie', label: 'Fussing over a rack of ribs' },
          { t: 44 + rand(0, 6), at: [rand(870, 1130), rand(368, 450)], act: 'cheer', item: 'pie', label: 'Watching the $JIGGLE launch' },
          { t: 98, at: [506 + s * 44, 540], act: 'present', item: 'pie', label: 'Presenting ribs to Big Rick' },
          { t: 160, hot: s % 2 ? 'icecream' : 'stalls', act: 'wander', label: 'Waiting for the results' },
          { t: 222, hot: 'plaza', act: 'wander', label: 'Gossiping on the deck' },
          { t: 266, at: [rand(870, 1130), rand(705, 820)], act: 'watch', label: 'Waiting for the fireworks' }
        ];
        break;
      }
      case 'vendor': plan = [{ t: 0, at: c.at, act: c.act ?? 'idle', lines: c.lines, label: c.label ?? '' }];
        if (c.id === 'bill') plan.push({ t: 158, at: [1452, 952], act: 'music', lines: 'music', label: 'Playing for the conga' }, { t: 222, at: c.at, act: 'music', lines: 'music', label: 'Playing the ukulele' });
        break;
      case 'dancer': { const sl = c.slot ?? 0; plan = [
        { t: 0, at: [1118 + sl * 46, 820], act: 'dance', label: 'Dancing to the ukulele' },
        { t: 156, circle: true, act: 'dance', label: 'In the conga round the net pole' },
        { t: 224, at: [1118 + sl * 46, 820], act: 'dance', label: 'Dancing to the ukulele' },
        { t: 266, at: [rand(870, 1130), rand(705, 820)], act: 'watch', label: 'Waiting for the fireworks' }];
        circleIds.push(c.id); break; }
      case 'fisher': plan = [{ t: 0, at: [534, 902], act: 'fish', label: 'Fishing off the dock' }, { t: 205, at: [534, 902], act: 'sleep', label: 'Napping on the dock' }]; break;
      case 'gardener': plan = [{ t: 0, patrol: [[1440, 600], [1560, 640], [1660, 700], [1480, 740], [1700, 560]], act: 'water', lines: 'garden', label: 'Sweeping the dunes with a metal detector' }]; break;
      case 'crane': plan = [
        { t: 0, at: [1150, 316], act: 'crane', label: 'Minding the coin rope' },
        { t: 98, at: [1236, 300], act: 'tinker', label: 'Prepping the fireworks' },
        { t: 212, hot: 'stalls', act: 'wander', label: 'On a very long break' },
        { t: 266, at: [1000, 380], act: 'watch', label: 'Waiting to light the fireworks' }]; break;
      case 'mc': plan = [
        { t: 0, hot: 'plaza', act: 'wander', label: 'Warming up the crowd' },
        { t: 44, at: [928, 300], act: 'mc', label: 'Hosting the $JIGGLE launch' },
        { t: 100, at: [646, 524], act: 'mc', label: 'Announcing the BBQ judging' },
        { t: 160, at: [1270, 1040], act: 'cheer', label: 'Hyping the volleyball final' },
        { t: 222, hot: 'plaza', act: 'wander', label: 'Mingling' },
        { t: 266, at: [1000, 360], act: 'mc', label: 'Announcing the fireworks' }]; break;
      case 'follow': plan = [{ t: 0, follow: c.who, off: c.off, act: c.act ?? 'idle', lines: c.lines, label: c.label ?? '' }]; break;
    }
    out.push(mkNPC({
      id: c.id, kind: c.kid ? 'kid' : 'civ', name: c.name, role: c.role, col: c.col, hat: c.hat, r: rand(12.5, 15), speed: rand(38, 46),
      plan, partner: c.partner, parent: c.parent, item: c.item, lines: c.lines, ...extra
    }));
  }
  // conga ring slots round the net pole
  circleIds.forEach((id, i) => { const n = out.find(o => o.id === id); if (n) n.ring = i / circleIds.length * TAU; });
  // children know their parents and vice versa
  for (const n of out) if (n.parent) { const p = out.find(o => o.id === n.parent); if (p) (p.kids ||= []).push(n.id); }
  return out;
}

export type NPCInit = Pick<NPC, 'id' | 'col'> & Partial<NPC>;
export function mkNPC(o: NPCInit): NPC {
  const n: NPC = {
    alive: true, x: 0, y: 0, r: 14, speed: 42, react: null, plan: [], stepI: -1, step: null, wander: null, pause: 0, pi: 0,
    acting: 'idle', face: 1, sayT: rand(1, 7), bubble: null, phase: rand(0, TAU), vx: 0, vy: 0, hasCone: false, kind: 'civ',
    balloons: 6, inBalloon: false, dying: 0, kb: null, startled: 0, moving: 0, replyT: 0, name: '', role: '',
    ...o
  };
  if (n.item === 'bunch') n.balloons = 6;
  return n;
}

export function placeAtStart(n: NPC): void {
  const s = n.plan[0];
  let p: Pt;
  if (s.follow) { const l = G.byId[s.follow]; const off = s.off ?? [0, 0]; placeAtStart(l); p = [l.x + off[0], l.y + off[1]]; }
  else if (s.patrol) p = s.patrol[0];
  else if (s.circle) p = [1350, 968];
  else if (s.hot) p = pointIn(typeof s.hot === 'string' ? HOT[s.hot] : s.hot);
  else p = s.at ? val(s.at) : [n.x, n.y];
  n.x = p[0] + rand(-2, 2); n.y = p[1] + rand(-2, 2);
}

export const val = <T,>(v: Dyn<T>): T => typeof v === 'function' ? (v as () => T)() : v;
export function stepLabel(n: NPC): string {
  if (!n.alive) return n.escaped ? 'Escaped' : 'Popped';
  if (n.inBalloon) return G.byId.skylar === n && G.T > 200 ? 'Leaving by parasail' : 'Arriving by parasail';
  if (n.react) return ({ investigate: 'Investigating a noise', panic: 'Panicking', mourn: 'Grieving', guard: 'Securing a puddle', argue: 'Demanding a refund', sad: 'Crying', bees: 'Fleeing seagulls!', fall: 'Falling', flee: 'Fleeing!', cower: 'Cowering', look: 'Shocked', chase: 'Chasing balloons', dazed: 'Dazed', lost: 'Looking for someone' } as Partial<Record<ReactType, string>>)[n.react.type] || 'Distracted';
  return val(n.step?.label) || 'Enjoying spring break';
}

/* ---------- reactions ---------- */
export function react(n: NPC, type: ReactType, o: Partial<Reaction> = {}): void {
  if (!n.alive || n.dying) return;
  const cur = n.react;
  const prio: Record<ReactType, number> = { fall: 9, bees: 8, flee: 7, mourn: 6, guard: 5, panic: 4, argue: 4, chase: 3, dazed: 3, cower: 3, sad: 2, look: 2, investigate: 1, lost: 1 };
  if (cur && prio[cur.type] > prio[type] && cur.type !== 'investigate') return;
  n.react = { type, time: 6, at: G.T, ...o };
  n.wander = null;
}

export function updateNPC(n: NPC, dt: number): void {
  if (!n.alive) return;
  if (n.inBalloon) { n.x = 1665; n.y = 280; n.acting = 'idle'; tickSpeech(n, dt); return; }
  // knockback from fizz rounds
  if (n.kb) {
    n.x += n.kb.vx * dt; n.y += n.kb.vy * dt; n.kb.vx *= .9; n.kb.vy *= .9; n.kb.t -= dt; n.acting = 'dazed';
    if (waterAt(n.x, n.y) && !onDock(n.x, n.y)) { n.kb = null; G.stats.fizzDunk = true; award('fizz'); killNPC(n, { cause: 'dunk', accident: true }); return; }
    if (n.kb.t <= 0) { n.kb = null; react(n, 'dazed', { time: 1.8, x: n.kbx, y: n.kby }); }
    n.x = clamp(n.x, 20, WORLD.w - 20); n.y = clamp(n.y, 20, WORLD.h - 20);
    return;
  }
  if (n.dying) {
    n.dying -= dt; n.sink = Math.min(1, (n.sink || 0) + dt * 1.6);
    if (n.dying <= 0) { n.dying = 0; killNPC(n, { cause: n.fallCause || 'dock', accident: true, concealed: true }); }
    return;
  }

  if (n.pose) { n.poseT = (n.poseT ?? 0) - dt; if (n.poseT <= 0 || n.react) n.pose = null; else { n.acting = 'idle'; n.moving = 0; tickSpeech(n, dt); return; } }
  let goal: Pt | null = null, act = 'idle', spd = n.speed;
  const R = n.react;
  if (R) {
    R.time -= dt;
    const rx = R.x ?? n.x, ry = R.y ?? n.y;
    switch (R.type) {
      case 'investigate': goal = [rx + (R.ox ||= rand(-18, 18)), ry + (R.oy ||= rand(-8, 8))]; act = 'look'; spd *= 1.15; break;
      case 'panic': if (!R.g) { const dx = n.x - rx, dy = n.y - ry, d = Math.hypot(dx, dy) || 1; R.g = [clamp(n.x + dx / d * 170, 40, WORLD.w - 40), clamp(n.y + dy / d * 120, 40, WORLD.h - 40)]; } goal = R.g; act = 'panic'; spd = 110; break;
      case 'mourn': goal = [rx + (R.ox ||= rand(-22, 22)), ry - 10]; act = 'mourn'; break;
      case 'guard': goal = [rx + (R.ox ||= rand(-30, 30)), ry + (R.oy ||= rand(-16, 16))]; act = 'alert'; spd = 80; break;
      case 'argue': goal = [rx + (R.ox ||= rand(-14, 14)), ry]; act = 'argue'; spd = 70; break;
      case 'sad': act = 'sad'; break;
      case 'look': act = 'look'; break;
      case 'cower': act = 'cower'; break;
      case 'dazed': act = 'dazed'; if (R.time <= 0 && R.x != null) { n.react = null; react(n, 'investigate', { x: rx, y: ry, time: 5 }); return; } break;
      case 'chase': goal = [rx, ry]; act = 'panic'; spd = 90; break;
      case 'lost': { const lg: Pt = R.g ||= [rx + rand(-60, 60), ry + rand(-40, 40)]; goal = lg; act = 'sad'; if (dist(n.x, n.y, ...lg) < 6) R.g = null; break; }
      case 'bees': goal = [1560 + (R.ox ||= rand(-30, 30)), 770]; act = 'panic'; spd = 135; R.time = 99;
        if (Math.random() < dt * 1.5) say(n, pick(LINES.bees), 1);
        if (waterAt(n.x, n.y)?.id === 'lily') { killNPC(n, { cause: 'bees', accident: true, concealed: true }); return; }
        break;
      case 'flee': { const fg: Pt = R.g ?? [1000, 1296]; goal = fg; act = 'panic'; spd = n.kind === 'target' ? 52 : 110; R.time = 99;
        if (dist(n.x, n.y, ...fg) < 14) { if (n.kind === 'target') { if (n.id === 'skylar' && R.balloon) { /* balloon handles boarding */ } else return escapeTarget(n); } else return leave(n); }
        break;
      }
    }
    if (R.type === 'guard' && R.time <= 0 && R.p && !R.p.secured) { R.p.secured = true; say(n, pick(['Area secured.', 'Nobody touch the puddle.', 'Cordoned off.']), 2); }
    if (R.type !== 'bees' && R.type !== 'flee' && R.time <= 0) { n.react = null; n.stepI = -1; }
  }
  if (!n.react) {
    // ---- scheduled behaviour ----
    let i = 0; for (let k = 0; k < n.plan.length; k++) if (n.plan[k].t <= G.T) i = k;
    if (i !== n.stepI || !n.step) { n.stepI = i; n.step = n.plan[i]; n.wander = null; n.pause = 0; n.pi = 0; if (n.step.item !== undefined || n.kind !== 'kid') n.carry = n.step.item; }
    const s = n.step;
    act = s.act;
    if (s.follow) {
      const l = G.byId[s.follow];
      if (l && l.alive && !l.inBalloon) {
        const side = l.face < 0 ? -1 : 1;
        const off = s.off ?? [0, 0];
        goal = [l.x + off[0] * (off[0] && n.kind === 'guard' ? 1 : side), l.y + off[1]];
        if (act === 'copy') act = l.acting === 'walk' ? 'idle' : l.acting;
        spd = Math.max(n.speed, l.react?.type === 'flee' ? 100 : l.speed * 1.1);
        if (l.react?.type === 'flee') spd = 100;
      } else if (l && l.inBalloon) { goal = [1640, 300]; act = 'look'; }
      else { // lost their person
        act = 'sad'; const lg: Pt = n.lostG ||= [n.x + rand(-50, 50), n.y + rand(-30, 30)]; goal = lg;
        if (dist(n.x, n.y, ...lg) < 5) n.lostG = null;
      }
    } else if (s.circle) {
      if (G.flags.maypoleDown) { goal = n.circG ||= pointIn(HOT.maypoleWatch); act = 'look'; }
      else { const a = (n.ring ?? 0) + G.T * .55; goal = [1350 + Math.cos(a) * 78, 968 + Math.sin(a) * 44]; spd = n.speed * 1.6; if (G.flags.banjoBroken && G.T > 158) act = 'boo'; }
    } else if (s.patrol) {
      const pg = s.patrol[n.pi % s.patrol.length]; goal = pg;
      if (dist(n.x, n.y, ...pg) < 6) { n.pause += dt; act = s.act; if (n.pause > 1.6) { n.pause = 0; n.pi++; } }
    } else if (s.hot) {
      const h = typeof s.hot === 'string' ? HOT[s.hot] : s.hot;
      const wg = n.wander ||= pointIn(h); goal = wg;
      if (dist(n.x, n.y, ...wg) < 6) { n.pause += dt; act = s.act === 'wander' ? 'idle' : s.act; if (n.pause > (n.pauseLen ||= rand(2, 6))) { n.pause = 0; n.pauseLen = 0; n.wander = pointIn(h); } }
    } else {
      const ag = s.at ? val(s.at) : [n.x, n.y] as Pt; goal = ag;
      if (s.exit) { spd = 28; if (n.kind === 'target' && n.y > 1288) return escapeTarget(n); }
      if (s.act === 'buy' && dist(n.x, n.y, ...ag) < 8) { n.pause += dt; if (n.pause > 2.4 && !n.hasCone) { n.hasCone = true; say(n, pick(LINES.kidCone), 2); } }
    }
    // dancers boo when the banjo is broken
    if (G.flags.banjoBroken && act === 'dance' && n.step && !s.circle && dist(n.x, n.y, LOC.busker.x, LOC.busker.y) < 140) act = 'boo';
    if (n.id === 'bill' && G.flags.banjoBroken) act = 'sad';
    if (n.id === 'finn' && G.flags.fishCaught && act === 'fish') act = 'idle';
  }

  // ---- movement ----
  if (goal) {
    const dx = goal[0] - n.x, dy = goal[1] - n.y, d = Math.hypot(dx, dy);
    if (d > 3) {
      const st = Math.min(d, spd * dt);
      n.x += dx / d * st; n.y += dy / d * st;
      n.vx = dx / d * spd; n.vy = dy / d * spd;
      if (Math.abs(dx) > 2) n.face = dx > 0 ? 1 : -1;
      n.moving = spd; if (d > 8 && !['panic', 'alert', 'argue'].includes(act) && !(n.step?.circle && !n.react)) act = 'walk';
    } else { n.moving = 0; n.vx = n.vy = 0; }
  } else n.moving = 0;
  if (n.step?.circle && !n.react && !G.flags.maypoleDown) n.moving = 30;
  // keep dry unless falling in
  if (!(R && R.type === 'bees')) {
    const w = waterAt(n.x, n.y);
    if (w && !onDock(n.x, n.y)) {
      const dx = (n.x - w.x) / w.rx, dy = (n.y - w.y) / w.ry, m = Math.hypot(dx, dy) || 1;
      n.x = w.x + dx / m * w.rx * 1.02; n.y = w.y + dy / m * w.ry * 1.02;
    }
  }
  n.acting = act;
  tickSpeech(n, dt);
}

function tickSpeech(n: NPC, dt: number): void {
  if (n.bubble) { n.bubble.life -= dt; if (n.bubble.life <= 0) n.bubble = null; }
  if (n.replyT > 0) { n.replyT -= dt; if (n.replyT <= 0 && n.alive && !n.react) say(n, pick(LINES[n.replyPool ?? 'chat']), 2.4); }
  n.sayT -= dt;
  if (n.sayT <= 0) {
    n.sayT = rand(5, 11);
    if (!n.alive || n.acting === 'walk') return;
    const pool = linePool(n);
    if (pool && Math.random() < .75) {
      say(n, pick(pool), 2.6);
      if (pool === LINES.chat || pool === LINES.couple) {
        const o = G.npcs.find(m => m !== n && m.alive && !m.react && m.kind !== 'target' && dist(m.x, m.y, n.x, n.y) < 46 && !m.bubble);
        if (o) { o.replyT = 1.4; o.replyPool = pool === LINES.couple ? 'couple' : 'chat'; }
      }
    }
  }
}
function linePool(n: NPC): readonly string[] | null {
  const a = n.acting;
  if (n.react) {
    const t = n.react.type;
    if (t === 'mourn') return n.kind === 'kid' ? LINES.mournKid : LINES.mourn;
    if (t === 'flee') return n.kind === 'target' ? LINES.flee : LINES.panic;
    if (t === 'cower') return LINES.lockdownCiv;
    if (t === 'investigate') return LINES.investigate;
    if (t === 'guard') return LINES.guardAlert;
    if (t === 'argue') return n.id === 'sam' ? LINES.argueBack : LINES.argue;
    if (t === 'sad' || t === 'lost') return n.kind === 'kid' ? LINES.mournKid : LINES.sad;
    if (t === 'dazed') return LINES.dazed;
    if (t === 'chase') return LINES.vendorChase;
    if (t === 'look') return LINES.shocked;
    if (t === 'bees') return LINES.bees;
    if (t === 'fall') return null;
    return LINES.panic;
  }
  const s = n.step; const l = s?.lines !== undefined ? val(s.lines) : undefined;
  if (n.id === 'doris' && Math.random() < .5) return LINES.client;
  if (n.id === 'bill' && G.flags.banjoBroken) return LINES.sadBusker;
  if (a === 'boo') return LINES.boo;
  if (isLineKey(l)) return LINES[l];
  if (isLineKey(n.lines)) return LINES[n.lines];
  if (n.kind === 'kid') return n.hasCone ? LINES.kidCone : LINES.kid;
  return ({ greet: LINES.greet, speech: LINES.speech, chat: LINES.chat, cheer: LINES.cheer, clap: LINES.cheer, watch: LINES.watch, present: LINES.present, taste: LINES.taste, inspect: LINES.inspect, dance: LINES.dance, music: LINES.music, fish: LINES.fish, water: LINES.garden, photo: LINES.photo, guard: n.protects ? LINES.bodyguard : LINES.guard, idle: n.partner ? LINES.couple : LINES.chat, feed: LINES.feed, admire: LINES.admire, whisper: LINES.whisper, leave: LINES.leave, sniff: LINES.sniff, crane: LINES.crane, tinker: LINES.tinker, mc: LINES.mc, sleep: LINES.sleep, sad: LINES.sad, look: LINES.investigate } as Record<string, string[]>)[a] || null;
}
export function say(n: NPC | null | undefined, t: string, life = 2.6): void { if (!n || !n.alive) return; n.bubble = { t, life, max: life }; }

/* ---------- held items (world-space hit points) ---------- */
export function itemPos(n: NPC): Pt { const hop = n.hopNow || 0; return [n.x + n.face * n.r * 1.0, n.y - n.r * .35 - hop]; }
export function conePos(n: NPC): Pt { const [x, y] = itemPos(n); return [x, y - 9]; }
export function bunchPos(n: NPC, i: number): Pt { const s = n.face; const bx = n.x + s * n.r * 1.25, by = n.y - n.r * 4.2 - (n.hopNow || 0); const o = ([[0, 0], [-10, 4], [10, 4], [-5, -9], [6, -10], [0, 12]] as Pt[])[i]; return [bx + o[0] + Math.sin(G.clock * 1.5 + i) * 2, by + o[1]]; }
export const BOBBER: Pt = [470, 922];

/* ---------- drawing ---------- */
export function drawNPC(n: NPC, lift = 0): void {
  const r = n.r, c = PAL[n.col], a = n.acting, t = G.clock;
  let bob = Math.sin(t * 11 + n.phase), hop = 0, sx = 1, sy = 1, jitter = 0, rot = 0;
  if (a === 'walk' || n.moving) hop = Math.abs(bob) * 2.2;
  else bob = Math.sin(t * 3 + n.phase) * .5;
  if (a === 'dance') { hop = Math.abs(Math.sin(t * 7 + n.phase)) * 7; rot = Math.sin(t * 3.5 + n.phase) * .18; }
  if (a === 'cheer' || a === 'clap') hop = Math.max(0, Math.sin(t * 6 + n.phase)) * 5;
  if (a === 'panic' || a === 'alert') { jitter = rand(-1.2, 1.2); hop = Math.abs(Math.sin(t * 18 + n.phase)) * 3; }
  if (a === 'speech' || a === 'greet' || a === 'mc') { hop = Math.max(0, Math.sin(t * 4 + n.phase)) * 3; sy = 1 + Math.sin(t * 8) * .03; }
  if (a === 'mourn' || a === 'sad') { sy = .86; sx = 1.08; }
  if (a === 'cower') { sy = .74 + Math.sin(t * 30) * .03; sx = 1.14; }
  if (a === 'sleep') { sy = .92 + Math.sin(t * 1.5) * .03; }
  if (a === 'argue') { hop = Math.abs(Math.sin(t * 9)) * 4; }
  if (a === 'boo') { sy = .92; }
  if (n.pose === 'kneel') { sy = .78; sx = 1.1; hop = 0; }
  if (n.startled > 0) { hop += n.startled * 8; }
  n.hopNow = hop + lift;
  const y = n.y - hop - lift;
  if (!lift) ell(n.x, n.y + r * .29, r * .82, r * .28, '#674a782e');
  g.save();
  g.translate(n.x + jitter, y);
  if (n.sink) { g.beginPath(); g.rect(-r * 3, -r * 6, r * 6, r * 6 + r * .4 - n.sink * r * 1.6); g.clip(); g.translate(0, n.sink * r * 1.4); }
  g.rotate(rot); g.scale(sx, sy);
  const f = n.face;
  // feet
  ell(-r * .48, r * .25, r * .27, r * .28 + bob * 1.4, c[2]);
  ell(r * .48, r * .25, r * .27, r * .28 - bob * 1.4, c[2]);
  // body
  const grad = g.createLinearGradient(-r, -r, r, r * .5);
  grad.addColorStop(0, c[1]); grad.addColorStop(.4, c[0]); grad.addColorStop(1, c[2]);
  g.beginPath(); g.moveTo(-r * .94, r * .03);
  g.bezierCurveTo(-r * 1.15, -r * 1.44, r * 1.08, -r * 1.56, r, r * .03);
  g.bezierCurveTo(r * .91, r * .49, -r * .91, r * .49, -r * .94, r * .03);
  g.fillStyle = grad; g.fill();
  ell(-r * .28, -r * .86, r * .39, r * .14, '#ffffffb5');
  if (n.look === 'tycoon') {   // Hawaiian shirt over the lower body
    g.save(); g.beginPath(); g.moveTo(-r * .94, r * .03);
    g.bezierCurveTo(-r * 1.15, -r * 1.44, r * 1.08, -r * 1.56, r, r * .03);
    g.bezierCurveTo(r * .91, r * .49, -r * .91, r * .49, -r * .94, r * .03); g.clip();
    g.fillStyle = '#2fc4a8'; g.fillRect(-r * 1.2, r * .1, r * 2.4, r * .5);
    for (const [fx, fy, fc] of [[-.62, .2, '#ff86b0'], [-.15, .3, '#ffe066'], [.35, .22, '#ff86b0'], [.75, .14, '#ffe066']] as [number, number, string][]) { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circ(r * fx + Math.cos(a) * r * .08, r * fy + Math.sin(a) * r * .08, r * .065, fc); } circ(r * fx, r * fy, r * .045, '#fffaf2'); }
    g.restore();
  }
  if (n.look === 'crypto') {   // gold chain with a $ coin
    for (let k = -4; k <= 4; k++) { const t = k / 4; circ(f * r * .12 + t * r * .5, r * .12 + (1 - t * t) * r * .12, r * .055, '#ffd36b'); }
    circ(f * r * .12, r * .3, r * .13, '#ffcc4c'); txt('$', f * r * .12, r * .31, r * .2, '#b5851e');
  }
  if (n.kind === 'guard') { rrect(-r * .7, -r * .1, r * 1.4, r * .26, 3, '#2a3a7a'); circ(r * .35, -r * .5, r * .13, '#ffd36b'); }
  // face
  const ex = f * r * .25;
  if (a === 'sleep') { for (const k of [-1, 1]) ln(ex + k * r * .27 - r * .12, -r * .38, ex + k * r * .27 + r * .12, -r * .38, '#50334f', 1.6); }
  else if (a === 'dazed') { for (const k of [-1, 1]) { txt('×', ex + k * r * .27, -r * .38, r * .45, '#50334f'); } }
  else {
    const big = a === 'panic' || a === 'look' || a === 'alert' || n.startled > 0 ? 1.25 : 1;
    for (const k of [-1, 1]) {
      ell(ex + k * r * .27, -r * .38, r * .21 * big, r * .24 * big, '#fffaf7');
      const lookY = a === 'speech' ? -.42 : -.36;
      circ(ex + k * r * .27 + f * 1.3, r * lookY, r * .092 * (big > 1 ? .8 : 1), '#50334f');
    }
    if (a === 'mourn' || a === 'sad' || a === 'boo') for (const k of [-1, 1]) ln(ex + k * r * .27 - r * .15, -r * .62 - k * r * .05, ex + k * r * .27 + r * .15, -r * .62 + k * r * .05, '#50334f', 1.4);
    if (a === 'argue' || (n.kind === 'guard' && a === 'alert')) for (const k of [-1, 1]) ln(ex + k * r * .27 - r * .15, -r * .64 + k * r * .06, ex + k * r * .27 + r * .15, -r * .64 - k * r * .06, '#50334f', 1.6);
  }
  if (n.look === 'crypto') { for (const k of [-1, 1]) { ell(ex + k * r * .27, -r * .37, r * .23, r * .19, '#2a2035'); ell(ex + k * r * .27 - r * .07, -r * .43, r * .07, r * .04, '#ffffff66'); } rrect(ex - r * .08, -r * .47, r * .16, r * .05, 1, '#ffd36b'); }
  if (n.look === 'influencer') { for (const k of [-1, 1]) { const cx = ex + k * r * .27; poly([cx + k * r * .1, -r * .5, cx + k * r * .34, -r * .6, cx + k * r * .26, -r * .36], '#ff4f9a'); ell(cx, -r * .4, r * .22, r * .16, '#ff4f9a'); ell(cx, -r * .4, r * .17, r * .12, '#3a1030'); ell(cx - r * .06, -r * .44, r * .05, r * .03, '#ffffff77'); } }
  // mouth
  if (a === 'panic' || a === 'look' || a === 'cower' || a === 'bees') ell(ex, -r * .05, r * .13, r * .13, '#65354d');
  else if (a === 'mourn' || a === 'sad' || a === 'boo') { g.beginPath(); g.arc(ex, r * .06, r * .14, Math.PI * 1.15, Math.PI * 1.85); g.strokeStyle = '#65354d'; g.lineWidth = 1.6; g.stroke(); }
  else if (a === 'dance' || a === 'cheer' || a === 'greet' || a === 'speech' || a === 'clap') { g.beginPath(); g.arc(ex, -r * .1, r * .15, .1, Math.PI - .1); g.fillStyle = '#65354d'; g.fill(); }
  else if (a === 'taste') ell(ex, -r * .02, r * .14, r * .09 + Math.abs(Math.sin(t * 9)) * r * .05, '#65354d');
  else ell(ex, -r * .01, r * .16, r * .071, '#65354d99');
  if (n.look === 'tycoon') { const cx = f > 0 ? ex + r * .08 : ex - r * .5; rrect(cx, -r * .06, r * .42, r * .1, r * .04, '#8a5a3a'); circ(f > 0 ? cx + r * .42 : cx, -r * .01, r * .06, '#ff7a3a'); const ph = (t * .7 + n.phase) % 1; circ((f > 0 ? cx + r * .44 : cx - r * .02) + Math.sin(t * 2) * 2, -r * .1 - ph * r * .9, r * (.06 + ph * .1), `rgba(255,255,255,${.5 * (1 - ph)})`); }
  if (n.kind === 'kid' || n.id === 'gloria' || n.id === 'clem') { ell(ex - r * .5, -r * .16, r * .12, r * .07, '#ff7fa866'); ell(ex + r * .5, -r * .16, r * .12, r * .07, '#ff7fa866'); }
  // tears / sweat
  if (a === 'mourn' || a === 'sad') for (const k of [-1, 1]) { const ty = ((t * 1.6 + k * .3) % 1) * r * .9; ell(ex + k * r * .36, -r * .2 + ty, r * .07, r * .11, '#7fd9ff'); }
  if (a === 'panic' || a === 'alert') ell(-f * r * .7, -r * .9 + Math.sin(t * 10) * 2, r * .1, r * .16, '#c1f6ff');
  drawItem(n, r, f, a);
  if (n.hat && n.hat !== 'none') drawHat(n.hat, r);
  g.restore();
  // effects above head
  const top = y - r * 1.5 - (n.hat === 'tophat' || n.hat === 'chef' ? r * .9 : n.hat && n.hat !== 'none' ? r * .4 : 0);
  if (a === 'sleep') txt('z', n.x + 10 + Math.sin(t * 2) * 3, top - 6 - (t * 8 % 12), 9, '#7a5a8a');
  if (a === 'dazed') for (let i = 0; i < 3; i++) { const an = t * 5 + i * TAU / 3; txt('✦', n.x + Math.cos(an) * r * .8, top + Math.sin(an) * 3, 8, '#ffcc4c'); }
  if (a === 'music' && !G.flags.banjoBroken && Math.sin(t * 2 + n.phase) > 0) txt('♪', n.x + 14 + Math.sin(t * 3) * 4, top - ((t * 14) % 20), 12, '#a8608d');
  if (a === 'photo' && Math.sin(t * 2.3 + n.phase) > .97) circ(n.x + n.face * r, y - r * .5, 10, '#ffffffdd');
  if (n.warn && n.alive) { const wx = n.x + (n.kind === 'target' ? 16 : 0), wy = top - 16; ringS(wx, wy, 7, '#ffe06688', 2); g.beginPath(); g.moveTo(wx, wy); g.arc(wx, wy, 7, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, n.warn)); g.closePath(); g.fillStyle = '#ffe066cc'; g.fill(); txt('?', wx, wy + .5, 9, '#50334f'); }
  if (n.kind === 'target' && !lift) {
    const my = top - 12 + Math.sin(t * 4) * 2;
    poly([n.x - 6, my - 6, n.x + 6, my - 6, n.x, my + 2], '#ff3d6e');
    poly([n.x - 3.5, my - 5, n.x + 3.5, my - 5, n.x, my - .5], '#ffd0dc');
  }
  if (n.kind === 'target' && lift) { const my = top - 12; poly([n.x - 6, my - 6, n.x + 6, my - 6, n.x, my + 2], '#ff3d6e'); }
}

function drawItem(n: NPC, r: number, f: number, a: string): void {
  const it = n.carry || n.item;
  const ix = f * r * 1.0, iy = -r * .35;
  if (n.hasCone) {
    poly([ix - 4, iy - 4, ix + 4, iy - 4, ix, iy + 8], '#e7b06a');
    circ(ix, iy - 8, 5.5, ['#ffd0e5', '#fff5b0', '#c1f6ff', '#d9ffb0'][n.id.length % 4]); circ(ix - 1.5, iy - 10, 1.4, '#e0457a');
  }
  if (!it) return;
  if (it === 'pie') { ell(ix, iy, 10, 3.5, '#fffaf2'); rrect(ix - 7, iy - 4.5, 14, 5, 2, '#9a4a2a'); for (let k = 0; k < 4; k++) rrect(ix - 6 + k * 3.6, iy - 6, 1.6, 3, .8, '#fff3df'); }
  else if (it === 'phone') { rrect(ix - 3.5, iy - 7, 7, 11, 1.5, '#2a2035'); rrect(ix - 2.5, iy - 6, 5, 8, 1, Math.sin(G.clock * 3 + n.phase) > 0 ? '#7fd9ff' : '#ffe066'); }
  else if (it === 'selfie') { const sx = ix + f * r * .9, sy = iy - r * 1.7; ln(ix, iy, sx, sy, '#c8c8d0', 2); rrect(sx - 4, sy - 6, 8, 11, 1.5, '#ff86b0'); rrect(sx - 3, sy - 5, 6, 8, 1, '#c1f6ff'); if (Math.sin(G.clock * 2.6 + n.phase) > .96) circ(sx, sy - 1, 7, '#ffffffcc'); }
  else if (it === 'banjo') {
    if (G.flags.banjoBroken) { circ(ix, iy + 2, 7, '#e8b48a'); ln(ix, iy, ix + f * 4, iy - 14, '#a8704f', 2.5); ln(ix + f * 4, iy - 14, ix + f * 12, iy - 18, '#fff', 1); return; }
    ln(ix, iy, ix + f * 6, iy - 18, '#a8704f', 3); circ(ix, iy + 2, 7.5, '#e8b48a'); circ(ix, iy + 2, 5, '#fff3df');
  }
  else if (it === 'rod') {
    const tx = ix + f * r * 1.6, ty = iy - r * 2;
    ln(ix, iy, tx, ty, '#a8704f', 2);
    if (!G.flags.fishCaught && a === 'fish') { const bx = BOBBER[0] - n.x, by = BOBBER[1] - n.y + (n.hopNow || 0); g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + bx) / 2, ty + 20, bx, by); g.strokeStyle = '#ffffffaa'; g.lineWidth = 1; g.stroke(); }
    if (G.flags.fishCaught) { rrect(tx - 4, ty + 2, 8, 10, 2, '#6b4a3a'); rrect(tx - 4, ty + 9, 11, 4, 2, '#6b4a3a'); }
  }
  else if (it === 'can') { const dx = ix + f * r * .9 + Math.sin(G.clock * 2 + n.phase) * 3, dy = r * .3; ln(ix, iy, dx, dy, '#9aa0b0', 2); ell(dx, dy, 6, 2.5, '#5a6070'); rrect(ix - 2, iy - 1, 5, 5, 1.5, '#ffcc4c'); if (a === 'water' && Math.sin(G.clock * 5) > .7) txt('beep', dx, dy - 12, 6, '#50334f'); }
  else if (it === 'camera') { rrect(ix - 6, iy - 5, 12, 9, 2, '#50334f'); circ(ix, iy - .5, 3, '#c1f6ff'); }
  else if (it === 'bunch') {
    for (let i = 0; i < 6; i++) {
      if (i >= n.balloons) continue;
      const [wx, wy] = bunchPos(n, i), bx = wx - n.x, by = wy - n.y + (n.hopNow || 0);
      ln(ix, iy, bx, by + 8, '#ffffff99', 1);
      ell(bx, by, 7, 8.5, PAL[PAL_KEYS[i]][0]); ell(bx - 2, by - 3, 2, 3, '#ffffffaa');
    }
  }
}

export function drawHat(type: Hat, r: number, ox = 0, oy: number | null = null, s = 1): void {
  g.save(); g.translate(ox, oy ?? -r * 1.02); g.scale(s, s);
  switch (type) {
    case 'tophat': rrect(-r * .55, -r * .05, r * 1.1, r * .16, 3, '#2a2035'); rrect(-r * .36, -r * .9, r * .72, r * .9, 3, '#2a2035'); rrect(-r * .36, -r * .3, r * .72, r * .14, 0, '#ff5c9e'); break;
    case 'tophat2': rrect(-r * .5, -r * .05, r * 1, r * .14, 3, '#5b3a7a'); rrect(-r * .32, -r * .66, r * .64, r * .64, 3, '#5b3a7a'); rrect(-r * .32, -r * .22, r * .64, r * .1, 0, '#ffd36b'); break;
    case 'tiara': poly([-r * .4, 0, -r * .3, -r * .4, -r * .12, -r * .14, 0, -r * .5, r * .12, -r * .14, r * .3, -r * .4, r * .4, 0], '#ffd36b'); circ(0, -r * .18, r * .1, '#7fd9ff'); break;
    case 'chef': rrect(-r * .38, -r * .2, r * .76, r * .26, 4, '#fff'); circ(-r * .25, -r * .45, r * .3, '#fff'); circ(r * .25, -r * .45, r * .3, '#fff'); circ(0, -r * .7, r * .34, '#fff'); ell(-r * .2, -r * .8, r * .12, r * .06, '#f0e8ff'); break;
    case 'guard': ell(0, -r * .02, r * .55, r * .14, '#2a3a7a'); g.beginPath(); g.ellipse(0, -r * .06, r * .42, r * .5, 0, Math.PI, 0); g.fillStyle = '#3a4fae'; g.fill(); circ(0, -r * .3, r * .1, '#ffd36b'); circ(0, -r * .58, r * .08, '#c1d0ff'); break;
    case 'bow': ell(-r * .22, -r * .05, r * .22, r * .14, '#ff5c9e'); ell(r * .22, -r * .05, r * .22, r * .14, '#ff5c9e'); circ(0, -r * .05, r * .09, '#ffd0e5'); break;
    case 'bonnet': g.beginPath(); g.ellipse(0, -r * .02, r * .7, r * .5, 0, Math.PI, 0); g.fillStyle = '#fff3df'; g.fill(); ell(r * .35, -r * .1, r * .16, r * .09, '#ff8fc1'); break;
    case 'cap': g.beginPath(); g.ellipse(0, 0, r * .5, r * .36, 0, Math.PI, 0); g.fillStyle = '#ff5c5c'; g.fill(); ell(r * .45, -r * .02, r * .3, r * .08, '#e04848'); break;
    case 'straw': ell(0, -r * .02, r * .8, r * .18, '#f5d77a'); g.beginPath(); g.ellipse(0, -r * .06, r * .42, r * .34, 0, Math.PI, 0); g.fillStyle = '#f2cc5c'; g.fill(); rrect(-r * .42, -r * .16, r * .84, r * .09, 0, '#ff7fb2'); break;
    case 'beret': ell(r * .08, -r * .08, r * .5, r * .2, '#c2407f'); circ(r * .08, -r * .26, r * .06, '#c2407f'); break;
    case 'hard': g.beginPath(); g.ellipse(0, 0, r * .52, r * .42, 0, Math.PI, 0); g.fillStyle = '#ffcc4c'; g.fill(); ell(0, 0, r * .62, r * .1, '#e0a92a'); break;
    case 'paper': poly([-r * .42, 0, r * .42, 0, r * .2, -r * .36, -r * .2, -r * .36], '#ffffff'); rrect(-r * .42, -r * .1, r * .84, r * .1, 0, '#ff8fc1'); break;
    case 'backcap': g.beginPath(); g.ellipse(0, 0, r * .5, r * .36, 0, Math.PI, 0); g.fillStyle = '#3a7aff'; g.fill(); ell(-r * .5, -r * .04, r * .22, r * .07, '#2a5ad0'); circ(0, -r * .34, r * .05, '#2a5ad0'); break;
    case 'sunhat': ell(0, -r * .02, r * 1.0, r * .24, '#fff0c8'); g.beginPath(); g.ellipse(0, -r * .08, r * .46, r * .38, 0, Math.PI, 0); g.fillStyle = '#ffe8b4'; g.fill(); rrect(-r * .46, -r * .2, r * .92, r * .12, 2, '#ff86b0'); ell(r * .44, -r * .16, r * .14, r * .09, '#ff4f9a'); break;
    case 'captain': ell(0, -r * .04, r * .56, r * .14, '#2a2035'); rrect(-r * .5, -r * .5, r * 1, r * .46, r * .18, '#fffaf2'); rrect(-r * .5, -r * .16, r * 1, r * .12, 0, '#2a2035'); circ(0, -r * .32, r * .1, '#ffd36b'); break;
    case 'beanie': g.beginPath(); g.ellipse(0, 0, r * .48, r * .42, 0, Math.PI, 0); g.fillStyle = '#7fd9ff'; g.fill(); circ(0, -r * .44, r * .12, '#fff'); rrect(-r * .48, -r * .1, r * .96, r * .12, 3, '#5bb8e0'); break;
  }
  g.restore();
}

export function drawBubble(n: NPC, S: number): void {
  const b = n.bubble; if (!b) return;
  const lift = n.inBalloon ? (G.props.find(p => p.id === 'balloon')?.h ?? 0) + 6 : 0;
  const fs = 12 / S, pad = 5 / S;
  g.font = `800 ${fs}px ui-rounded, "Avenir Next", system-ui, sans-serif`;
  const w = g.measureText(b.t).width + pad * 2, h = fs + pad * 1.6;
  const x = n.x, y = n.y - lift - n.r * 2.3 - (n.hat === 'tophat' || n.hat === 'chef' ? n.r * .9 : 0) - 10 / S;
  const k = Math.min(1, (b.max - b.life) * 8, b.life * 3);
  g.save(); g.globalAlpha = k;
  const hot = ['panic', 'alert', 'mourn', 'flee', 'bees'].includes(n.react?.type ?? '') || n.acting === 'panic';
  rrect(x - w / 2, y - h, w, h, h / 2, hot ? '#ff4d6d' : '#fffaf2');
  poly([x - 4 / S, y - 1 / S, x + 4 / S, y - 1 / S, x, y + 5 / S], hot ? '#ff4d6d' : '#fffaf2');
  txt(b.t, x, y - h / 2, fs, hot ? '#fff' : '#50334f', 'center', 800);
  g.restore();
}

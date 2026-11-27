/* =====================================================================
   World: map queries, the festival grounds, decor, ground and overhead
   layers. Shootable opportunity props live in props.ts.
   ===================================================================== */
import { BUSHES, PAL, PATHS, WATER, WORLD, type Water } from "./data";
import { circ, ell, ellS, g, ln, poly, rrect, txt } from "./draw";
import { drawHat } from "./npc";
import { G, type Puddle } from "./state";
import { TAU, inEll, lerp, rng, type Ellipse, type Pt } from "./util";

export function waterAt(x: number, y: number, pad = 0): Water | null { for (const w of WATER) if (inEll(x, y, w, pad)) return w; return null; }
export function bushAt(x: number, y: number): Ellipse | null { for (const b of BUSHES) if (inEll(x, y, b, 4)) return b; return null; }
export function onDock(x: number, y: number): boolean { return !G.flags.dockGone && x > 512 && x < 656 && y > 880 && y < 936; }

/* ---------- static decor, generated once ---------- */
export interface Sprite { y: number; draw(): void }
export const DECOR = {
  tufts: [] as [number, number, number][], flowers: [] as [number, number, string][], waves: [] as Pt[],
  sorted: [] as Sprite[], bunting: [] as [Pt, Pt][]
};
export function buildDecor(): void {
  const r = rng(7);
  const avoid = (x: number, y: number) => waterAt(x, y, 20) || inEll(x, y, { x: 1000, y: 650, rx: 300, ry: 185 }) || (x > 820 && x < 1180 && y > 220 && y < 340);
  for (let i = 0; i < 900; i++) { const x = r() * WORLD.w, y = r() * WORLD.h; if (!avoid(x, y)) DECOR.tufts.push([x, y, r()]); }
  // shells and pebbles on the sand
  const fl = ['#fff6ea', '#ffc2d6', '#ffb08a', '#fff0c8', '#e8d0ff', '#ffffff'];
  for (let i = 0; i < 360; i++) { const x = r() * WORLD.w, y = r() * WORLD.h; if (!avoid(x, y)) DECOR.flowers.push([x, y, fl[i % fl.length]]); }
  for (let y = -300; y < 1700; y += 46) for (let x = -400; x < 2400; x += 96) DECOR.waves.push([x + (Math.floor(y / 46) % 2) * 38, y]);
  // palms and beach things around the edges
  const S = DECOR.sorted;
  const trees: Pt[] = [[120, 120], [80, 400], [60, 980], [180, 1220], [520, 120], [700, 300], [1400, 120], [1880, 300], [1900, 820], [1760, 1120], [1520, 1180], [460, 1180], [1880, 560], [130, 600], [760, 1240], [1250, 1240], [1720, 920], [860, 120], [1180, 130], [420, 640], [1460, 360], [1800, 160], [300, 1080], [640, 1140]];
  trees.forEach(([x, y], i) => S.push({ y, draw: () => palm(x, y, i) }));
  const candies: Pt[] = [[340, 560], [470, 700], [690, 640], [1340, 470], [1300, 760], [1660, 480], [900, 980], [1100, 980], [600, 1040], [1420, 1120], [1080, 470], [920, 460], [1760, 1000], [240, 820], [1820, 700], [560, 300]];
  candies.forEach(([x, y], i) => S.push({ y, draw: () => beachThing(x, y, i) }));
  BUSHES.forEach(b => S.push({ y: b.y + b.ry * .5, draw: () => bush(b) }));
  // structures
  S.push({ y: 236, draw: stageBack });
  S.push({ y: 312, draw: podium });
  S.push({ y: 448, draw: pieTent });
  S.push({ y: 504, draw: pieTable });
  S.push({ y: 646, draw: fountainTop });
  S.push({ y: 802, draw: iceCart });
  S.push({ y: 1050, draw: () => stall(770, 1050, '#2fc4a8', '#fff6ea', 'MARGARITAS') });
  S.push({ y: 1050, draw: () => stall(1232, 1050, '#ff6b5a', '#fff6ea', 'SNO-CONES') });
  S.push({ y: 1210, draw: carriage });
  S.push({ y: 252, draw: shed });
  S.push({ y: 716, draw: bench });
  // bunting posts around the plaza
  const posts: Pt[] = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + .3; posts.push([1000 + Math.cos(a) * 318, 650 + Math.sin(a) * 196]); }
  // tiki torches around the deck
  posts.forEach(([x, y]) => S.push({ y, draw: () => { ell(x, y + 2, 7, 3, '#6a4a3a30'); ln(x, y, x, y - 70, '#b9875a', 6); ln(x - 1, y - 20, x - 1, y - 60, '#d8a870', 2); rrect(x - 6, y - 80, 12, 12, 3, '#8a5a3a'); circ(x, y - 86, 6 + Math.sin(G.clock * 9 + x), '#ffb03a'); circ(x, y - 88, 3.5, '#fff0a0'); } }));
  for (let i = 0; i < posts.length; i++) DECOR.bunting.push([posts[i], posts[(i + 1) % posts.length]]);
  // lantern string over the stage
  DECOR.bunting.push([[830, 300], [1170, 300]]);
  S.push({ y: 300, draw: () => { ln(830, 300, 830, 190, '#b9875a', 6); ln(1170, 300, 1170, 190, '#b9875a', 6); } });
}

function palm(x: number, y: number, i: number) {
  const lean = ((i * 37) % 7 - 3) * 4, h = 120 + (i * 13) % 40;
  ell(x + 22, y + 4, 44, 12, '#6a4a3a2a');
  for (let k = 0; k < 9; k++) { const t = k / 9; circ(x + lean * t * t, y - t * h, 9 - t * 3, k % 2 ? '#c8945e' : '#b07e4c'); }
  const cx = x + lean, cy = y - h;
  const frond = (a: number, len: number, c: string) => {
    const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * .6 + len * .25, nx = -Math.sin(a), ny = Math.cos(a) * .6;
    g.beginPath(); g.moveTo(cx, cy);
    g.quadraticCurveTo(cx + Math.cos(a) * len * .5 + nx * 14, cy + Math.sin(a) * len * .3 - 18 + ny * 14, ex, ey);
    g.quadraticCurveTo(cx + Math.cos(a) * len * .5 - nx * 4, cy + Math.sin(a) * len * .3 - 6, cx, cy);
    g.fillStyle = c; g.fill();
  };
  for (const a of [Math.PI * .95, Math.PI * .05, Math.PI * .6, Math.PI * .4]) frond(a, 66, '#2f8a3a');
  for (const a of [Math.PI * 1.1, -Math.PI * .1, Math.PI * .78, Math.PI * .22, Math.PI * 1.35, -Math.PI * .35]) frond(a, 58, '#4fb04a');
  circ(cx - 5, cy + 4, 5, '#8a5a2a'); circ(cx + 5, cy + 5, 5, '#7a4a22'); circ(cx, cy - 1, 6, '#4fb04a');
}
function beachThing(x: number, y: number, i: number) {
  const type = i % 4, cols = [['#ff6b5a', '#fff6ea'], ['#2fc4a8', '#fff6ea'], ['#ffc93c', '#ff4f9a'], ['#3a7aff', '#fff6ea'], ['#ff86b0', '#fff6ea']][i % 5];
  if (type === 0 || type === 3) {   // umbrella over a towel
    rrect(x - 4, y - 6, 34, 18, 3, cols[0]); for (let k = 0; k < 3; k++) rrect(x - 4, y - 3 + k * 6, 34, 2.5, 1, cols[1]);
    ell(x + 8, y + 4, 34, 10, '#6a4a3a26');
    ln(x, y, x, y - 58, '#e8e0d0', 3);
    for (let k = 0; k < 8; k++) { const a0 = Math.PI + k * Math.PI / 8, a1 = a0 + Math.PI / 8; poly([x, y - 74, x + Math.cos(a0) * 38, y - 56 + Math.sin(a0) * 4, x + Math.cos(a1) * 38, y - 56 + Math.sin(a1) * 4], k % 2 ? cols[1] : cols[0]); }
    circ(x, y - 75, 3, cols[0]);
  } else if (type === 1) {   // beach ball
    ell(x + 3, y + 3, 13, 4, '#6a4a3a2a');
    circ(x, y - 11, 12, '#fff6ea');
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x, y - 11); g.arc(x, y - 11, 12, k * TAU / 3, k * TAU / 3 + TAU / 6); g.closePath(); g.fillStyle = ['#ff4f9a', '#3a7aff', '#ffc93c'][k]; g.fill(); }
    ell(x - 4, y - 16, 4, 2.5, '#ffffffa0');
  } else {   // sandcastle
    ell(x + 2, y + 3, 26, 7, '#6a4a3a26');
    rrect(x - 22, y - 16, 44, 18, 3, '#e8c07c');
    for (const [dx, h] of [[-20, 30], [12, 30], [-5, 38]]) { rrect(x + dx, y - h, 10, h, 2, '#dcb070'); for (let k = 0; k < 3; k++) rrect(x + dx + k * 3.6, y - h - 3, 2.6, 4, 1, '#dcb070'); }
    ln(x, y - 40, x, y - 52, '#ffffff', 1.5); poly([x, y - 52, x + 9, y - 49, x, y - 46], '#ff4f9a');
  }
}
function bush(b: Ellipse) {   // a clump of dune grass, thick enough to hide a puddle
  ell(b.x + 5, b.y + b.ry * .5, b.rx, b.ry * .45, '#6a4a3a26');
  ell(b.x, b.y + 2, b.rx * .95, b.ry * .7, '#e6cf96');
  for (let k = 0; k < 22; k++) {
    const t = k / 21, bx = b.x - b.rx * .85 + t * b.rx * 1.7, lean = (t - .5) * 22 + Math.sin(k * 2.3) * 6, h = b.ry * (1.3 + Math.sin(k * 1.7) * .4) * (1 - Math.abs(t - .5) * .7);
    g.beginPath(); g.moveTo(bx - 3, b.y + 4); g.quadraticCurveTo(bx + lean * .3, b.y - h * .5, bx + lean, b.y - h); g.quadraticCurveTo(bx + lean * .3 + 2, b.y - h * .45, bx + 3, b.y + 4);
    g.fillStyle = k % 3 ? '#8cbf5a' : '#6aa04a'; g.fill();
  }
}
/* ---------- structures ---------- */
function stageBack() {
  rrect(836, 150, 328, 86, 10, '#1f8fa0');
  rrect(842, 156, 316, 78, 8, '#2fc4a8');
  for (let i = 0; i < 9; i++) { rrect(846 + i * 35, 160, 16, 72, 6, '#5fd8c8'); }
  for (const x of [856, 1144]) { rrect(x - 16, 176, 32, 52, 6, '#2a2035'); circ(x, 192, 9, '#1a1426'); circ(x, 214, 6, '#1a1426'); }
  rrect(880, 128, 240, 36, 16, '#fff6ea');
  txt('SPRING BREAK!', 1000, 147, 22, '#ff4f9a');
}
function podium() {
  rrect(982, 286, 36, 30, 5, '#a8608d');
  rrect(980, 282, 40, 10, 4, '#ffd36b');
  txt('★', 1000, 302, 12, '#ffd36b');
}
function pieTent() {
  const x = 560, y = 448;
  poly([x - 120, y, x - 100, y - 70, x + 100, y - 70, x + 120, y], '#fff3dc');
  for (let i = 0; i < 6; i++) { const a = x - 100 + i * 40; poly([a, y - 70, a + 20, y - 70, a + 26, y, a + 2, y].map((v, k) => k % 2 ? v : v - 10 + (k === 4 || k === 6 ? 0 : 10)), '#ff7fb2'); }
  poly([x - 112, y - 66, x, y - 112, x + 112, y - 66], '#ff5c9e');
  poly([x - 70, y - 82, x, y - 112, x + 70, y - 82], '#ffd0e5');
  circ(x, y - 114, 6, '#ffe066');
  rrect(x - 52, y - 62, 104, 22, 8, '#fff0cc');
  txt('PIE CONTEST', x, y - 51, 11, '#c2407f');
}
function pieTable() {
  rrect(470, 488, 180, 12, 4, '#fff8ec');
  rrect(470, 498, 180, 14, 3, '#ffb3d1');
  for (let i = 0; i < 9; i++) rrect(474 + i * 20, 498, 10, 14, 2, '#ffffff');
  const pies = G.flags.ovenBoom ? 2 : 5;
  for (let i = 0; i < pies; i++) { const px = 490 + i * 36; ell(px, 487, 13, 5, '#d48a4a'); ell(px, 485, 11, 4, '#f6c27a'); circ(px - 3, 484, 2, '#e0457a'); }
}
function fountainTop() {
  const x = 1000, y = 640;
  ell(x, y + 6, 22, 8, '#5a2c1a');
  rrect(x - 9, y - 50, 18, 54, 6, '#f6d2e0');
  ell(x, y - 50, 32, 11, '#f6d2e0');
  ell(x, y - 52, 27, 8, '#7a4630');
  const t = G.clock;
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .6; const dx = Math.cos(a) * 26, dy = Math.sin(a) * 8; ln(x + dx * .9, y - 50 + dy, x + dx * 1.25, y - 20 + dy * 1.6, '#8a5236', 4); }
  rrect(x - 4, y - 78, 8, 28, 4, '#f6d2e0');
  circ(x, y - 82, 9, '#7a4630');
  circ(x - 2, y - 85, 3, '#a8704f');
}
function iceCart() {
  const x = 790, y = 802;
  ell(x + 4, y + 6, 46, 10, '#5a3f6a30');
  rrect(x - 40, y - 40, 80, 40, 8, '#bdf0ff');
  rrect(x - 40, y - 18, 80, 18, 6, '#8fd8ef');
  circ(x - 26, y + 2, 9, '#6a4f7a'); circ(x + 26, y + 2, 9, '#6a4f7a');
  ln(x + 30, y - 40, x + 30, y - 92, '#fff', 3);
  g.beginPath(); g.moveTo(x - 10, y - 88); g.quadraticCurveTo(x + 30, y - 118, x + 70, y - 88); g.closePath(); g.fillStyle = '#ff9fcf'; g.fill();
  for (let i = 0; i < 4; i++) { ell(x - 22 + i * 15, y - 46, 7, 6, ['#ffd0e5', '#fff5b0', '#c1f6ff', '#d9ffb0'][i]); }
  txt('ICE CREAM', x, y - 26, 10, '#2688bd');
}
function stall(x: number, y: number, c1: string, c2: string, label: string) {
  ell(x + 4, y + 6, 50, 10, '#5a3f6a30');
  rrect(x - 44, y - 34, 88, 34, 6, '#fff3dc');
  rrect(x - 44, y - 34, 88, 9, 4, c1);
  for (let i = 0; i < 5; i++) poly([x - 48 + i * 20, y - 74, x - 28 + i * 20, y - 74, x - 30 + i * 20, y - 60, x - 46 + i * 20, y - 60], i % 2 ? c2 : c1);
  ln(x - 42, y - 34, x - 42, y - 62, '#e8cfa8', 3); ln(x + 42, y - 34, x + 42, y - 62, '#e8cfa8', 3);
  txt(label, x, y - 18, 10, '#a3477f');
}
function carriage() {
  const x = 1000, y = 1210;
  ell(x, y + 6, 70, 13, '#5a3f6a30');
  circ(x - 40, y - 4, 16, '#9a5a8a'); circ(x + 40, y - 4, 16, '#9a5a8a');
  circ(x - 40, y - 4, 9, '#ffd36b'); circ(x + 40, y - 4, 9, '#ffd36b');
  g.beginPath(); g.ellipse(x, y - 34, 52, 34, 0, Math.PI, 0); g.fillStyle = '#ffb3d1'; g.fill();
  rrect(x - 52, y - 36, 104, 22, 8, '#ff7fb2');
  rrect(x - 14, y - 62, 28, 26, 8, '#fff0cc');
  circ(x, y - 72, 6, '#ffd36b');
  // gummy horse
  ell(x + 92, y - 18, 24, 15, '#ffb84c'); circ(x + 114, y - 34, 12, '#ffb84c'); circ(x + 118, y - 37, 2, '#50334f');
  ln(x + 80, y - 6, x + 80, y + 6, '#d58c21', 5); ln(x + 104, y - 6, x + 104, y + 6, '#d58c21', 5);
}
function shed() {
  const x = 1300, y = 252, gone = G.flags.shedGone;
  rrect(x - 50, y - 62, 100, 62, 4, gone ? '#5b4458' : '#d6a3c8');
  if (!gone) {
    poly([x - 58, y - 60, x, y - 98, x + 58, y - 60], '#a8608d');
    rrect(x - 14, y - 40, 28, 40, 3, '#a8608d');
    txt('⚠ BOOM', x, y - 50, 9, '#fff0cc');
  } else { for (let i = 0; i < 5; i++) ln(x - 40 + i * 20, y - 62, x - 46 + i * 22, y - 80 - (i % 2) * 10, '#3a2a3a', 5); }
}
function bench() {
  const x = 1510, y = 716;
  rrect(x - 34, y - 14, 68, 8, 3, '#e8b48a'); rrect(x - 34, y - 24, 68, 6, 3, '#e8b48a');
  ln(x - 28, y - 6, x - 28, y + 2, '#a8704f', 4); ln(x + 28, y - 6, x + 28, y + 2, '#a8704f', 4);
}

/* ---------- ground layer ---------- */
/** `detail` = false skips grass tufts, flowers and wave squiggles (used by the blurred periphery pass). */
export function drawGround(detail = true): void {
  const v = G.view;
  // the sea all round, with drifting swell marks
  g.fillStyle = '#2bb5c8'; g.fillRect(v.x0 - 50, v.y0 - 50, v.x1 - v.x0 + 100, v.y1 - v.y0 + 100);
  g.strokeStyle = '#8fe4ee99'; g.lineWidth = 2.5;
  if (detail) for (const [x, y] of DECOR.waves) if (x > v.x0 - 20 && x < v.x1 + 20 && y > v.y0 - 20 && y < v.y1 + 20) { g.beginPath(); g.arc(x + Math.sin(G.clock * .8 + y) * 4, y, 12, .25, 2.65); g.stroke(); }
  // shallows, the breathing foam line, wet sand, then the dry beach
  const surf = Math.sin(G.clock * .9) * 5;
  g.beginPath(); g.roundRect(-70, -70, WORLD.w + 140, WORLD.h + 140, 200); g.fillStyle = '#5fd8d8'; g.fill();
  g.beginPath(); g.roundRect(-26 - surf, -26 - surf, WORLD.w + 52 + surf * 2, WORLD.h + 52 + surf * 2, 165); g.fillStyle = '#fffaf2'; g.fill();
  g.beginPath(); g.roundRect(-14, -14, WORLD.w + 28, WORLD.h + 28, 155); g.fillStyle = '#dcb27c'; g.fill();
  g.beginPath(); g.roundRect(10, 10, WORLD.w - 20, WORLD.h - 20, 135); g.fillStyle = '#f3d6a0'; g.fill();
  // dune
  for (let k = 0; k < 4; k++) ell(300, 262 - k * 6, 190 - k * 26, 110 - k * 16, ['#e8c68c', '#edcd94', '#f1d49c', '#f5dba6'][k]);
  // the volleyball sand (maypole meadow) and the balloon pad
  ell(1350, 975, 120, 66, '#f8e2b4'); ellS(1350, 975, 92, 50, '#ffffffb0', 3);
  ell(1665, 262, 70, 34, '#f8e2b4'); ellS(1665, 262, 56, 26, '#ff7fb2aa', 4); txt('H', 1665, 262, 22, '#ff7fb2aa');
  // the dune-grass patch
  ell(1520, 650, 215, 150, '#ead3a0');
  // sand ripples and shells (culled)
  g.strokeStyle = '#ddb57c'; g.lineWidth = 2;
  if (detail) for (const [x, y] of DECOR.tufts) if (x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1) { g.beginPath(); g.arc(x, y + 6, 8, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke(); }
  if (detail) for (const [x, y, c] of DECOR.flowers) if (x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1) { ell(x, y, 3.2, 2.4, c); }
  // boardwalk paths: planks across the way
  for (const p of PATHS) strokePath(p, 58, '#a8784a');
  for (const p of PATHS) strokePath(p, 50, '#d8ab78');
  g.setLineDash([2.5, 11]); for (const p of PATHS) strokePath(p, 50, '#b98a5a'); g.setLineDash([]);
  // the deck (plaza): planks, clipped to the oval
  ell(1000, 654, 306, 188, '#a8784a');
  g.save(); g.beginPath(); g.ellipse(1000, 648, 298, 180, 0, 0, TAU); g.clip();
  g.fillStyle = '#dcb488'; g.fillRect(700, 468, 600, 362);
  for (let y = 470; y < 830; y += 14) { g.fillStyle = (y / 14) % 2 ? '#d4aa7c' : '#e0b98e'; g.fillRect(700, y, 600, 12); }
  g.restore();
  // the stage platform
  rrect(826, 226, 348, 108, 10, '#1f6a78');
  rrect(826, 222, 348, 100, 10, '#e0b98e');
  for (let i = 0; i < 8; i++) ln(840 + i * 44, 226, 840 + i * 44, 318, '#c89a6a', 2);
  rrect(826, 318, 348, 16, 6, '#2a8a9a');
  // fountain basin
  if (G.flags.chocFlood) { ell(1000, 650, 150, 82, '#5a2c1a'); ell(996, 646, 140, 74, '#7a4630'); for (const [a, b] of [[-120, 30], [110, 40], [60, -50], [-70, -55]]) ell(1000 + a, 650 + b, 26, 12, '#7a4630'); }
  ell(1000, 646, 82, 46, '#e8d8c0');
  ell(1000, 642, 78, 43, '#fff6ea');
  ell(1000, 642, 70, 37, '#7a4630');
  for (let i = 0; i < 3; i++) ellS(1000, 642, 30 + ((G.clock * 18 + i * 14) % 40), 16 + ((G.clock * 18 + i * 14) % 40) * .5, '#a8704f88', 2);
  // lagoons
  for (const w of WATER) if (w.id !== 'choc') {
    ell(w.x, w.y + 4, w.rx + 18, w.ry + 12, '#dcb27c');
    ell(w.x, w.y, w.rx + 10, w.ry + 7, '#fffaf2');
    ell(w.x, w.y, w.rx, w.ry, '#2bb5c8');
    ell(w.x - w.rx * .08, w.y - w.ry * .1, w.rx * .86, w.ry * .76, '#5fd8d8');
    for (let i = 0; i < 5; i++) { const ph = (G.clock * .3 + i / 5) % 1; ellS(w.x + Math.cos(i * 2.1) * w.rx * .45, w.y + Math.sin(i * 2.1) * w.ry * .45, 8 + ph * 26, 3 + ph * 10, `rgba(255,255,255,${.5 * (1 - ph)})`, 1.5); }
  }
  // pool floats where the lily pads were
  for (const [x, y, c] of [[1515, 760, '#ff86b0'], [1600, 785, '#ffc93c'], [1575, 742, '#2fc4a8'], [330, 870, '#ff6b5a'], [380, 1000, '#ffc93c'], [560, 960, '#ff86b0']] as [number, number, string][]) { ell(x, y, 13, 7, c); ell(x, y, 5, 2.6, '#5fd8d8'); ell(x - 5, y - 3, 3, 1.4, '#ffffffb0'); }
  for (const p of G.props) if (p.ground) p.draw();
  // concealed puddles = ripples / rustles
  for (const p of G.puddles) if (p.concealed && p.age < 6) {
    const k = p.age / 6;
    if (p.where === 'bush') continue;
    ellS(p.x, p.y, 8 + k * 40, 3 + k * 16, `rgba(255,255,255,${.7 * (1 - k)})`, 2);
  }
  for (const p of G.puddles) if (!p.concealed) drawPuddle(p);
}
function strokePath(p: Pt[], w: number, c: string) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }

function drawPuddle(p: Puddle) {
  const c = PAL[p.c];
  g.save(); g.translate(p.x, p.y); g.rotate(p.angle);
  const s = Math.min(1, p.age * 6);
  g.scale(s, s);
  g.globalAlpha = .88;
  ell(0, 0, p.r * 1.25, p.r * .66, c[2]);
  ell(-2, -2, p.r * 1.12, p.r * .56, c[0]);
  for (const d of p.drops) ell(d.x, d.y, d.r, d.r * .56, c[0]);
  ell(-p.r * .28, -p.r * .22, p.r * .39, p.r * .1, c[1]);
  g.globalAlpha = 1;
  // the sad leftover eyes
  if (p.eyes) { circ(-4, -1, 3.2, '#fffaf7'); circ(5, 1, 3.2, '#fffaf7'); circ(-4, -.5, 1.4, '#50334f'); circ(5, 1.5, 1.4, '#50334f'); }
  if (p.hat && p.hat !== 'none') drawHat(p.hat, p.r * .7, 9, 4, .7);
  if (p.secured) { g.setLineDash([5, 4]); ellS(0, 0, p.r * 2, p.r * 1.1, '#ffcc4c', 2); g.setLineDash([]); poly([p.r * 1.7 - 5, 2, p.r * 1.7 + 5, 2, p.r * 1.7, -12], '#ff7a3a'); rrect(p.r * 1.7 - 4, -6, 8, 2.5, 1, '#fff'); }
  else if (p.found && !p.accident) { g.globalAlpha = .9; ellS(0, 0, p.r * 1.6, p.r * .9, '#ff4d6d', 1.5); g.globalAlpha = 1; }
  g.restore();
}

/* ---------- overhead layer: bunting, ribbons ---------- */
export function drawOverhead(): void {
  const v = G.view;
  for (const [[ax, ay], [bx, by]] of DECOR.bunting) {
    if (Math.max(ax, bx) < v.x0 - 40 || Math.min(ax, bx) > v.x1 + 40 || Math.max(ay, by) < v.y0 - 100 || Math.min(ay, by) > v.y1 + 100) continue;
    const top = ay === 300 && by === 300 ? 190 : 70;
    const sag = 26, n = 9;
    g.beginPath();
    for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(ax, bx, t), y = lerp(ay - top, by - top, t) + Math.sin(t * Math.PI) * sag; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokeStyle = '#fff3df'; g.lineWidth = 1.5; g.stroke();
    for (let i = 1; i < n; i++) {
      const t = i / n, x = lerp(ax, bx, t), y = lerp(ay - top, by - top, t) + Math.sin(t * Math.PI) * sag;
      if (top === 190) { circ(x, y + 6, 6, ['#ffe066', '#ff8fc1', '#7fd9ff'][i % 3]); circ(x - 2, y + 4, 2, '#fff'); }
      else { const c = ['#ff4f9a', '#ffc93c', '#2fc4a8', '#ff6b5a', '#3a7aff'][i % 5]; const w = Math.sin(G.clock * 3 + i + ax) * 2; poly([x - 6, y, x + 6, y, x + w, y + 13], c); }
    }
  }
}


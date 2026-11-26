/* =====================================================================
   World: map queries, the festival grounds, decor, ground and overhead
   layers. Shootable opportunity props live in props.ts.
   ===================================================================== */
import { BUSHES, PAL, PAL_KEYS, PATHS, WATER, WORLD, type Water } from "./data";
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
  const fl = ['#ff8fc1', '#ffe066', '#ffffff', '#c7a6ff', '#7fd9ff', '#ff9f6b'];
  for (let i = 0; i < 520; i++) { const x = r() * WORLD.w, y = r() * WORLD.h; if (!avoid(x, y)) DECOR.flowers.push([x, y, fl[i % fl.length]]); }
  // garden flowerbeds get extra love
  for (let i = 0; i < 260; i++) { const a = r() * TAU, d = Math.sqrt(r()); const x = 1520 + Math.cos(a) * 200 * d, y = 660 + Math.sin(a) * 140 * d; if (!waterAt(x, y, 8) && !bushAt(x, y)) DECOR.flowers.push([x, y, fl[i % fl.length]]); }
  for (let y = -300; y < 1700; y += 46) for (let x = -400; x < 2400; x += 96) DECOR.waves.push([x + (Math.floor(y / 46) % 2) * 38, y]);
  // lollipop trees & candy around the edges
  const S = DECOR.sorted;
  const trees: Pt[] = [[120, 120], [80, 400], [60, 980], [180, 1220], [520, 120], [700, 300], [1400, 120], [1880, 300], [1900, 820], [1760, 1120], [1520, 1180], [460, 1180], [1880, 560], [130, 600], [760, 1240], [1250, 1240], [1720, 920], [860, 120], [1180, 130], [420, 640], [1460, 360], [1800, 160], [300, 1080], [640, 1140]];
  trees.forEach(([x, y], i) => S.push({ y, draw: () => tree(x, y, i) }));
  const candies: Pt[] = [[340, 560], [470, 700], [690, 640], [1340, 470], [1300, 760], [1660, 480], [900, 980], [1100, 980], [600, 1040], [1420, 1120], [1080, 470], [920, 460], [1760, 1000], [240, 820], [1820, 700], [560, 300]];
  candies.forEach(([x, y], i) => S.push({ y, draw: () => candy(x, y, 11 + (i * 7) % 9, i % PAL_KEYS.length, i % 3) }));
  BUSHES.forEach(b => S.push({ y: b.y + b.ry * .5, draw: () => bush(b) }));
  // structures
  S.push({ y: 236, draw: stageBack });
  S.push({ y: 312, draw: podium });
  S.push({ y: 448, draw: pieTent });
  S.push({ y: 504, draw: pieTable });
  S.push({ y: 646, draw: fountainTop });
  S.push({ y: 802, draw: iceCart });
  S.push({ y: 1050, draw: () => stall(770, 1050, '#ffe15c', '#fffbd1', 'LEMONADE') });
  S.push({ y: 1050, draw: () => stall(1232, 1050, '#ff8fc8', '#ffe1f0', 'FLOSS') });
  S.push({ y: 1210, draw: carriage });
  S.push({ y: 252, draw: shed });
  S.push({ y: 716, draw: bench });
  // bunting posts around the plaza
  const posts: Pt[] = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + .3; posts.push([1000 + Math.cos(a) * 318, 650 + Math.sin(a) * 196]); }
  posts.forEach(([x, y]) => S.push({ y, draw: () => { ln(x, y, x, y - 70, '#f2d7b8', 5); circ(x, y - 72, 5, '#ff7fb8'); ell(x, y + 2, 7, 3, '#5a3f6a30'); } }));
  for (let i = 0; i < posts.length; i++) DECOR.bunting.push([posts[i], posts[(i + 1) % posts.length]]);
  // lantern string over the stage
  DECOR.bunting.push([[830, 300], [1170, 300]]);
  S.push({ y: 300, draw: () => { ln(830, 300, 830, 190, '#f2d7b8', 5); ln(1170, 300, 1170, 190, '#f2d7b8', 5); } });
}

function tree(x: number, y: number, i: number) {
  const c = PAL[PAL_KEYS[(i * 5) % PAL_KEYS.length]];
  ell(x + 6, y + 4, 34, 11, '#5a3f6a2a');
  ln(x, y, x, y - 64, '#fff3df', 9);
  ln(x, y, x, y - 64, '#f2d0b2', 3);
  circ(x, y - 92, 40, c[2]);
  circ(x, y - 96, 38, c[0]);
  g.beginPath(); g.arc(x, y - 96, 24, 0, TAU * .78); g.strokeStyle = c[1]; g.lineWidth = 7; g.stroke();
  ell(x - 14, y - 116, 12, 6, '#ffffffa0');
}
function bush(b: Ellipse) {
  ell(b.x + 5, b.y + b.ry * .5, b.rx, b.ry * .45, '#4a6a3c30');
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI; circ(b.x - b.rx * .7 + k * b.rx * .35, b.y - Math.sin(a) * b.ry * .55, b.ry * .95, '#5fb86a'); }
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI; circ(b.x - b.rx * .7 + k * b.rx * .35, b.y - 4 - Math.sin(a) * b.ry * .55, b.ry * .8, '#7fd47f'); }
  circ(b.x - b.rx * .3, b.y - b.ry * .7, 4, '#ff8fc1'); circ(b.x + b.rx * .35, b.y - b.ry * .5, 3.5, '#fff27a'); circ(b.x + b.rx * .05, b.y - b.ry * 1.05, 3, '#ffffff');
}
function candy(x: number, y: number, r: number, ci: number, type: number) {
  const c = PAL[PAL_KEYS[ci]];
  ell(x, y + 3, r * .87, r * .34, '#76537e27');
  if (type === 0) {
    ln(x, y, x, y - r * 2.15, '#fff2db', 5);
    circ(x, y - r * 2.15, r, c[0]);
    g.beginPath(); g.arc(x, y - r * 2.15, r * .63, -2.7, 2.55); g.strokeStyle = c[1]; g.lineWidth = 4; g.stroke();
  } else if (type === 1) {
    g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x - r * 1.15, y - r * 1.8, x, y - r * 2); g.quadraticCurveTo(x + r * 1.15, y - r * 1.8, x + r, y); g.closePath();
    g.fillStyle = c[0]; g.fill(); ell(x - r * .35, y - r * 1.4, r * .2, r * .38, '#fff7');
  } else {
    for (let j = 0; j < 3; j++) { const xx = x + (j - 1) * r * .85, hh = r * (1 + j % 2); rrect(xx - r * .45, y - hh, r * .9, hh, 5, c[j % 2]); }
  }
}

/* ---------- structures ---------- */
function stageBack() {
  rrect(836, 150, 328, 86, 10, '#b4689e');
  rrect(842, 156, 316, 78, 8, '#ff9fcf');
  for (let i = 0; i < 9; i++) { rrect(846 + i * 35, 160, 16, 72, 6, '#ffbfdf'); }
  rrect(900, 132, 200, 34, 14, '#fff0cc');
  txt('JUBILEE!', 1000, 150, 22, '#c2407f');
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
  g.fillStyle = '#cbbbe9'; g.fillRect(v.x0 - 50, v.y0 - 50, v.x1 - v.x0 + 100, v.y1 - v.y0 + 100);
  g.strokeStyle = '#f3e7ff88'; g.lineWidth = 2.5;
  if (detail) for (const [x, y] of DECOR.waves) if (x > v.x0 - 20 && x < v.x1 + 20 && y > v.y0 - 20 && y < v.y1 + 20) { g.beginPath(); g.arc(x + Math.sin(G.clock * .8 + y) * 4, y, 12, .25, 2.65); g.stroke(); }
  // meadow island
  for (let k = 36; k > 0; k -= 4) { g.beginPath(); g.roundRect(0, k, WORLD.w, WORLD.h, 140); g.fillStyle = k > 20 ? '#8fb873' : '#a9cc82'; g.fill(); }
  g.beginPath(); g.roundRect(0, 0, WORLD.w, WORLD.h, 140); g.fillStyle = '#d4f0b0'; g.fill();
  // hill
  for (let k = 0; k < 4; k++) ell(300, 262 - k * 6, 190 - k * 26, 110 - k * 16, ['#b9dd92', '#c6e7a0', '#cfeeaa', '#d8f3b4'][k]);
  // maypole meadow + balloon pad
  ell(1350, 975, 120, 66, '#c7e8a4'); ellS(1350, 975, 92, 50, '#ffffff70', 3);
  ell(1665, 262, 70, 34, '#c7e8a4'); ellS(1665, 262, 56, 26, '#ff7fb2aa', 4); txt('H', 1665, 262, 22, '#ff7fb2aa');
  // garden beds
  ell(1520, 650, 215, 150, '#c8ecaa');
  // tufts & flowers (culled)
  g.strokeStyle = '#a8d58a'; g.lineWidth = 2;
  if (detail) for (const [x, y] of DECOR.tufts) if (x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1) { g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x - 1, y - 6); g.moveTo(x, y); g.lineTo(x + 3, y - 7); g.stroke(); }
  if (detail) for (const [x, y, c] of DECOR.flowers) if (x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1) { circ(x, y, 2.6, c); }
  // paths
  for (const p of PATHS) { strokePath(p, 58, '#e7cfa6'); }
  for (const p of PATHS) { strokePath(p, 48, '#fff0cf'); }
  // plaza
  ell(1000, 652, 304, 186, '#f2bfd0');
  ell(1000, 648, 298, 180, '#ffe0ea');
  for (let k = 1; k < 5; k++) ellS(1000, 648, 298 * k / 5, 180 * k / 5, '#f5c9d888', 2);
  // stage platform
  rrect(826, 226, 348, 108, 10, '#a8608d');
  rrect(826, 222, 348, 100, 10, '#ffd8ea');
  for (let i = 0; i < 8; i++) ln(840 + i * 44, 226, 840 + i * 44, 318, '#f6c3db', 2);
  rrect(826, 318, 348, 16, 6, '#c77aa8');
  // fountain basin
  if (G.flags.chocFlood) { ell(1000, 650, 150, 82, '#5a2c1a'); ell(996, 646, 140, 74, '#7a4630'); for (const [a, b] of [[-120, 30], [110, 40], [60, -50], [-70, -55]]) ell(1000 + a, 650 + b, 26, 12, '#7a4630'); }
  ell(1000, 646, 82, 46, '#e8b8cc');
  ell(1000, 642, 78, 43, '#f6d2e0');
  ell(1000, 642, 70, 37, '#7a4630');
  for (let i = 0; i < 3; i++) ellS(1000, 642, 30 + ((G.clock * 18 + i * 14) % 40), 16 + ((G.clock * 18 + i * 14) % 40) * .5, '#a8704f88', 2);
  // ponds
  for (const w of WATER) if (w.id !== 'choc') {
    ell(w.x, w.y + 4, w.rx + 18, w.ry + 12, '#e9d3a8');
    ell(w.x, w.y, w.rx + 12, w.ry + 8, '#f7e7c0');
    ell(w.x, w.y, w.rx, w.ry, '#7fcde8');
    ell(w.x - w.rx * .1, w.y - w.ry * .12, w.rx * .82, w.ry * .7, '#9adcf0');
    for (let i = 0; i < 5; i++) { const ph = (G.clock * .3 + i / 5) % 1; ellS(w.x + Math.cos(i * 2.1) * w.rx * .45, w.y + Math.sin(i * 2.1) * w.ry * .45, 8 + ph * 26, 3 + ph * 10, `rgba(255,255,255,${.5 * (1 - ph)})`, 1.5); }
  }
  // lily pads
  for (const [x, y] of [[1515, 760], [1600, 785], [1575, 742], [330, 870], [380, 1000], [560, 960]]) { ell(x, y, 12, 6, '#5fb86a'); circ(x + 3, y - 2, 3, '#ffb3d1'); }
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
      else { const c = ['#ff7fb2', '#ffe066', '#7fd9ff', '#a9f07f', '#c7a6ff'][i % 5]; const w = Math.sin(G.clock * 3 + i + ax) * 2; poly([x - 6, y, x + 6, y, x + w, y + 13], c); }
    }
  }
}


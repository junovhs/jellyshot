'use strict';
/* =====================================================================
   World: drawing helpers, the festival grounds, decor and every
   shootable opportunity prop (cake, oven, gumballs, dock, bees ...).
   ===================================================================== */

let g = null; // 2d context, set by game.js
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function ell(x, y, rx, ry, c) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); g.fillStyle = c; g.fill(); }
function circ(x, y, r, c) { ell(x, y, r, r, c); }
function ln(x, y, a, b, c, w = 1) { g.beginPath(); g.moveTo(x, y); g.lineTo(a, b); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); }
function rrect(x, y, w, h, r, c) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = c; g.fill(); }
function ringS(x, y, r, c, w = 1) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); g.strokeStyle = c; g.lineWidth = w; g.stroke(); }
function ellS(x, y, rx, ry, c, w = 1) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); g.strokeStyle = c; g.lineWidth = w; g.stroke(); }
function txt(t, x, y, s, c, align = 'center', weight = 900) { g.font = `${weight} ${s}px ui-rounded, "Avenir Next", system-ui, sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = c; g.fillText(t, x, y); }
function poly(pts, c) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fillStyle = c; g.fill(); }

function inEll(x, y, e, pad = 0) { const dx = (x - e.x) / (e.rx + pad), dy = (y - e.y) / (e.ry + pad * .6); return dx * dx + dy * dy < 1; }
function waterAt(x, y, pad = 0) { for (const w of WATER) if (inEll(x, y, w, pad)) return w; return null; }
function bushAt(x, y) { for (const b of BUSHES) if (inEll(x, y, b, 4)) return b; return null; }
function onDock(x, y) { return !G.flags.dockGone && x > 512 && x < 656 && y > 880 && y < 936; }
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = clamp(t, 0, 1); return dist(px, py, ax + t * dx, ay + t * dy); }

/* ---------- static decor, generated once ---------- */
const DECOR = { tufts: [], flowers: [], waves: [], sorted: [], bunting: [] };
function buildDecor() {
  const r = rng(7);
  const avoid = (x, y) => waterAt(x, y, 20) || inEll(x, y, { x: 1000, y: 650, rx: 300, ry: 185 }) || (x > 820 && x < 1180 && y > 220 && y < 340);
  for (let i = 0; i < 900; i++) { const x = r() * WORLD.w, y = r() * WORLD.h; if (!avoid(x, y)) DECOR.tufts.push([x, y, r()]); }
  const fl = ['#ff8fc1', '#ffe066', '#ffffff', '#c7a6ff', '#7fd9ff', '#ff9f6b'];
  for (let i = 0; i < 520; i++) { const x = r() * WORLD.w, y = r() * WORLD.h; if (!avoid(x, y)) DECOR.flowers.push([x, y, fl[i % fl.length]]); }
  // garden flowerbeds get extra love
  for (let i = 0; i < 260; i++) { const a = r() * TAU, d = Math.sqrt(r()); const x = 1520 + Math.cos(a) * 200 * d, y = 660 + Math.sin(a) * 140 * d; if (!waterAt(x, y, 8) && !bushAt(x, y)) DECOR.flowers.push([x, y, fl[i % fl.length]]); }
  for (let y = -300; y < 1700; y += 46) for (let x = -400; x < 2400; x += 96) DECOR.waves.push([x + (Math.floor(y / 46) % 2) * 38, y]);
  // lollipop trees & candy around the edges
  const S = DECOR.sorted;
  const trees = [[120, 120], [80, 400], [60, 980], [180, 1220], [520, 120], [700, 300], [1400, 120], [1880, 300], [1900, 820], [1760, 1120], [1520, 1180], [460, 1180], [1880, 560], [130, 600], [760, 1240], [1250, 1240], [1720, 920], [860, 120], [1180, 130], [420, 640], [1460, 360], [1800, 160], [300, 1080], [640, 1140]];
  trees.forEach(([x, y], i) => S.push({ y, draw: () => tree(x, y, i) }));
  const candies = [[340, 560], [470, 700], [690, 640], [1340, 470], [1300, 760], [1660, 480], [900, 980], [1100, 980], [600, 1040], [1420, 1120], [1080, 470], [920, 460], [1760, 1000], [240, 820], [1820, 700], [560, 300]];
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
  S.push({ y: 1278, draw: gate });
  S.push({ y: 252, draw: shed });
  S.push({ y: 716, draw: bench });
  // bunting posts around the plaza
  const posts = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + .3; posts.push([1000 + Math.cos(a) * 318, 650 + Math.sin(a) * 196]); }
  posts.forEach(([x, y]) => S.push({ y, draw: () => { ln(x, y, x, y - 70, '#f2d7b8', 5); circ(x, y - 72, 5, '#ff7fb8'); ell(x, y + 2, 7, 3, '#5a3f6a30'); } }));
  for (let i = 0; i < posts.length; i++) DECOR.bunting.push([posts[i], posts[(i + 1) % posts.length]]);
  // lantern string over the stage
  DECOR.bunting.push([[830, 300], [1170, 300]]);
  S.push({ y: 300, draw: () => { ln(830, 300, 830, 190, '#f2d7b8', 5); ln(1170, 300, 1170, 190, '#f2d7b8', 5); } });
}

function tree(x, y, i) {
  const c = PAL[PAL_KEYS[(i * 5) % PAL_KEYS.length]];
  ell(x + 6, y + 4, 34, 11, '#5a3f6a2a');
  ln(x, y, x, y - 64, '#fff3df', 9);
  ln(x, y, x, y - 64, '#f2d0b2', 3);
  circ(x, y - 92, 40, c[2]);
  circ(x, y - 96, 38, c[0]);
  g.beginPath(); g.arc(x, y - 96, 24, 0, TAU * .78); g.strokeStyle = c[1]; g.lineWidth = 7; g.stroke();
  ell(x - 14, y - 116, 12, 6, '#ffffffa0');
}
function bush(b) {
  ell(b.x + 5, b.y + b.ry * .5, b.rx, b.ry * .45, '#4a6a3c30');
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI; circ(b.x - b.rx * .7 + k * b.rx * .35, b.y - Math.sin(a) * b.ry * .55, b.ry * .95, '#5fb86a'); }
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI; circ(b.x - b.rx * .7 + k * b.rx * .35, b.y - 4 - Math.sin(a) * b.ry * .55, b.ry * .8, '#7fd47f'); }
  circ(b.x - b.rx * .3, b.y - b.ry * .7, 4, '#ff8fc1'); circ(b.x + b.rx * .35, b.y - b.ry * .5, 3.5, '#fff27a'); circ(b.x + b.rx * .05, b.y - b.ry * 1.05, 3, '#ffffff');
}
function candy(x, y, r, ci, type) {
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
function stall(x, y, c1, c2, label) {
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
function gate() {
  const x = 1000, y = 1278;
  ln(x - 80, y, x - 80, y - 110, '#ff7fb2', 12); ln(x + 80, y, x + 80, y - 110, '#ff7fb2', 12);
  g.beginPath(); g.arc(x, y - 110, 80, Math.PI, 0); g.strokeStyle = '#ff7fb2'; g.lineWidth = 12; g.stroke();
  rrect(x - 62, y - 168, 124, 26, 12, '#fff0cc');
  txt('GUMDROP HOLLOW', x, y - 155, 11, '#c2407f');
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
function drawGround() {
  const v = G.view;
  g.fillStyle = '#cbbbe9'; g.fillRect(v.x0 - 50, v.y0 - 50, v.x1 - v.x0 + 100, v.y1 - v.y0 + 100);
  g.strokeStyle = '#f3e7ff88'; g.lineWidth = 2.5;
  for (const [x, y] of DECOR.waves) if (x > v.x0 - 20 && x < v.x1 + 20 && y > v.y0 - 20 && y < v.y1 + 20) { g.beginPath(); g.arc(x + Math.sin(G.clock * .8 + y) * 4, y, 12, .25, 2.65); g.stroke(); }
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
  for (const [x, y] of DECOR.tufts) if (x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1) { g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x - 1, y - 6); g.moveTo(x, y); g.lineTo(x + 3, y - 7); g.stroke(); }
  for (const [x, y, c] of DECOR.flowers) if (x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1) { circ(x, y, 2.6, c); }
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
function strokePath(p, w, c) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }

function drawPuddle(p) {
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
  if (p.hat) drawHat(p.hat, p.r * .7, p.c, 9, 4, .7);
  if (p.secured) { g.setLineDash([5, 4]); ellS(0, 0, p.r * 2, p.r * 1.1, '#ffcc4c', 2); g.setLineDash([]); poly([p.r * 1.7 - 5, 2, p.r * 1.7 + 5, 2, p.r * 1.7, -12], '#ff7a3a'); rrect(p.r * 1.7 - 4, -6, 8, 2.5, 1, '#fff'); }
  else if (p.found && !p.accident) { g.globalAlpha = .9; ellS(0, 0, p.r * 1.6, p.r * .9, '#ff4d6d', 1.5); g.globalAlpha = 1; }
  g.restore();
}

/* ---------- overhead layer: bunting, ribbons ---------- */
function drawOverhead() {
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

/* =====================================================================
   PROPS — the opportunities. Each has hit(), shot(), update(), draw().
   ===================================================================== */
const GUMPATH = [[300, 244], [350, 300], [430, 372], [520, 446], [600, 505], [700, 548], [820, 590]];
const GUMLEN = (() => { let l = 0; for (let i = 1; i < GUMPATH.length; i++) l += dist(...GUMPATH[i - 1], ...GUMPATH[i]); return l; })();
function alongPath(d) {
  for (let i = 1; i < GUMPATH.length; i++) {
    const [ax, ay] = GUMPATH[i - 1], [bx, by] = GUMPATH[i], l = dist(ax, ay, bx, by);
    if (d <= l) { const t = d / l; return [lerp(ax, bx, t), lerp(ay, by, t), (by - ay) / l, -(bx - ax) / l]; }
    d -= l;
  }
  const [x, y] = GUMPATH[GUMPATH.length - 1]; return [x, y, 0, 0];
}

function makeProps() {
  const P = [];

  /* ---- THE BIG CAKE ---- */
  P.push({
    id: 'cake', opp: 'cake', x: 1000, y: 306, h: 100, vy: 0, state: 'hang', wob: 0, dx: 1000, dy: 200, dr: 70,
    hit(px, py) {
      if (this.state !== 'hang') return null;
      if (Math.abs(px - 1000) < 8 && py > 86 && py < 140) return { kind: 'rope', precise: true };
      if (inEll(px, py, { x: 1000, y: 306 - this.h - 34, rx: 54, ry: 44 })) return { kind: 'cake' };
      return null;
    },
    shot(hit, ammo) {
      if (hit.kind === 'rope' || ammo === 'bomb') { this.state = 'fall'; sfx('snap'); crowdSay(1000, 400, 260, 'shocked', 4); discover('cake'); return 'prop'; }
      this.wob = 1; sfx('boing'); startle(1000, 260, 140, 'Did the cake just move?'); return 'lure';
    },
    update(dt) {
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
    draw() {
      // candy-cane crane
      const cx = LOC.crane.x;
      ell(cx + 4, 268, 22, 7, '#5a3f6a30');
      for (let y = 262; y > 86; y -= 16) ln(cx, y, cx, Math.max(86, y - 16), (y / 16 | 0) % 2 ? '#ff5c9e' : '#fff3df', 9);
      ln(cx + 6, 90, 980, 90, '#ff5c9e', 7); ln(cx + 6, 90, 980, 90, '#fff3df', 2);
      ln(cx, 120, cx - 60, 90, '#ff5c9e', 4);
      rrect(cx - 12, 238, 24, 24, 5, '#ffd36b');
      if (this.state === 'smashed') {
        ell(1000, 304, 86, 30, '#ffffff'); ell(1000, 302, 78, 25, '#ffd0e5');
        for (let i = 0; i < 9; i++) ell(940 + i * 15, 300 + Math.sin(i * 3) * 12, 9, 5, i % 2 ? '#ff7fb2' : '#fff');
        circ(1010, 290, 7, '#e0457a');
        ln(1000, 90, 1000 + Math.sin(G.clock * 2) * 6, 132, '#fff3df', 2);
        return;
      }
      const by = 306 - this.h, w = Math.sin(G.clock * 18) * this.wob * 6, sway = Math.sin(G.clock * 1.3) * 1.2;
      ln(1000, 90, 1000 + sway, by - 70, '#fff3df', 2.5);
      if (this.h > 2) ell(1000, 306, 50 * (1 - this.h / 160), 12 * (1 - this.h / 160), '#5a3f6a30');
      g.save(); g.translate(1000 + sway + w, by);
      rrect(-48, -26, 96, 26, 8, '#ff9fcf'); rrect(-48, -26, 96, 8, 6, '#fff');
      rrect(-36, -48, 72, 24, 8, '#ffd0e5'); rrect(-36, -48, 72, 7, 6, '#fff');
      rrect(-24, -66, 48, 20, 7, '#ff9fcf'); rrect(-24, -66, 48, 6, 5, '#fff');
      for (let i = 0; i < 7; i++) ell(-42 + i * 14, -18, 3, 5, '#fff');
      circ(0, -72, 7, '#e0457a'); ell(-2, -75, 2.5, 1.5, '#fff');
      for (let i = 0; i < 3; i++) ln(-12 + i * 12, -66, -12 + i * 12, -78, '#fff5b0', 2);
      g.restore();
    }
  });

  /* ---- THE RICKETY OVEN ---- */
  P.push({
    id: 'oven', opp: 'oven', x: 660, y: 466, state: 'ok', t: 0, dx: 660, dy: 440, dr: 46,
    hit(px, py) { if (this.state === 'boom') return null; return px > 636 && px < 684 && py > 404 && py < 470 ? { kind: 'oven' } : null; },
    shot(hit, ammo) {
      if (this.state !== 'ok') return 'lure';
      this.state = 'heat'; this.t = ammo === 'bomb' ? .05 : 2.2; sfx('clank'); discover('oven');
      const j = G.byId.judge; if (j?.alive && dist(j.x, j.y, 660, 466) < 140) say(j, 'Is it hot in here?', 2);
      return 'prop';
    },
    update(dt) {
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
    draw() {
      const x = 660, y = 466, s = this.state === 'heat' ? Math.sin(G.clock * 60) * 2 : 0;
      ell(x + 4, y + 3, 30, 8, '#5a3f6a30');
      if (this.state === 'boom') { rrect(x - 22, y - 30, 44, 30, 5, '#3a2a3a'); for (let i = 0; i < 4; i++) ln(x - 18 + i * 12, y - 30, x - 22 + i * 14, y - 44, '#2a1e2a', 4); return; }
      g.save(); g.translate(s, 0);
      ln(x + 10, y - 50, x + 10, y - 66, '#9a6a7a', 7);
      rrect(x - 22, y - 52, 44, 52, 6, '#c38a66');
      rrect(x - 22, y - 52, 44, 8, 4, '#e7b391');
      const hot = this.state === 'heat' ? .5 + Math.sin(G.clock * 20) * .5 : 0;
      rrect(x - 15, y - 38, 30, 24, 4, hot ? `rgb(255,${120 - hot * 60},${80 - hot * 60})` : '#5a3a2a');
      rrect(x - 12, y - 35, 24, 6, 3, '#ffb84c88');
      circ(x - 10, y - 6, 3, '#fff0cc'); circ(x, y - 6, 3, '#fff0cc'); circ(x + 10, y - 6, 3, '#fff0cc');
      g.restore();
    }
  });

  /* ---- GIANT GUMBALL MACHINE ---- */
  P.push({
    id: 'gumball', opp: 'gumball', x: 300, y: 244, state: 'ok', balls: [], dx: 300, dy: 180, dr: 50,
    hit(px, py) { if (this.state !== 'ok') return null; return dist(px, py, 300, 168) < 38 || (Math.abs(px - 300) < 16 && py > 200 && py < 244) ? { kind: 'globe' } : null; },
    shot() {
      if (this.state !== 'ok') return 'lure';
      this.state = 'broken'; sfx('glass'); sfx('rumble'); shake(10); discover('gumball');
      spray(300, 168, ['#c1f6ff', '#ffffff', '#ff599c', '#ffcc4c', '#83dc65'], 50, 1);
      for (let i = 0; i < 34; i++) this.balls.push({ d: -i * 10 - rand(0, 20), off: rand(-16, 16), sp: rand(170, 230), c: PAL_KEYS[i % 6], r: rand(6, 9), x: 300, y: 200, live: true });
      accident(npcsIn(300, 256, 80, 46), 'gumball');
      startle(300, 250, 240, null);
      return 'prop';
    },
    update(dt) {
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
    draw() {
      const x = 300, y = 244;
      ell(x + 4, y + 4, 30, 9, '#5a3f6a30');
      if (this.state === 'ok') {
        rrect(x - 20, y - 46, 40, 46, 8, '#e0457a');
        rrect(x - 8, y - 30, 16, 14, 4, '#ffd36b');
        circ(x, y - 76, 38, '#c1f6ffaa');
        const r = rng(3);
        for (let i = 0; i < 40; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 30; circ(x + Math.cos(a) * d, y - 74 + Math.sin(a) * d * .9 + 4, 5, PAL[PAL_KEYS[i % 6]][0]); }
        ringS(x, y - 76, 38, '#ffffffcc', 2); ell(x - 14, y - 96, 10, 6, '#ffffffcc');
        rrect(x - 12, y - 118, 24, 8, 4, '#e0457a');
      } else {
        g.save(); g.translate(x + 10, y - 10); g.rotate(1.2); rrect(-20, -40, 40, 40, 8, '#e0457a'); g.restore();
        for (let i = 0; i < 8; i++) poly([x - 30 + i * 9, y + 2, x - 26 + i * 9, y - 8, x - 22 + i * 9, y + 2], '#c1f6ffcc');
      }
      for (const b of this.balls) if (b.d >= 0) { ell(b.x, b.y + b.r * .7, b.r, b.r * .35, '#5a3f6a30'); circ(b.x, b.y, b.r, PAL[b.c][0]); circ(b.x - b.r * .3, b.y - b.r * .35, b.r * .3, '#fff'); }
    }
  });

  /* ---- THE DUCK DOCK (ground layer) ---- */
  P.push({
    id: 'dock', opp: 'dock', ground: true, x: 584, y: 908, state: 'ok', t: 0, dx: 584, dy: 920, dr: 70,
    hit(px, py) {
      if (this.state !== 'ok') return null;
      for (const ppx of [552, 622]) if (Math.abs(px - ppx) < 9 && py > 922 && py < 958) return { kind: 'post', precise: true };
      return null;
    },
    shot(hit, ammo) {
      this.state = 'collapse'; this.t = 0; G.flags.dockGone = true; sfx('crack'); sfx('splash'); discover('dock');
      for (const n of G.npcs) if (n.alive && n.x > 508 && n.x < 660 && n.y > 878 && n.y < 940) fallIn(n, 'dock', rand(.1, .35));
      return 'prop';
    },
    update(dt) { if (this.state === 'collapse') { this.t += dt; if (this.t > 1.2) this.state = 'broken'; if (Math.random() < dt * 30) splashAt(rand(520, 650), rand(895, 930)); } },
    draw() {
      if (this.state === 'broken') { rrect(546, 922, 10, 18, 2, '#a8704f'); rrect(616, 924, 10, 14, 2, '#a8704f'); for (let i = 0; i < 4; i++) rrect(520 + i * 32, 900 + Math.sin(G.clock + i) * 3, 22, 6, 2, '#d9a77ecc'); return; }
      const k = this.state === 'collapse' ? clamp(this.t / 1, 0, 1) : 0;
      g.save(); g.globalAlpha = 1 - k * .6; g.translate(0, k * 18);
      rrect(548, 924, 8, 32, 2, '#8f5a3a'); rrect(618, 924, 8, 32, 2, '#8f5a3a');
      rrect(512, 884, 146, 42, 5, '#b07a52');
      rrect(512, 880, 146, 42, 5, '#e3b285');
      for (let i = 0; i < 8; i++) ln(520 + i * 18, 882, 520 + i * 18, 920, '#c9966b', 2);
      rrect(654, 876, 10, 26, 3, '#c9966b');
      g.restore();
    }
  });

  /* ---- THE BEEHIVE ---- */
  P.push({
    id: 'hive', opp: 'hive', x: 1640, y: 676, state: 'ok', bees: [], dx: 1620, dy: 610, dr: 40, fallT: 0,
    hit(px, py) { if (this.state !== 'ok') return null; return dist(px, py, 1612, 614) < 16 ? { kind: 'hive', precise: true } : null; },
    shot() {
      this.state = 'fallen'; sfx('buzz'); discover('hive');
      const vic = npcsIn(1600, 690, 170, 104);
      for (const n of vic) beeChase(n);
      for (let i = 0; i < 26; i++) this.bees.push({ x: 1612, y: 620, a: rand(0, TAU), who: vic.length ? vic[i % vic.length] : null, life: rand(8, 14) });
      return 'prop';
    },
    update(dt) {
      if (this.state === 'fallen') this.fallT = Math.min(1, this.fallT + dt * 2.5);
      for (const b of this.bees) {
        b.life -= dt; b.a += dt * rand(6, 10);
        const tx = b.who?.alive ? b.who.x : 1612, ty = b.who?.alive ? b.who.y - 20 : 620;
        b.x += (tx + Math.cos(b.a) * 16 - b.x) * Math.min(1, dt * 5); b.y += (ty + Math.sin(b.a * 1.3) * 12 - b.y) * Math.min(1, dt * 5);
      }
      this.bees = this.bees.filter(b => b.life > 0);
    },
    draw() {
      const x = 1640, y = 676;
      ell(x + 8, y + 4, 44, 12, '#4a6a3c30');
      ln(x, y, x, y - 70, '#a8704f', 12); ln(x - 4, y - 50, x - 30, y - 64, '#a8704f', 6);
      circ(x, y - 108, 44, '#5fb86a'); circ(x - 30, y - 90, 30, '#5fb86a'); circ(x + 30, y - 92, 32, '#5fb86a');
      circ(x - 4, y - 114, 36, '#7fd47f'); circ(x + 22, y - 100, 22, '#7fd47f');
      for (const [a, b] of [[-20, -120], [16, -128], [30, -96], [-34, -92]]) circ(x + a, y + b, 4, '#ff8fc1');
      const hy = this.state === 'ok' ? 614 : lerp(614, 676, this.fallT);
      if (this.state === 'ok') ln(1612, 600, 1612, 606, '#a8704f', 2);
      g.save(); g.translate(1612, hy); if (this.state !== 'ok') g.rotate(this.fallT * 1.4);
      ell(0, 0, 13, 15, '#ffcc4c'); for (let i = -1; i <= 1; i++) ell(0, i * 6, 13 - Math.abs(i) * 2, 2, '#d58c21'); circ(0, 6, 3, '#50334f');
      g.restore();
      for (const b of this.bees) { ell(b.x, b.y, 3, 2.2, '#ffcc4c'); ln(b.x - 1, b.y - 2, b.x + 1, b.y + 2, '#50334f', 1); ell(b.x, b.y - 2.5, 2, 1.2, '#ffffffcc'); }
    }
  });

  /* ---- THE MAYPOLE ---- */
  P.push({
    id: 'maypole', opp: 'maypole', x: 1350, y: 968, state: 'up', k: 0, dx: 1350, dy: 860, dr: 40,
    top() { const a = this.k * Math.PI / 2; return [1350, 968 - 150 * Math.cos(a) + 108 * Math.sin(a)]; },
    hit(px, py) {
      if (this.state !== 'up') return null;
      if (dist(px, py, 1350, 818) < 14) return { kind: 'knot', precise: true };
      if (Math.abs(px - 1350) < 6 && py > 830 && py < 968) return { kind: 'pole' };
      return null;
    },
    shot(hit, ammo) {
      if (hit.kind === 'pole' && ammo !== 'bomb') { sfx('thunk'); startle(1350, 968, 120, 'Did the maypole just twang?'); return 'lure'; }
      this.state = 'fall'; this.k = 0; sfx('crack'); discover('maypole'); crowdSay(1350, 970, 200, 'shocked', 4);
      return 'prop';
    },
    update(dt) {
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
    draw() {
      const [tx, ty] = this.top();
      ell(1354, 972, 14, 5, '#5a3f6a30');
      // ribbons to dancers
      if (this.state === 'up') {
        const cols = ['#ff7fb2', '#ffe066', '#7fd9ff', '#a9f07f', '#c7a6ff'];
        let i = 0;
        for (const n of G.npcs) if (n.alive && n.step?.circle && !n.react && dist(n.x, n.y, 1350, 968) < 110) { ln(tx, ty + 4, n.x, n.y - n.r, cols[i++ % 5], 2); }
        if (!i) for (let j = 0; j < 6; j++) { const a = j / 6 * TAU; ln(tx, ty + 4, 1350 + Math.cos(a) * 16, 968 + Math.sin(a) * 6 - 14, cols[j % 5], 2); }
      }
      g.beginPath(); g.moveTo(1350, 968); g.lineTo(tx, ty); g.strokeStyle = '#fff3df'; g.lineWidth = 8; g.lineCap = 'round'; g.stroke();
      g.setLineDash([8, 8]); g.strokeStyle = '#ff5c9e'; g.lineWidth = 8; g.stroke(); g.setLineDash([]);
      circ(tx, ty, 9, '#ffd36b'); circ(tx - 5, ty - 3, 4, '#ff8fc1'); circ(tx + 5, ty - 2, 4, '#7fd9ff'); circ(tx, ty - 7, 4, '#ffffff');
    }
  });

  /* ---- THE BARONESS'S BALLOON ---- */
  P.push({
    id: 'balloon', opp: 'balloon', x: 1665, y: 262, h: 380, vy: 0, state: 'arrive', rider: null, t: 0, dx: 1665, dy: 150, dr: 70,
    envY() { return 262 - this.h - 120; },
    hit(px, py) {
      if (['deflated', 'crashed', 'gone'].includes(this.state)) return null;
      return inEll(px, py, { x: 1665, y: this.envY(), rx: 52, ry: 60 }) ? { kind: 'env' } : null;
    },
    shot() {
      discover('balloon');
      const air = this.h > 24;
      if (air && this.rider?.alive) { this.state = 'falling'; this.vy = 0; sfx('pop'); sfx('whistle'); G.flags.balloonGone = true; handler('Oh dear. Gravity.'); return 'prop'; }
      if (air) { this.state = 'falling'; this.vy = 0; sfx('pop'); G.flags.balloonGone = true; return 'prop'; }
      this.state = 'deflated'; G.flags.balloonGone = true; sfx('pop'); sfx('deflate');
      if (this.rider?.alive) { this.rider.inBalloon = false; this.rider.y = 280; this.rider = null; }
      handler(HANDLER.balloonDown);
      const b = G.byId.baroness; if (b?.alive) say(b, LINES.balloonGone[0], 3);
      return 'prop';
    },
    update(dt) {
      const B = G.byId.baroness;
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
    draw() {
      const x = 1665, h = this.h;
      if (this.state === 'gone') return;
      if (this.state === 'deflated' || this.state === 'crashed') {
        ell(x - 30, 262, 60, 18, '#ff7fb2'); ell(x - 34, 258, 48, 12, '#ffd0e5');
        rrect(x - 18, 240, 36, 24, 5, this.state === 'crashed' ? '#6b4a3a' : '#c9966b');
        return;
      }
      ell(x, 262, 40 * (1 - Math.min(h, 300) / 400), 12 * (1 - Math.min(h, 300) / 400), '#5a3f6a30');
      const ey = this.envY(), by = 262 - h;
      const sway = Math.sin(G.clock * 1.2) * (h > 5 ? 5 : 0);
      g.save(); g.translate(sway, 0);
      ln(x - 30, ey + 40, x - 16, by - 22, '#a8704f', 1.5); ln(x + 30, ey + 40, x + 16, by - 22, '#a8704f', 1.5);
      ell(x, ey, 52, 60, '#ff7fb2');
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(x + i * 18, ey, Math.max(1, 10 - Math.abs(i) * 2), 59 - Math.abs(i) * 6, 0, 0, TAU); g.fillStyle = i % 2 ? '#fff0cc' : '#ffb3d1'; g.fill(); }
      ell(x - 18, ey - 30, 12, 18, '#ffffff66');
      g.beginPath(); g.moveTo(x - 30, ey + 46); g.lineTo(x + 30, ey + 46); g.lineTo(x + 12, ey + 62); g.lineTo(x - 12, ey + 62); g.fillStyle = '#ff5c9e'; g.fill();
      rrect(x - 18, by - 24, 36, 4, 2, '#8f5a3a');
      if (this.rider?.alive) drawNPC(this.rider, h + 6);
      rrect(x - 18, by - 22, 36, 24, 5, '#c9966b');
      for (let i = 0; i < 4; i++) ln(x - 14 + i * 9, by - 20, x - 14 + i * 9, by, '#a8704f', 1.5);
      if (this.state === 'falling') txt('!', x + 40, ey - 40, 28, '#ff4d6d');
      g.restore();
    }
  });

  /* ---- FIREWORKS CRATES ---- */
  P.push({
    id: 'fireworks', opp: 'fireworks', x: 1262, y: 288, state: 'ok', t: 0, rockets: [], dx: 1262, dy: 262, dr: 46,
    hit(px, py) { if (this.state !== 'ok') return null; return px > 1230 && px < 1294 && py > 226 && py < 292 ? { kind: 'crates' } : null; },
    shot(hit, ammo) {
      this.state = 'fuse'; this.t = ammo === 'bomb' ? .05 : 1.2; sfx('fuse'); discover('fireworks');
      startle(1262, 300, 90, 'Is something fizzing?');
      return 'prop';
    },
    update(dt) {
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
        if (r.delay > 0) { r.delay -= dt; if (r.delay <= 0) sfx('whoosh', .3); continue; }
        if (!r.burst) { r.x += r.vx * dt; r.y += r.vy * dt; r.vy += 200 * dt; r.t -= dt; if (r.t <= 0) { r.burst = true; sfx('pop', .3); for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; r.parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * rand(80, 160), vy: Math.sin(a) * rand(80, 160), l: rand(.8, 1.4) }); } } }
        for (const p of r.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.vx *= .98; p.l -= dt; }
        r.parts = r.parts.filter(p => p.l > 0);
      }
      this.rockets = this.rockets.filter(r => !r.burst || r.parts.length);
    },
    draw() {
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
    show() {
      this.state = 'show'; sfx('crackle');
      for (let i = 0; i < 24; i++) this.rockets.push({ x: 1262 + rand(-20, 20), y: 260, vx: rand(-160, 160), vy: rand(-560, -400), t: rand(.6, 1.1), delay: i * .28, c: PAL_KEYS[i % PAL_KEYS.length], burst: false, parts: [] });
      crowdSay(1000, 700, 600, 'cheer', 10);
    },
    drawSky() {
      for (const r of this.rockets) {
        if (r.delay > 0) continue;
        if (!r.burst) { circ(r.x, r.y, 3, '#fff5b0'); ln(r.x, r.y, r.x - r.vx * .03, r.y - r.vy * .03, '#ffe06699', 2); }
        for (const p of r.parts) { g.globalAlpha = clamp(p.l, 0, 1); circ(p.x, p.y, 2.6, PAL[r.c][0]); circ(p.x, p.y, 1.2, '#fff'); }
        g.globalAlpha = 1;
      }
    }
  });

  /* ---- RUBBER DUCKS (collectibles) ---- */
  P.push({
    id: 'ducks', ground: true, x: 0, y: 0, list: DUCKS.map(([x, y]) => ({ x, y, alive: true, fly: 0 })),
    hit(px, py) { for (const d of this.list) if (d.alive && dist(px, py, d.x, d.y - 5) < 10) return { kind: 'duck', d, precise: true }; return null; },
    shot(hit) {
      hit.d.alive = false; hit.d.fly = 1; sfx('quack');
      G.stats.ducks++; floater(hit.d.x, hit.d.y - 20, `QUACK! ${G.stats.ducks}/6`, '#ffe066');
      addScore(150, null);
      if (G.stats.ducks >= DUCKS.length) award('ducks');
      return 'prop';
    },
    update(dt) { for (const d of this.list) if (!d.alive && d.fly > 0) d.fly -= dt; },
    draw() {
      for (const d of this.list) {
        if (!d.alive) { if (d.fly > 0) { const k = 1 - d.fly; g.save(); g.translate(d.x + k * 60, d.y - k * 120); g.rotate(k * 12); duck(0, 0, d.y === 650); g.restore(); } continue; }
        duck(d.x, d.y + Math.sin(G.clock * 2 + d.x) * 1.5, d.x === 990);
      }
    }
  });

  /* ---- GUMDROP GNOMES (sequential collectibles) ---- */
  P.push({
    id: 'gnomes', x: 0, y: 0, idx: 0, shards: 0, sx: 0, sy: 0,
    get yy() { return GNOMES[this.idx]?.[1] ?? 0; },
    hit(px, py) { const p = GNOMES[this.idx]; if (!p) return null; return dist(px, py, p[0], p[1] - 14) < 14 ? { kind: 'gnome', precise: true } : null; },
    shot() {
      const p = GNOMES[this.idx]; sfx('glass'); spray(p[0], p[1] - 10, ['#ff599c', '#ffffff', '#83dc65'], 20, .7);
      this.idx++; G.stats.gnomes = this.idx; addScore(200, null);
      floater(p[0], p[1] - 30, `GNOME ${this.idx}/5`, '#ffe066');
      if (this.idx >= GNOMES.length) award('gnomes'); else toast('ANOTHER GNOME APPEARED…', 'somewhere far away');
      return 'prop';
    },
    update() { this.y = GNOMES[this.idx]?.[1] ?? 0; },
    draw() {
      const p = GNOMES[this.idx]; if (!p) return;
      const [x, y] = p;
      ell(x, y + 2, 10, 4, '#5a3f6a30');
      rrect(x - 8, y - 16, 16, 16, 6, '#7fd9ff');
      circ(x, y - 20, 7, '#ffe0c4');
      ell(x, y - 15, 7, 6, '#ffffff');
      poly([x - 8, y - 24, x + 8, y - 24, x + 2, y - 44], '#ff5c9e');
      circ(x + 2, y - 44, 2.5, '#fff');
      circ(x - 2, y - 21, 1.2, '#50334f'); circ(x + 3, y - 21, 1.2, '#50334f');
      if (Math.sin(G.clock * 3) > .9) txt('✦', x + 12, y - 40, 10, '#fff5b0');
    }
  });

  /* ---- CHOCOLATE FOUNTAIN PUMP ---- */
  P.push({
    id: 'pump', opp: 'pump', x: 1122, y: 676, state: 'ok', t: 0, dx: 1122, dy: 658, dr: 30,
    hit(px, py) { if (this.state !== 'ok') return null; return px > 1106 && px < 1138 && py > 638 && py < 678 ? { kind: 'pump' } : null; },
    shot(hit, ammo) {
      if (this.state !== 'ok') return 'lure';
      this.state = 'surge'; this.t = ammo === 'bomb' ? .05 : 1.4; sfx('clank'); sfx('rumble'); discover('pump');
      startle(1000, 630, 160, 'Is the fountain... gurgling?');
      return 'prop';
    },
    update(dt) {
      if (this.state === 'surge') {
        this.t -= dt; if (Math.random() < dt * 30) G.parts.push({ type: 'blob', x: 1000 + rand(-40, 40), y: 630, vx: rand(-20, 20), vy: rand(-120, -60), r: rand(3, 5), c: '#7a4630', hl: '#a8704f', life: .6, g: 300 });
        if (this.t <= 0) {
          this.state = 'blown'; G.flags.chocFlood = true; shake(12); sfx('splat'); sfx('splash');
          for (let i = 0; i < 90; i++) { const a = rand(0, TAU), s = rand(60, 260); G.parts.push({ type: 'blob', x: 1000, y: 600, vx: Math.cos(a) * s, vy: -rand(200, 420), r: rand(3, 8), c: pick(['#7a4630', '#5a2c1a', '#a8704f']), hl: '#c38a66', life: rand(.8, 1.4), g: 520 }); }
          const vic = npcsIn(1000, 630, 112, 64);
          const ev = ++G.eventId;
          for (const n of vic) killNPC(n, { cause: 'fountain', accident: true, concealed: true, ev });
          const tk = (G.evKills[ev] || []).filter(id => G.byId[id].kind === 'target');
          if (tk.includes('mayor') && tk.includes('baroness')) award('fondue');
          if (vic.length > 1) toast(`${vic.length}× FONDUE'D`, 'drowned in chocolate');
          if (tk.length) handler(pick(HANDLER.accident));
          crowdSay(1000, 640, 300, 'shocked', 5);
        }
      }
    },
    draw() {
      const x = 1122, y = 676, s = this.state === 'surge' ? Math.sin(G.clock * 60) * 1.5 : 0;
      ell(x + 3, y + 2, 18, 5, '#5a3f6a30');
      ln(x - 12, y - 8, 1070, y - 22, '#c99ab8', 6);
      g.save(); g.translate(s, 0);
      rrect(x - 14, y - 34, 28, 34, 6, this.state === 'blown' ? '#5b4458' : '#e8a0c8');
      circ(x, y - 22, 8, '#fff3df'); ln(x, y - 22, x + (this.state === 'surge' ? Math.sin(G.clock * 40) * 6 : 5), y - 26, '#e0457a', 2);
      rrect(x - 10, y - 10, 20, 5, 2, '#a8608d');
      if (this.state === 'blown') for (let i = 0; i < 3; i++) circ(x - 6 + i * 6, y - 40 - ((G.clock * 20 + i * 7) % 20), 4, '#ffffff55');
      g.restore();
    }
  });

  /* ---- chocolate fountain discovery-only ---- */
  P.push({ id: 'fountain', opp: 'fountain', ground: true, x: 1000, y: 640, dx: 1000, dy: 640, dr: 60, hit() { return null; }, draw() { } });

  return P;
}

function duck(x, y, choc) {
  ell(x, y + 1, 9, 3, '#4aa8c870');
  ell(x, y - 4, 8, 6, choc ? '#c38a66' : '#ffe066');
  circ(x + 5, y - 10, 4.5, choc ? '#c38a66' : '#ffe066');
  poly([x + 8, y - 11, x + 13, y - 9, x + 8, y - 8], '#ff9464');
  circ(x + 6, y - 11, 1, '#50334f');
}

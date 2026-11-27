// Level 1 set pieces (Spring Break boardwalk), in the clay-diorama style with the sun-bleached coast palette (DEC-09).
// Each piece is built at its origin (ground centre, +z toward the perch, i.e. its front) so the workshop can show it
// alone and the diorama can place it. Units: one jelly is about 1 tall.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clay, glossy, mesh, sph, cyl, cone, tor, G } from './jelly-rig.js';

export const PAL = {
  sand: '#f3d6a0', sandHi: '#f8e4b8', wetSand: '#d9b47e', wood: '#c99a6a', woodHi: '#dcb488', woodDk: '#9a6a44',
  sea: '#2bb5c8', deep: '#1683a6', pool: '#4fd0ec', foam: '#fffaf2', white: '#fff6ea', cream: '#fff1d6',
  pink: '#ff4f9a', flamingo: '#ff86b0', coral: '#ff6b5a', orange: '#ff8a3c', sun: '#ffc93c', lemon: '#ffe066',
  teal: '#2fc4a8', mint: '#8ee8cf', palm: '#4fb04a', palmDk: '#2f8a3a', trunk: '#b9875a', asphalt: '#6f6a78', stone: '#e8dccb',
  red: '#e8343c', navy: '#22305a', ink: '#2a2035',
};
const rbox = (w, h, d, r = .12) => G(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)));
export const box = (g, w, h, d, mat, x = 0, y = 0, z = 0, r) => mesh(rbox(w, h, d, r ?? Math.min(w, h, d) * .18), mat, g, x, y + h / 2, z);
function stripes(cols, n, w = 256, h = 64, diag = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), s = w / n;
  for (let i = 0; i < n + 2; i++) { g.fillStyle = cols[i % cols.length];
    if (diag) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s + s, 0); g.lineTo(i * s, h); g.lineTo(i * s - s, h); g.fill(); } else g.fillRect(i * s, 0, s, h); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const texCache = new Map();
const striped = (key, cols, n, rep = [1, 1], diag = false) => {
  if (!texCache.has(key)) { const t = stripes(cols, n, 256, 64, diag); t.repeat.set(...rep); texCache.set(key, clay('#ffffff', .4, { map: t, side: THREE.DoubleSide })); }
  return texCache.get(key);
};
// painted sign: text on a clay board
export function signMat(text, { bg = PAL.cream, fg = PAL.pink, w = 512, h = 128, font = 800, size = 72, stroke = null, glow = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.font = `${font} ${size}px "Baloo 2", "Fredoka", ui-rounded, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (glow) { g.shadowColor = fg; g.shadowBlur = 18; }
  if (stroke) { g.lineWidth = 10; g.strokeStyle = stroke; g.strokeText(text, w / 2, h / 2 + 4); }
  g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return glow ? new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: .9, roughness: .6 })
              : clay('#ffffff', .25, { map: t });
}
function board(g, text, w, h, opts, x, y, z, ry = 0) {
  const face = signMat(text, opts), side = clay(opts.edge ?? PAL.white, .4);
  const m = mesh(rbox(w, h, .2, .07), [side, side, side, side, face, side], g, x, y, z); m.rotation.y = ry; return m;
}
const tick = [];   // animated bits: (t) => void, collected per piece in userData.tick
const anim = (g, f) => { (g.userData.tick ??= []).push(f); };

/* ======================= nature ======================= */
export function palm(h = 6, lean = .25, seed = Math.random()) {
  const g = new THREE.Group(), tm = clay(PAL.trunk, 1.2), lm = clay(PAL.palm, .6, { side: THREE.DoubleSide }), lm2 = clay(PAL.palmDk, .6, { side: THREE.DoubleSide });
  const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(Math.sin(t * 1.4) * lean * h * .35, t * h, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  // ringed trunk: stacked squashed tori read as clay coils
  for (let i = 0; i < 12; i++) { const t = (i + .5) / 12, p = curve.getPoint(t), r = .3 - t * .1;
    const s = mesh(sph(1, 14, 8), i % 2 ? tm : clay('#a87a50', 1.2), g, p.x, p.y, p.z); s.scale.set(r, h / 12 * .62, r); }
  const top = curve.getPoint(1);
  const frond = G('frond', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.5, .42, 2.4, .05); s.quadraticCurveTo(.9, -.22, 0, 0);
    const geo = new THREE.ShapeGeometry(s, 10).rotateX(-Math.PI / 2), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, -x * x * .13); } geo.computeVertexNormals(); return geo; });
  for (let i = 0; i < 8; i++) { const f = mesh(frond, i % 2 ? lm : lm2, g, top.x, top.y, top.z); f.rotation.set(0, i / 8 * Math.PI * 2 + seed * 3, (i % 2 ? .15 : -.05)); f.scale.setScalar(h / 6 * 1.05); }
  for (let i = 0; i < 3; i++) mesh(sph(.2, 12, 8), clay('#6b4a2a', .8), g, top.x + Math.cos(i * 2.1) * .22, top.y - .2, top.z + Math.sin(i * 2.1) * .22);
  g.userData.top = top;
  return g;
}
export function bush(s = 1, col = PAL.palm) {
  const g = new THREE.Group(), m = clay(col), hi = clay(new THREE.Color(col).offsetHSL(0, 0, .08).getStyle());
  [[0, .7, 0, 1], [-.9, .5, .2, .8], [.9, .55, .1, .85], [-.3, 1.1, -.2, .7], [.4, 1.15, -.1, .65]].forEach(([dx, dy, dz, r], i) => mesh(sph(r * s, 16, 12), i > 2 ? hi : m, g, dx * s, dy * s, dz * s));
  return g;
}

/* ======================= beach ======================= */
export function umbrella(cols = [PAL.coral, PAL.white]) {
  const g = new THREE.Group();
  mesh(cyl(.05, .05, 2.6, 8), clay(PAL.white), g, 0, 1.3, 0).rotation.z = .12;
  const canopy = mesh(G('umb', () => new THREE.ConeGeometry(1.5, .55, 16, 1, true)), striped('umb' + cols, cols, 16, [1, 1]), g, -.15, 2.55, 0);
  canopy.rotation.z = .12;
  mesh(sph(.08), clay(cols[0]), g, -.2, 2.86, 0);
  return g;
}
export function towel(col = PAL.pink) {
  const g = new THREE.Group(); const t = mesh(rbox(.9, .04, 1.8, .02), striped('towel' + col, [col, PAL.white], 6, [1, 1]), g, 0, .02, 0); return g;
}
export function beachChair(col = PAL.teal) {
  const g = new THREE.Group(), f = clay(PAL.white), s = striped('chair' + col, [col, PAL.white], 8);
  const seat = mesh(rbox(.8, .06, 1, .02), s, g, 0, .35, .2); seat.rotation.x = -.15;
  const back = mesh(rbox(.8, .06, 1, .02), s, g, 0, .75, -.45); back.rotation.x = 1.0;
  for (const x of [-.4, .4]) { mesh(cyl(.03, .03, 1, 6), f, g, x, .35, .1).rotation.x = 1.1; mesh(cyl(.03, .03, 1, 6), f, g, x, .35, -.1).rotation.x = -1.1; }
  return g;
}
export function lifeguardTower(col = PAL.red, leaning = false) {
  const g = new THREE.Group(), w = clay(PAL.white), r = clay(col), wd = clay(PAL.woodHi, .9);
  const legs = new THREE.Group(); g.add(legs);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = mesh(cyl(.09, .11, 3.2, 8), w, legs, x * .95, 1.6, z * .85); l.rotation.set(-z * .08, 0, x * .08); }
  for (const y of [.9, 2.1]) for (const z of [-1, 1]) { const b = mesh(cyl(.05, .05, 2, 6), w, legs, 0, y, z * .82); b.rotation.z = Math.PI / 2; }
  // ramp
  const ramp = mesh(rbox(.9, .08, 3.6, .03), wd, g, 0, 1.5, -2.6); ramp.rotation.x = .95;   // at the back: the tower faces the water
  const deck = box(g, 2.4, .16, 2.2, wd, 0, 3.15, 0);
  const hut = new THREE.Group(); hut.position.y = 3.3; g.add(hut);
  box(hut, 2.1, 1.5, 1.7, r, 0, 0, -.1, .12);
  const win = mesh(rbox(1.5, .7, .1, .05), glossy('#bfeaff'), hut, 0, .95, .72); win.castShadow = false;
  const roof = mesh(G('lgroof', () => new THREE.ConeGeometry(1.75, .8, 4, 1)), w, hut, 0, 1.9, -.1); roof.rotation.y = Math.PI / 4; roof.scale.z = .85;
  // rail and flag
  for (const x of [-1.1, 1.1]) mesh(cyl(.04, .04, .7, 6), w, g, x, 3.6, 1.05);
  const rail = mesh(cyl(.04, .04, 2.2, 6), w, g, 0, 3.95, 1.05); rail.rotation.z = Math.PI / 2;
  mesh(cyl(.03, .03, 1.6, 6), w, hut, .9, 2.4, -.1);
  const flag = mesh(G('lgflag', () => new THREE.PlaneGeometry(.7, .45, 6, 1).translate(.35, 0, 0)), clay(col, .3, { side: THREE.DoubleSide }), hut, .92, 3.0, -.1);
  anim(g, t => { flag.rotation.y = Math.sin(t * 3) * .25; });
  if (leaning) g.rotation.z = .06;   // the tower leg accident: one tower leans
  board(hut, 'LIFEGUARD', 1.6, .34, { bg: PAL.white, fg: col, size: 66, edge: PAL.white }, 0, .2, .78);
  return g;
}
export function volleyballCourt() {
  const g = new THREE.Group(), w = clay(PAL.white), line = clay(PAL.white, .3);
  for (const [w2, d, x, z] of [[8, .1, 0, -4], [8, .1, 0, 4], [.1, 8, -4, 0], [.1, 8, 4, 0]]) { const m = mesh(rbox(w2, .02, d, .01), line, g, x, .01, z); m.receiveShadow = true; m.castShadow = false; }
  for (const x of [-4.4, 4.4]) { mesh(cyl(.09, .09, 2.6, 8), clay(x < 0 ? PAL.sun : PAL.coral), g, x, 1.3, 0); mesh(sph(.13), w, g, x, 2.65, 0); }
  const net = mesh(G('net', () => new THREE.PlaneGeometry(8.8, .8)), new THREE.MeshStandardMaterial({ map: netTex(), transparent: true, alphaTest: .3, side: THREE.DoubleSide, roughness: .9 }), g, 0, 2.1, 0);
  net.rotation.y = Math.PI / 2; net.rotation.y = 0;
  const band = mesh(rbox(8.8, .1, .04, .02), w, g, 0, 2.5, 0);
  const ball = mesh(sph(.22, 16, 12), clay(PAL.white), g, 1.2, 3.2, 1);
  anim(g, t => { const k = (t * .55) % 2, s = k < 1 ? k : 2 - k; ball.position.set(-2.5 + s * 5, 1 + Math.sin(s * Math.PI) * 3.6, 1.6 - s * 3.2); });
  // the spring-loaded pole (accident): a coil at the far pole's base
  mesh(tor(.18, .05), clay(PAL.ink), g, 4.4, .25, 0).rotation.x = Math.PI / 2;
  mesh(tor(.18, .05), clay(PAL.ink), g, 4.4, .4, 0).rotation.x = Math.PI / 2;
  return g;
}
function netTex() { const c = document.createElement('canvas'); c.width = 256; c.height = 32; const g = c.getContext('2d');
  g.strokeStyle = '#fbf6ee'; g.lineWidth = 2; for (let x = 0; x <= 256; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 32); g.stroke(); } for (let y = 0; y <= 32; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
// Lily's sandcastle: a scale replica of the Grand Flamingo
export function sandcastle() {
  const g = new THREE.Group(), s = clay(PAL.wetSand, 1.6), s2 = clay('#e6c38c', 1.6);
  box(g, 1.6, .3, 1.2, s, 0, 0, 0, .1);
  for (const [x, z, h] of [[-.6, -.4, .9], [.6, -.4, .8], [-.6, .4, .7], [.6, .4, .75]]) { mesh(cyl(.16, .2, h, 10), s2, g, x, h / 2 + .3, z); mesh(cone(.2, .25, 10), s, g, x, h + .42, z); }
  box(g, .7, 1.1, .5, s2, 0, .3, -.1, .06);
  mesh(cyl(.01, .01, .5, 4), clay(PAL.white), g, 0, 1.7, -.1);
  const f = mesh(G('castleflag', () => new THREE.PlaneGeometry(.25, .15).translate(.125, 0, 0)), clay(PAL.flamingo, .3, { side: THREE.DoubleSide }), g, 0, 1.88, -.1);
  mesh(cyl(.2, .14, .24, 10, true), clay(PAL.red, .4, { side: THREE.DoubleSide }), g, 1.1, .12, .5);   // bucket
  return g;
}
export function iceCreamCart() {
  const g = new THREE.Group();
  box(g, 1.8, 1, 1, clay(PAL.white), 0, .35, 0, .2);
  box(g, 1.82, .3, 1.02, clay(PAL.mint), 0, .7, 0, .1);
  for (const x of [-.6, .6]) { const w = mesh(cyl(.3, .3, .12, 14), clay(PAL.ink), g, x, .3, .5); w.rotation.x = Math.PI / 2; }
  mesh(cyl(.04, .04, 2, 6), clay(PAL.white), g, -.8, 1.9, 0);
  const u = mesh(G('cartumb', () => new THREE.ConeGeometry(1.2, .45, 12, 1, true)), striped('cartumb', [PAL.mint, PAL.white], 12), g, -.8, 2.85, 0);
  for (const [x, c] of [[.2, '#ff9ac8'], [.55, '#fff4e6'], [-.15, '#8ad84a']]) mesh(sph(.16), clay(c), g, x, 1.5, 0);
  board(g, 'FROSTY', 1.2, .3, { bg: PAL.white, fg: '#3cc8e0', size: 70 }, 0, .9, .52);
  return g;
}

/* ======================= boardwalk ======================= */
// a stall: counter, striped awning, sign. Each vendor gets one with its own colours and sign
export function stall({ sign = 'MARGARITAS', cols = [PAL.lemon, PAL.white], body = PAL.teal, w = 3.2, extra } = {}) {
  const g = new THREE.Group(), wd = clay(PAL.woodHi, .9);
  box(g, w, 1.1, 1.4, clay(body), 0, 0, 0, .15);
  box(g, w + .2, .14, 1.6, wd, 0, 1.1, .05, .06);
  for (const x of [-w / 2 + .1, w / 2 - .1]) mesh(cyl(.07, .07, 1.8, 8), clay(PAL.white), g, x, 2.1, .6);
  box(g, w, 2.6, .2, clay(body), 0, 0, -.7, .08);
  const aw = mesh(G(`awn${w}`, () => new THREE.CylinderGeometry(.9, .9, w + .2, 16, 1, true, 0, Math.PI).rotateZ(Math.PI / 2)), striped('awn' + cols, cols, 10, [1, 1]), g, 0, 2.95, .15);
  aw.rotation.x = -.5; aw.scale.set(1, .5, 1);
  // scalloped awning edge
  for (let i = 0; i < Math.round(w * 2.2); i++) mesh(sph(.13, 10, 6, ), clay(cols[i % 2]), g, -w / 2 + .1 + i * (w - .2) / (Math.round(w * 2.2) - 1), 2.62, .95);
  board(g, sign, w * .85, .55, { bg: PAL.cream, fg: PAL.pink, size: 64 }, 0, 3.55, -.55);
  if (extra) extra(g);
  return g;
}
export function hotDogCart() {
  const g = new THREE.Group();
  box(g, 2, 1, 1, clay(PAL.red), 0, .35, 0, .2);
  for (const x of [-.6, .6]) { const w = mesh(cyl(.3, .3, .12, 14), clay(PAL.ink), g, x, .3, .5); w.rotation.x = Math.PI / 2; }
  box(g, 2.1, .1, 1.1, glossy('#d8dde6', { metalness: .6, roughness: .3 }), 0, 1.35, 0);
  const tank = mesh(cyl(.22, .22, .7, 12), glossy('#f4f4f8'), g, 1.25, .75, 0); tank.userData.label = 'propane tank';   // the propane accident
  mesh(cyl(.08, .08, .1, 8), glossy(PAL.red), g, 1.25, 1.15, 0);
  const dog = mesh(G('bigdog', () => new THREE.CapsuleGeometry(.35, 1.5, 6, 12)), clay('#c8503a'), g, 0, 2.6, 0); dog.rotation.z = Math.PI / 2;
  const bun = mesh(G('bigbun', () => new THREE.CapsuleGeometry(.4, 1.3, 6, 12)), clay('#e8b060', 1.2), g, 0, 2.38, 0); bun.rotation.z = Math.PI / 2; bun.scale.z = 1.25;
  mesh(cyl(.05, .05, 1, 6), clay(PAL.white), g, 0, 1.85, 0);
  const mustard = mesh(G('mustard', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([-.8, -.4, 0, .4, .8].map((x, i) => new THREE.Vector3(x, 2.98 + (i % 2) * .08, 0))), 20, .06, 6)), clay(PAL.sun, .3), g);
  board(g, "HAL'S DOGS", 1.6, .32, { bg: PAL.white, fg: PAL.red, size: 62 }, 0, .9, .52);
  return g;
}
export function arcade() {
  const g = new THREE.Group(), body = clay('#7a4cff');
  box(g, 5, 3.6, 3.2, body, 0, 0, -.6, .2);
  box(g, 5.4, .5, 3.4, clay(PAL.pink), 0, 3.6, -.6, .15);
  board(g, 'ARCADE', 3.6, .9, { bg: '#2a2035', fg: '#7fffe0', size: 84, glow: true, edge: '#2a2035' }, 0, 4.6, .2);
  box(g, 2.4, 2.4, .1, glossy('#1c1426'), 0, .2, 1.0, .05);   // open front
  // the claw machine at the front
  const cm = new THREE.Group(); cm.position.set(1.6, 0, 1.6); g.add(cm);
  box(cm, .9, .9, .9, clay(PAL.pink), 0, 0, 0, .1);
  const glass = mesh(rbox(.86, 1, .86, .05), glossy('#dff6ff', { transparent: true, opacity: .35 }), cm, 0, 1.4, 0); glass.castShadow = false;
  box(cm, .9, .2, .9, clay(PAL.pink), 0, 1.9, 0, .06);
  for (let i = 0; i < 6; i++) mesh(sph(.1), clay(['#ffd84a', '#4fdcb9', '#ff86c4'][i % 3]), cm, (i % 3 - 1) * .22, 1.0, (i > 2 ? .15 : -.15));
  const claw = mesh(cone(.08, .16, 6), glossy('#d8dde6', { metalness: .6 }), cm, 0, 1.6, 0); claw.rotation.x = Math.PI;
  anim(g, t => { claw.position.x = Math.sin(t * .7) * .25; claw.position.y = 1.6 - Math.max(0, Math.sin(t * .35)) * .4; });
  return g;
}
export function miniGolf() {
  const g = new THREE.Group(), green = clay('#5fce6a', .9);
  box(g, 6, .25, 4, green, 0, 0, 0, .1);
  box(g, 6.2, .35, .2, clay(PAL.white), 0, 0, 2.05); box(g, 6.2, .35, .2, clay(PAL.white), 0, 0, -2.05);
  // Gator Gus's big clay gator mouth (hole 9)
  const gat = new THREE.Group(); gat.position.set(1.2, .25, -.6); g.add(gat);
  const gm = clay('#4a9a4a', 1);
  mesh(sph(1, 16, 12), gm, gat, 0, .6, 0).scale.set(1.6, .6, .9);
  const jaw = mesh(sph(1, 16, 12), gm, gat, 1.4, .9, 0); jaw.scale.set(1.1, .3, .7); jaw.rotation.z = .35;
  for (const z of [-.3, .3]) { mesh(sph(.2), clay(PAL.white), gat, .6, 1.3, z); mesh(sph(.1), clay(PAL.ink), gat, .72, 1.34, z); }
  for (let i = 0; i < 5; i++) mesh(cone(.07, .18, 5), clay(PAL.white), gat, 1 + i * .25, .7, .55 - (i % 2) * 1.1);
  mesh(cyl(.12, .12, .02, 12), clay(PAL.ink), g, -1.8, .26, .8);
  mesh(cyl(.015, .015, .8, 4), clay(PAL.white), g, -1.8, .65, .8);
  board(g, "GATOR GUS'S MINI GOLF", 4.4, .6, { bg: PAL.sun, fg: '#2a6a2a', size: 50, w: 768 }, -.6, 2.4, -1.8);
  mesh(cyl(.06, .06, 2, 6), clay(PAL.white), g, -2.4, 1.1, -1.8); mesh(cyl(.06, .06, 2, 6), clay(PAL.white), g, 1.2, 1.1, -1.8);
  return g;
}
export function shack(sign = 'AIRBRUSH TEES', body = PAL.flamingo) {
  const g = new THREE.Group();
  box(g, 3.4, 2.8, 2.4, clay(body), 0, 0, -.4, .18);
  const roof = mesh(G('shackroof', () => new THREE.ConeGeometry(2.7, 1.1, 4)), clay(PAL.cream), g, 0, 3.35, -.4); roof.rotation.y = Math.PI / 4; roof.scale.z = .75;
  box(g, 2.4, 1.3, .1, glossy('#1c1426'), 0, 1.0, .82, .05);
  // shirts hanging in the window
  for (let i = 0; i < 3; i++) { const s = mesh(rbox(.55, .6, .04, .05), clay(['#ff5a6e', '#3cc8e0', '#ffd84a'][i]), g, -.7 + i * .7, 1.65, .9); }
  board(g, sign, 2.8, .45, { bg: PAL.white, fg: '#3a7aff', size: 58 }, 0, 2.95, .85);
  return g;
}
// Silver Steve's plinth
export function plinth() { const g = new THREE.Group(); box(g, .9, .5, .9, clay(PAL.stone), 0, 0, 0, .08); mesh(cyl(.14, .12, .12, 10), glossy('#bfe8ff', { transparent: true, opacity: .55 }), g, .65, .06, .45); return g; }
// the welcome banner over the boardwalk exit, hung by two chains (the end-of-day accident)
export function welcomeArch() {
  const g = new THREE.Group(), post = clay(PAL.white), w = 7;
  for (const x of [-w / 2, w / 2]) { mesh(cyl(.22, .26, 5.4, 12), post, g, x, 2.7, 0); mesh(sph(.38, 16, 12), glossy(PAL.pink), g, x, 5.6, 0); }
  const beam = mesh(cyl(.12, .12, w, 10), post, g, 0, 5.2, 0); beam.rotation.z = Math.PI / 2;
  const banner = new THREE.Group(); banner.position.y = 3.95; g.add(banner);
  const face = signMat('WELCOME SPRING BREAKERS', { bg: PAL.sun, fg: PAL.pink, w: 1024, h: 160, size: 92, stroke: PAL.white });
  const back = clay(PAL.sun, .4);
  mesh(G('banner', () => { const p = new THREE.PlaneGeometry(w - .6, 1.3, 20, 1), a = p.attributes.position; for (let i = 0; i < a.count; i++) a.setZ(i, Math.sin((a.getX(i) / (w - .6) + .5) * Math.PI) * .12); p.computeVertexNormals(); return p; }), [face], banner).material.side = THREE.FrontSide;
  mesh(G('bannerback', () => new THREE.PlaneGeometry(w - .6, 1.3).rotateY(Math.PI).translate(0, 0, -.02)), back, banner);
  // two chains of links
  const gm = glossy('#b8bcc8', { metalness: .7, roughness: .3 });
  for (const x of [-(w - .8) / 2, (w - .8) / 2]) for (let i = 0; i < 6; i++) { const l = mesh(tor(.06, .018), gm, g, x, 4.65 + i * .09, 0); if (i % 2) l.rotation.y = Math.PI / 2; l.scale.y = 1.4; }
  anim(g, t => { banner.rotation.x = Math.sin(t * 1.3) * .05; });
  return g;
}
export function boardwalkDeck(len = 60, depth = 8) {
  const g = new THREE.Group(), n = Math.round(len / .9);
  const a = clay(PAL.wood, 1.1), b = clay(PAL.woodHi, 1.1), c = clay('#d2a678', 1.1);
  // planks run across the boardwalk (along z), alternating tones; instanced per tone
  const geo = rbox(.84, .18, depth, .05);
  for (const [mat, k] of [[a, 0], [b, 1], [c, 2]]) {
    const im = new THREE.InstancedMesh(geo, mat, Math.ceil(n / 3)); let i = 0; const m4 = new THREE.Matrix4();
    for (let p = k; p < n; p += 3) { m4.makeTranslation(-len / 2 + p * .9 + .45, .55 + (p * 7 % 3) * .01, 0); im.setMatrixAt(i++, m4); }
    im.count = i; im.receiveShadow = true; im.castShadow = true; g.add(im);
  }
  // pilings along the beach side
  for (let x = -len / 2 + 1; x < len / 2; x += 4) mesh(cyl(.18, .2, 1.1, 8), clay(PAL.woodDk), g, x, .4, -depth / 2 + .3);
  // rope rail on the beach side
  const rm = clay(PAL.cream, .6);
  for (let x = -len / 2 + 1; x < len / 2; x += 4) mesh(cyl(.07, .07, 1.1, 6), clay(PAL.woodDk), g, x, 1.2, -depth / 2 + .2);
  const rope = mesh(G(`rope${len}`, () => { const pts = []; for (let x = -len / 2 + 1; x <= len / 2 - 3; x += .5) pts.push(new THREE.Vector3(x, 1.6 - Math.sin(((x + len / 2 - 1) / 4) * Math.PI) ** 2 * .25 * 0 - Math.abs(Math.sin(((x + len / 2 - 1) / 4) * Math.PI)) * .2, -depth / 2 + .2)); return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, .035, 5); }), rm, g);
  return g;
}

/* ======================= resort pool deck ======================= */
export function resortTower() {
  const g = new THREE.Group(), body = clay(PAL.flamingo), trim = clay(PAL.white);
  box(g, 14, 16, 8, body, 0, 0, -2, .4);
  box(g, 16, 1.2, 9, trim, 0, 16, -2, .3);
  // balconies: rows of white rails and teal windows
  const win = glossy('#7fe0f0'), rail = clay(PAL.white);
  const wGeo = rbox(1.3, 1.4, .1, .06), bGeo = rbox(1.6, .5, .5, .1);
  const wi = new THREE.InstancedMesh(wGeo, win, 60), bi = new THREE.InstancedMesh(bGeo, rail, 60); let k = 0; const m4 = new THREE.Matrix4();
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { const x = -5.2 + c * 2.08, y = 2.4 + r * 2.3; m4.makeTranslation(x, y + .7, 2.05); wi.setMatrixAt(k, m4); m4.makeTranslation(x, y + .1, 2.3); bi.setMatrixAt(k++, m4); }
  wi.count = bi.count = k; bi.castShadow = true; g.add(wi, bi);
  // the flamingo on the roof: neck curve, head, beak
  const f = new THREE.Group(); f.position.set(-4, 17.2, -1); g.add(f); const fm = clay(PAL.pink, .5);
  mesh(sph(1.3, 18, 12), fm, f, 0, 1.6, 0).scale.set(1.4, 1, .8);
  mesh(G('fneck', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[1.2, 2, 0], [1.9, 3.2, 0], [1.3, 4.4, 0], [1.9, 5.2, 0]].map(p => new THREE.Vector3(...p))), 20, .28, 10)), fm, f);
  mesh(sph(.5, 14, 10), fm, f, 2.1, 5.3, 0); const bk = mesh(cone(.22, .7, 8), clay(PAL.ink), f, 2.6, 5.05, 0); bk.rotation.z = -2.2;
  for (const x of [-.4, .4]) mesh(cyl(.07, .07, 1.8, 6), fm, f, x, .4, 0);
  board(g, 'GRAND FLAMINGO', 8, 1.3, { bg: PAL.white, fg: PAL.pink, size: 78, w: 768 }, 2.6, 18.2, 1.5);
  return g;
}
export function pool(w = 12, d = 7) {
  const g = new THREE.Group();
  box(g, w + 1.2, .5, d + 1.2, clay(PAL.white, .5), 0, 0, 0, .25);
  const water = mesh(rbox(w, .1, d, .05), new THREE.MeshPhysicalMaterial({ color: PAL.pool, roughness: .08, clearcoat: 1, transmission: 0, emissive: '#0a6a90', emissiveIntensity: .18 }), g, 0, .45, 0);
  water.castShadow = false;
  // caustic-ish stripes: a few lighter clay squiggles on the surface
  for (let i = 0; i < 6; i++) { const s = mesh(tor(.6 + Math.random() * .6, .04, Math.PI * 1.2), clay('#bff4ff', .2), g, (Math.random() - .5) * (w - 2), .52, (Math.random() - .5) * (d - 2)); s.rotation.x = Math.PI / 2; s.castShadow = false; }
  // ladder and a float with Floatie Phil's spot
  for (const x of [-.25, .25]) mesh(tor(.35, .04, Math.PI), glossy('#d8dde6', { metalness: .6 }), g, w / 2 - 1 + x, .7, d / 2 + .1).rotation.y = Math.PI / 2;
  const fl = mesh(G('poolfloat', () => new THREE.TorusGeometry(.6, .25, 10, 20)), striped('float', [PAL.sun, PAL.white], 8), g, -2, .55, 0); fl.rotation.x = Math.PI / 2;
  anim(g, t => { fl.position.x = -2 + Math.sin(t * .2) * 1.5; fl.rotation.z = t * .1; });
  g.userData.float = fl;
  return g;
}
// Mr. Chompers' "decorative" lagoon, with one latch on its gate (accident)
export function gatorLagoon() {
  const g = new THREE.Group();
  const rim = mesh(G('lagrim', () => new THREE.CylinderGeometry(3.4, 3.6, .5, 24)), clay('#c8b090', 1.3), g, 0, .25, 0); rim.scale.z = .7;
  const water = mesh(G('lagwater', () => new THREE.CylinderGeometry(3, 3, .1, 24)), new THREE.MeshPhysicalMaterial({ color: '#3a9a7a', roughness: .1, clearcoat: 1 }), g, 0, .46, 0); water.scale.z = .7; water.castShadow = false;
  for (let i = 0; i < 5; i++) { const lp = mesh(cyl(.4, .4, .05, 10), clay('#5fae4e'), g, Math.cos(i * 1.3) * 2, .52, Math.sin(i * 1.3) * 1.3); lp.castShadow = false; }
  const gator = new THREE.Group(); gator.position.set(.4, .45, .1); g.add(gator); const gm = clay('#3f8a3f', 1);
  mesh(sph(1, 16, 10), gm, gator, 0, 0, 0).scale.set(1.8, .35, .55);
  const head = mesh(sph(1, 14, 10), gm, gator, 1.9, .05, 0); head.scale.set(.8, .22, .4);
  for (const z of [-.2, .2]) { mesh(sph(.14), gm, gator, 1.55, .25, z); mesh(sph(.09), clay(PAL.sun), gator, 1.6, .3, z); mesh(sph(.045), clay(PAL.ink), gator, 1.66, .33, z); }
  mesh(cone(.25, 2, 8), gm, gator, -2.4, 0, 0).rotation.z = Math.PI / 2;
  for (let i = 0; i < 5; i++) mesh(cone(.08, .16, 5), clay('#2f6a2f'), gator, -1 + i * .45, .32, 0);
  anim(g, t => { gator.position.y = .42 + Math.sin(t * .8) * .03; gator.rotation.y = Math.sin(t * .15) * .4; });
  // little fence with a gate and its latch
  const fm = clay(PAL.white);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; if (i === 3) continue; mesh(cyl(.06, .06, 1, 6), fm, g, Math.cos(a) * 3.7, .75, Math.sin(a) * 2.6); }
  const gate = box(g, 1.4, .8, .08, clay(PAL.sun), Math.cos(3 / 14 * Math.PI * 2) * 3.7, .35, Math.sin(3 / 14 * Math.PI * 2) * 2.6);
  gate.rotation.y = -1.0;
  board(g, "MR. CHOMPERS · DON'T FEED", 3, .45, { bg: PAL.white, fg: '#2f6a2f', size: 44, w: 768 }, -1.2, 1.6, 2.6);
  mesh(cyl(.05, .05, 1.2, 6), fm, g, -1.2, .8, 2.55);
  return g;
}
export function tikiBar() {
  const g = new THREE.Group(), wd = clay('#a8713f', 1.2), straw = clay('#e0b860', 1.6, { side: THREE.DoubleSide });
  box(g, 4, 1.2, 1.4, wd, 0, 0, 0, .2);
  box(g, 4.3, .15, 1.6, clay('#c88a50'), 0, 1.2, 0);
  for (const x of [-1.9, 1.9]) for (const z of [-.6, .6]) mesh(cyl(.1, .12, 2.6, 8), wd, g, x, 1.3, z);
  const roof = mesh(G('tikiroof', () => new THREE.ConeGeometry(3.3, 1.4, 4, 1, true)), straw, g, 0, 3.2, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = .55;
  for (let i = 0; i < 4; i++) mesh(cyl(.13, .1, .25, 10), glossy(['#ff5a6e', '#4fdcb9', '#ffd84a', '#ff8a3c'][i]), g, -1.2 + i * .8, 1.4, .2);
  // a tiki head
  const tk = box(g, .6, 1.4, .5, clay('#7a4a2a', 1.4), 2.6, 0, .4, .2); mesh(sph(.08), clay(PAL.sun), g, 2.5, 1.0, .68); mesh(sph(.08), clay(PAL.sun), g, 2.7, 1.0, .68);
  board(g, 'TIKI TOM', 2, .4, { bg: '#7a4a2a', fg: PAL.sun, size: 64, edge: '#7a4a2a' }, 0, 2.1, .7);
  return g;
}
export function djBooth() {
  const g = new THREE.Group();
  box(g, 3, 1.3, 1.4, clay('#2a2035'), 0, 0, 0, .18);
  box(g, 3.2, .15, 1.5, clay(PAL.pink), 0, 1.3, 0, .06);
  for (const x of [-.7, .7]) { const d = mesh(cyl(.38, .38, .06, 18), glossy('#1c1426'), g, x, 1.48, 0); mesh(sph(.06), clay(PAL.white), g, x, 1.52, 0); anim(g, t => { d.rotation.y = t * 5; }); }
  for (const x of [-2, 2]) { box(g, .9, 1.8, .9, clay('#3a3048'), x, 0, 0, .14); for (const y of [.5, 1.25]) { const s = mesh(cyl(.3, .3, .05, 16), glossy('#1c1426'), g, x, y, .47); s.rotation.x = Math.PI / 2; anim(g, t => s.scale.setScalar(1 + Math.max(0, Math.sin(t * 16)) * .08)); } }
  board(g, 'DJ TURBO SPLASH', 2.7, .5, { bg: '#2a2035', fg: '#7fffe0', size: 58, glow: true, edge: '#2a2035' }, 0, .55, .72);
  return g;
}
export function foamCannon() {
  const g = new THREE.Group();
  mesh(cyl(.5, .6, .5, 14), clay(PAL.ink), g, 0, .25, 0);
  const barrel = mesh(cyl(.32, .4, 1.6, 14), glossy('#3cc8e0'), g, 0, 1, .2); barrel.rotation.x = .7;
  mesh(cyl(.12, .12, .2, 8), glossy(PAL.red), g, .45, .6, -.1);   // the pressure valve (accident)
  return g;
}
export function poolGate() {
  const g = new THREE.Group(), w = clay(PAL.white);
  for (const x of [-1.6, 1.6]) { box(g, .7, 3, .7, clay(PAL.flamingo), x, 0, 0, .15); mesh(sph(.4), glossy(PAL.sun), g, x, 3.3, 0); }
  board(g, 'VIP · POOL PARTY', 3.4, .6, { bg: PAL.ink, fg: PAL.pink, size: 64, glow: true, edge: PAL.ink }, 0, 2.7, 0);
  // velvet rope
  for (const x of [-.9, .9]) { mesh(cyl(.05, .07, 1, 8), glossy('#ffcf3a', { metalness: .6 }), g, x, .5, .8); }
  mesh(G('vrope', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.9, .95, .8), new THREE.Vector3(0, .65, .8), new THREE.Vector3(.9, .95, .8)]), 12, .05, 6)), clay('#c8264a', .3), g);
  return g;
}
export function loungeChair(col = PAL.white) { const g = beachChair(col); return g; }

/* ======================= pier ======================= */
export function pierDeck(len = 50, w = 5) {
  const g = new THREE.Group(), n = Math.round(len / .8);
  const geo = rbox(w, .18, .74, .05), mats = [clay(PAL.wood, 1.1), clay(PAL.woodHi, 1.1)];
  for (const k of [0, 1]) { const im = new THREE.InstancedMesh(geo, mats[k], Math.ceil(n / 2)); let i = 0; const m4 = new THREE.Matrix4();
    for (let p = k; p < n; p += 2) { m4.makeTranslation(0, 2.2, -p * .8); im.setMatrixAt(i++, m4); } im.count = i; im.castShadow = im.receiveShadow = true; g.add(im); }
  const pile = clay(PAL.woodDk, 1.1);
  for (let z = 0; z > -len; z -= 4) for (const x of [-w / 2 + .3, w / 2 - .3]) { mesh(cyl(.22, .25, 4.6, 8), pile, g, x, .1, z); mesh(cyl(.07, .07, 1, 6), pile, g, x, 2.8, z); }
  for (const x of [-w / 2 + .3, w / 2 - .3]) { const r = mesh(cyl(.06, .06, len, 6), clay(PAL.white), g, x, 3.2, -len / 2); r.rotation.x = Math.PI / 2; }
  return g;
}
export function baitShop() {
  const g = new THREE.Group();
  box(g, 4, 2.6, 3, clay('#6fb8c8', 1.1), 0, 0, 0, .15);
  const roof = mesh(G('baitroof', () => new THREE.CylinderGeometry(.1, 2.9, 1.2, 4)), clay('#e8dccb'), g, 0, 3.2, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = .8;
  box(g, 1, 1.8, .1, clay(PAL.woodDk), -.9, 0, 1.52, .04);
  box(g, 1.4, .9, .1, glossy('#bfeaff'), .8, 1, 1.52, .04);
  board(g, "LORNA'S BAIT", 2.8, .5, { bg: PAL.white, fg: '#2a6a8a', size: 64 }, 0, 2.95, 1.55);
  // the eviction notice taped to the door
  const n = mesh(G('notice', () => new THREE.PlaneGeometry(.4, .5)), signMat('EVICTED', { bg: '#fffef6', fg: PAL.red, w: 128, h: 160, size: 26 }), g, -.9, 1.2, 1.58);
  for (let i = 0; i < 3; i++) { const fsh = mesh(sph(.2, 10, 8), clay(['#ffd84a', '#ff8a3c', '#9fe8ff'][i]), g, -1.6 + i * .3, 1.9, 1.6); fsh.scale.set(1.8, .7, .4); }
  return g;
}
export function jiggleBooth() {
  const g = new THREE.Group();
  box(g, 5, .5, 3, clay('#2a2035'), 0, 0, 0, .12);   // a little stage
  box(g, 2, 1.2, .8, clay(PAL.lemon), 0, .5, .4, .15);   // podium
  box(g, 5.4, 3, .2, clay(PAL.lemon), 0, .5, -1.4, .1);
  board(g, '$JIGGLE TO THE MOON', 4.8, .8, { bg: PAL.ink, fg: PAL.lemon, size: 64, w: 768, glow: true, edge: PAL.ink }, 0, 3.0, -1.25);
  // a stock line that only goes up (for now)
  mesh(G('chartline', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-2, 1.2], [-1.2, 1.5], [-.6, 1.4], [.2, 2], [1, 1.9], [1.9, 2.6]].map(([x, y]) => new THREE.Vector3(x, y, 0))), 30, .06, 6)), new THREE.MeshBasicMaterial({ color: '#5aff8a' }), g, 0, 0, -1.25);
  for (const x of [-2.2, 2.2]) mesh(cyl(.12, .12, 4, 8), clay(PAL.white), g, x, 2.5, .9);
  return g;
}
// Shelly, the giant inflatable crab, tethered over the $JIGGLE booth (the first accident)
export function shelly() {
  const g = new THREE.Group(), crab = new THREE.Group(); crab.position.y = 9; g.add(crab);
  const m = glossy(PAL.coral, { clearcoat: 1, roughness: .2, sheen: .6, sheenColor: new THREE.Color('#ffd0c0') });
  mesh(sph(2.2, 28, 18), m, crab, 0, 0, 0).scale.set(1.3, .65, 1);
  for (const s of [-1, 1]) {
    // eye stalks with googly eyes
    mesh(cyl(.14, .14, .9, 8), m, crab, s * .7, 1.5, 1.2);
    mesh(sph(.42, 16, 12), glossy(PAL.white), crab, s * .7, 2.05, 1.25); mesh(sph(.2, 12, 8), glossy(PAL.ink), crab, s * .7, 2.1, 1.62);
    // claws
    const arm = new THREE.Group(); arm.position.set(s * 2.7, .2, 1); arm.rotation.z = s * .5; crab.add(arm);
    mesh(cyl(.3, .35, 1.6, 10), m, arm, 0, .7, 0);
    const claw = mesh(sph(.9, 16, 12), m, arm, 0, 1.8, 0); claw.scale.set(.75, 1, .5);
    const pin = mesh(sph(.5, 12, 8), m, arm, s * -.35, 2.5, 0); pin.scale.set(.5, .9, .4); pin.rotation.z = s * .5;
    anim(g, t => { arm.rotation.z = s * (.5 + Math.sin(t * 1.2 + s) * .12); });
    for (let i = 0; i < 3; i++) { const l = mesh(cyl(.15, .1, 1.6, 8), m, crab, s * (2.2 + i * .1), -.9, -.6 + i * .7); l.rotation.z = s * -1.1; }
  }
  // the smile
  mesh(tor(.5, .07, Math.PI), clay(PAL.ink), crab, 0, .6, 2.05).rotation.z = Math.PI;
  // tether (the shot), down to a cleat beside the booth
  const tether = mesh(cyl(.035, .035, 8.2, 6), clay(PAL.white), g, 2.8, 4.6, -.2); tether.rotation.z = -.3;
  mesh(cyl(.25, .3, .3, 10), clay(PAL.ink), g, 4, .15, -.2);
  anim(g, t => { crab.position.y = 9 + Math.sin(t * .9) * .25; crab.rotation.z = Math.sin(t * .6) * .05; crab.rotation.y = Math.sin(t * .35) * .1; });
  return g;
}
export function bench() {
  const g = new THREE.Group(), wd = clay(PAL.woodHi);
  box(g, 2.4, .12, .7, wd, 0, .55, 0, .04); box(g, 2.4, .5, .1, wd, 0, .75, -.35, .04);
  for (const x of [-1, 1]) box(g, .12, .55, .6, clay(PAL.ink), x, 0, 0, .04);
  return g;
}

/* ======================= water and marina ======================= */
export function jetSki(col = PAL.lemon) {
  const g = new THREE.Group();
  const hull = mesh(G('jsk', () => new THREE.CapsuleGeometry(.45, 1.6, 6, 12).rotateX(Math.PI / 2)), glossy(col), g, 0, .3, 0); hull.scale.set(1, .5, 1);
  box(g, .5, .25, .9, glossy(PAL.ink), 0, .45, -.2, .1);
  mesh(cyl(.04, .04, .6, 6), glossy(PAL.ink), g, 0, .85, .45).rotation.x = -.4;
  const bar = mesh(cyl(.035, .035, .7, 6), glossy(PAL.ink), g, 0, 1.1, .55); bar.rotation.z = Math.PI / 2;
  return g;
}
export function dock(len = 10) {
  const g = new THREE.Group(), wd = clay(PAL.woodHi, 1.1);
  box(g, len, .2, 2.2, wd, 0, .3, 0, .05);
  for (let x = -len / 2 + .4; x < len / 2; x += 2.4) for (const z of [-1, 1]) mesh(cyl(.15, .17, 1.6, 8), clay(PAL.woodDk), g, x, .1, z);
  board(g, "DARNELL'S JET SKIS", 3.6, .55, { bg: PAL.white, fg: PAL.teal, size: 50, w: 768 }, -len / 2 + 2, 1.5, 1.1);
  mesh(cyl(.06, .06, 1.2, 6), clay(PAL.white), g, -len / 2 + 2, .9, 1.1);
  return g;
}
export function parasailBoat() {
  const g = new THREE.Group();
  const hull = mesh(G('psboat', () => new THREE.CapsuleGeometry(1.2, 4, 6, 14).rotateX(Math.PI / 2)), glossy(PAL.white), g, 0, .5, 0); hull.scale.set(1, .5, 1);
  box(g, 2.2, .1, 4.2, clay(PAL.woodHi), 0, .85, 0, .04);
  box(g, 1.2, 1, 1.2, glossy(PAL.teal), 0, .9, .6, .2);
  mesh(cyl(.05, .05, 1.4, 6), glossy('#d8dde6', { metalness: .6 }), g, 0, 1.6, -2);
  // the chute high above and behind, and its tow line (the shot)
  const chute = new THREE.Group(); chute.position.set(0, 16, -14); g.add(chute);
  mesh(G('chute', () => new THREE.SphereGeometry(3.4, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.6)), striped('chute', [PAL.orange, PAL.lemon, PAL.pink, PAL.white], 12, [1, 1]), chute, 0, 0, 0).scale.set(1, .55, .8);
  const line = mesh(G('towline', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.3, -2), new THREE.Vector3(0, 8, -8), new THREE.Vector3(0, 13.5, -13.5)]), 20, .03, 4)), clay(PAL.white), g);
  for (const s of [-1, 1]) mesh(G('shroud' + s, () => new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(s * 3, 0, 0), new THREE.Vector3(0, -2.3, 0)), 2, .02, 4)), clay(PAL.white), chute);
  g.userData.chute = chute;
  anim(g, t => { chute.position.x = Math.sin(t * .4) * .8; chute.rotation.z = Math.sin(t * .4) * -.06; });
  return g;
}
// Rick's yacht, the Moonshot: leaves at the fireworks
export function yacht() {
  const g = new THREE.Group(), w = glossy(PAL.white, { roughness: .3 }), glass = glossy('#2a4a6a', { roughness: .1, clearcoat: 1 });
  const hull = mesh(G('yhull', () => { const s = new THREE.Shape(); s.moveTo(-8, 0); s.lineTo(7, 0); s.quadraticCurveTo(10.5, .2, 11, 2.2); s.lineTo(-8.5, 2.2); s.quadraticCurveTo(-8.7, .6, -8, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: true, bevelThickness: .3, bevelSize: .3, bevelSegments: 3 }).translate(0, 0, -2.5); }), w, g, 0, -.4, 0);
  mesh(rbox(18.6, .3, 5.6, .1), clay(PAL.navy), g, .9, 1.2, 0);
  box(g, 11, 1.8, 4.2, w, -1.5, 1.8, 0, .4); mesh(rbox(10, .8, 4.25, .3), glass, g, -1.3, 2.8, 0);
  box(g, 6.5, 1.5, 3.4, w, -2.5, 3.6, 0, .4); mesh(rbox(5.6, .6, 3.45, .25), glass, g, -2.2, 4.4, 0);
  mesh(cyl(.1, .1, 3, 8), w, g, -3, 6.4, 0); mesh(sph(.35), glossy(PAL.sun), g, -3, 8, 0);
  board(g, 'MOONSHOT', 4, .7, { bg: PAL.white, fg: PAL.navy, size: 72, edge: PAL.white }, 5, .8, 2.85);
  // deck rail (low: the champagne accident) and the champagne tower at the stern
  for (let x = -8; x < 9; x += 1.2) for (const z of [-2.6, 2.6]) mesh(cyl(.04, .04, .6, 4), glossy('#d8dde6', { metalness: .6 }), g, x, 2.2, z);
  const ct = new THREE.Group(); ct.position.set(-7.2, 1.9, 0); g.add(ct);
  for (let lv = 0; lv < 4; lv++) { const n = 4 - lv; for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) mesh(cyl(.12, .06, .25, 8), glossy('#fff3c0', { transparent: true, opacity: .7 }), ct, (i - (n - 1) / 2) * .26, lv * .25, (k - (n - 1) / 2) * .26); }
  // anchor winch at the bow (accident)
  mesh(cyl(.3, .3, .6, 10), glossy('#9aa0aa', { metalness: .6 }), g, 9, 2.4, 0).rotation.x = Math.PI / 2;
  anim(g, t => { g.children[0].parent.rotation.z = Math.sin(t * .5) * .012; });
  return g;
}
export function fireworksBarge() {
  const g = new THREE.Group();
  box(g, 10, 1.2, 5, clay('#6f6a78', 1.2), 0, -.4, 0, .2);
  for (let i = 0; i < 10; i++) { const c = box(g, .9, .7, .9, clay(['#ff5a4e', '#ffd84a', '#3a7aff'][i % 3]), -3.6 + (i % 5) * 1.8, .8, i < 5 ? -1 : 1, .08); }
  for (let i = 0; i < 8; i++) { const r = mesh(cyl(.12, .12, 1.2, 8), clay(PAL.white), g, -3 + i * .85, 2.1, 0); r.rotation.z = (i - 3.5) * .08; mesh(cone(.16, .3, 8), clay(PAL.red), g, -3 + i * .85 - (i - 3.5) * .05, 2.85, 0); }
  board(g, 'DANGER · FIREWORKS', 4.4, .6, { bg: PAL.sun, fg: PAL.ink, size: 58, w: 768 }, 0, .2, 2.55);
  return g;
}
export function kayak() {
  const g = new THREE.Group();
  const k = mesh(G('kayak', () => new THREE.CapsuleGeometry(.28, 2.6, 6, 10).rotateX(Math.PI / 2)), glossy(PAL.orange), g, 0, .1, 0); k.scale.set(1, .5, 1);
  const p = mesh(cyl(.03, .03, 2.2, 6), clay(PAL.ink), g, 0, .6, .1); p.rotation.z = Math.PI / 2 - .3;
  for (const s of [-1, 1]) mesh(sph(.16, 10, 6), glossy(PAL.sun), g, s * 1.05, .6 + s * .32, .1).scale.set(.3, 1, .7);
  anim(g, t => { p.rotation.y = Math.sin(t * 2) * .5; });
  g.userData.paddle = p;
  return g;
}
export function buoy(col = PAL.red) {
  const g = new THREE.Group(); mesh(sph(.35, 14, 10), glossy(col), g, 0, .1, 0); mesh(cone(.18, .5, 8), glossy(PAL.white), g, 0, .6, 0);
  anim(g, t => { g.children[0].position.y = .1 + Math.sin(t * 1.5 + g.id) * .06; });
  return g;
}

/* ======================= the street side and the perch ======================= */
export function motelRoof() {
  // what's at the bottom of the frame: the Sea Breeze Motor Inn's flat roof, the parapet and the back of its neon sign
  const g = new THREE.Group();
  box(g, 10, .4, 6, clay('#d8cdbf', 1.4), 0, -.4, 0, .1);
  box(g, 10, .9, .4, clay(PAL.teal), 0, -.1, -2.8, .12);
  const sign = new THREE.Group(); sign.position.set(-4.4, 0, 1.2); sign.rotation.y = .5; g.add(sign);
  for (const x of [-1.6, 1.6]) mesh(cyl(.08, .08, 3.4, 6), glossy('#9aa0aa', { metalness: .6 }), sign, x, 1.7, 0);
  board(sign, 'SEA BREEZE MOTOR INN', 4.2, 1, { bg: PAL.ink, fg: '#ff6fb5', size: 52, glow: true, w: 768, edge: PAL.ink }, 0, 3.2, 0, Math.PI);
  // a cooler and a folding chair: the protagonist's sniping nest
  box(g, .9, .6, .6, clay('#3a7aff'), -2.5, 0, -1.2, .12); box(g, .95, .15, .65, clay(PAL.white), -2.5, .6, -1.2, .06);
  const ch = beachChair(PAL.sun); ch.position.set(-1, 0, -.5); ch.rotation.y = Math.PI; g.add(ch);
  return g;
}
export function car(col = PAL.teal) {
  const g = new THREE.Group();
  box(g, 3.6, .8, 1.7, glossy(col), 0, .35, 0, .35);
  box(g, 2, .7, 1.5, glossy(col), -.2, 1.05, 0, .3);
  mesh(rbox(1.9, .5, 1.55, .2), glossy('#2a4a6a', { clearcoat: 1, roughness: .1 }), g, -.2, 1.4, 0);
  for (const x of [-1.15, 1.15]) for (const z of [-.8, .8]) { const w = mesh(cyl(.35, .35, .25, 14), clay(PAL.ink), g, x, .35, z); w.rotation.x = Math.PI / 2; }
  return g;
}
export function streetLamp() {
  const g = new THREE.Group(); mesh(cyl(.08, .1, 4, 8), clay('#2f6a7a'), g, 0, 2, 0);
  const arm = mesh(tor(.5, .06, Math.PI), clay('#2f6a7a'), g, .5, 4, 0);
  mesh(sph(.22, 12, 8), new THREE.MeshStandardMaterial({ color: '#fff4c0', emissive: '#ffe08a', emissiveIntensity: .4 }), g, 1, 3.85, 0);
  return g;
}

/* ======================= registry for the workshop ======================= */
// zone, name, maker, size (for framing), note (what it's for in level 1)
export const PIECES = [
  ['Resort pool deck', 'Grand Flamingo tower', resortTower, 20, 'The west skyline. Big Rick owns it.'],
  ['Resort pool deck', 'Pool', () => pool(), 13, 'Floatie Phil, Trent watches it. Water is watched by lifeguards.'],
  ['Resort pool deck', "Mr. Chompers' lagoon", gatorLagoon, 8, 'Accident: the gate latch, when a target is at the edge.'],
  ['Resort pool deck', 'Tiki bar', tikiBar, 6, 'Tiki Tom. Garnishes people with umbrellas.'],
  ['Resort pool deck', 'DJ booth', djBooth, 6, 'DJ Turbo Splash runs the foam party at 4:30.'],
  ['Resort pool deck', 'Foam cannon', foamCannon, 2.5, 'Accident: the pressure valve (the red knob). Foam hides pops.'],
  ['Resort pool deck', 'Pool gate', poolGate, 5, 'Big Moe and Little Moe. Kayden never gets in.'],
  ['Boardwalk', 'Welcome banner', welcomeArch, 8, 'Accident: both chains, at the end of the day.'],
  ['Boardwalk', 'Margarita stand', () => stall({ sign: "ROSA'S MARGARITAS", cols: [PAL.lemon, '#8ad84a'], body: PAL.teal, extra: g => { mesh(cyl(.25, .18, .6, 12), glossy('#bfeaff', { transparent: true, opacity: .6 }), g, .9, 1.5, .2); mesh(cyl(.3, .3, .3, 12), glossy(PAL.red), g, .9, 1.25, .2); } }), 4, 'Accident: the cursed blender (brain-freeze slush).'],
  ['Boardwalk', 'Hot dog cart', hotDogCart, 3.5, 'Accident: the propane tank. Not quiet.'],
  ['Boardwalk', 'Airbrush shack', () => shack(), 4, 'Vinnie Spray spells every name wrong.'],
  ['Boardwalk', 'Arcade and claw machine', arcade, 6, 'Tyler has never won. Challenge: shoot the claw.'],
  ['Boardwalk', "Gator Gus's mini-golf", miniGolf, 7, 'Gus hates Mr. Chompers\' fame.'],
  ['Boardwalk', 'Souvenir stand', () => stall({ sign: "PAM'S SHARK TEETH", cols: [PAL.flamingo, PAL.white], body: '#3a7aff' }), 4, 'Every tooth is a painted pebble.'],
  ['Boardwalk', "Silver Steve's plinth", plinth, 1.5, 'Challenge: make him flinch.'],
  ['Boardwalk', 'Boardwalk planks', () => boardwalkDeck(14, 6), 15, 'The strip nearest the perch.'],
  ['Beach', 'Lifeguard tower', () => lifeguardTower(), 6, 'Chip and Marisol. The leaning one is an accident.'],
  ['Beach', 'Volleyball court', volleyballCourt, 10, 'The final at 3:00. Accident: the spring-loaded pole.'],
  ['Beach', 'Palm tree', () => palm(6), 6, 'Accident: coconuts over the sidelines and the sandcastle.'],
  ['Beach', 'Umbrella', () => umbrella(), 3, 'Sunbathers. Marcus naps under one.'],
  ['Beach', 'Beach chair and towel', () => { const g = new THREE.Group(); const c = beachChair(); c.position.x = -.7; const t = towel(); t.position.x = .8; g.add(c, t); return g; }, 2.5, 'Glenda, Uncle Rudy.'],
  ['Beach', 'Sandcastle', sandcastle, 2, 'Lily\'s scale replica of the Grand Flamingo. Brayden pours his drink on it.'],
  ['Beach', 'Ice cream cart', iceCreamCart, 3.5, 'Frosty Frank. His jingle is Kazoo Kevin\'s song.'],
  ['Pier', 'Shelly the crab', shelly, 12, 'Accident: the tether, during the $JIGGLE launch.'],
  ['Pier', '$JIGGLE booth', jiggleBooth, 6, 'Brayden\'s launch at 1:30. Sits under Shelly.'],
  ['Pier', 'Bait shop', baitShop, 5, 'Lorna. Rick tears up her lease.'],
  ['Pier', 'Bench', bench, 2.5, 'Kazoo Kevin, then Walt and Bev.'],
  ['Pier', 'Pier deck', () => pierDeck(12), 13, 'Runs out to sea on the east side.'],
  ['Water', 'The Moonshot', yacht, 22, 'Leaves at the fireworks. Champagne tower and anchor winch accidents.'],
  ['Water', 'Parasail boat', parasailBoat, 20, 'Captain Lou. Accident: the tow line.'],
  ['Water', 'Fireworks barge', fireworksBarge, 11, 'Sparky. Accident: a crate, early.'],
  ['Water', 'Jet ski', () => jetSki(), 2.5, 'Accident: Brayden\'s throttle.'],
  ['Water', 'Jet-ski dock', () => dock(), 11, 'Darnell reads every customer the safety speech.'],
  ['Water', "Stan's kayak", kayak, 3, 'Lost since Tuesday.'],
  ['Street', 'Motel roof (the perch)', motelRoof, 10, 'Sea Breeze Motor Inn. Where you shoot from.'],
  ['Street', 'Car', () => car(), 4, 'Parked along the street.'],
];
export function tickPiece(g, t) { g.traverse(o => { if (o.userData.tick) for (const f of o.userData.tick) f(t); }); }

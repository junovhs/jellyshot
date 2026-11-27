// The 2.5D world kit (Don't Starve / Cult of the Lamb structure, Jellyshot's own look: NO line art, colour and soft
// shading only). Characters stay the 3D jellies; everything else is flat art in one of two orientations:
//   standing   an upright cutout tilted to face the fixed camera (Don't Starve "Billboard"): storefronts, palms, umbrellas
//   ground     art lying flat on the floor (Don't Starve "OnGround"): towels, boats seen from above, the pool, court lines
// Every piece is painted here in code as a stand-in. To replace one with real art, drop a PNG with a transparent
// background into concepts/assets/sprites/<name>.png and list it in ART below. Standing art: the piece's base sits on
// the bottom edge, centred; it is stretched to the piece's w x h (world units: a jelly is about 1 tall), so keep that
// aspect ratio. Ground art: seen from straight above, north up, stretched to w x h.
import * as THREE from 'three';

export const ART = {
  // 'stall-margaritas': 'assets/sprites/stall-margaritas.png',
};
const PPU = 64, MAXPX = 1400;   // canvas pixels per world unit
const BASE = import.meta.url.replace(/[^/]*$/, '');

/* ---------- painting helpers (units, origin at the base centre, y up) ---------- */
const hex = (c, l = 0, s = 0) => '#' + new THREE.Color(c).offsetHSL(0, s, l).getHexString();
class Painter {
  constructor(g) { this.g = g; }
  // fill a path with a soft top-lit gradient: lighter at the top, a warm shade toward the base
  fill(path, col, { light = .09, dark = -.1, flat = false, alpha = 1 } = {}) {
    const g = this.g; g.save(); g.globalAlpha = alpha; g.beginPath(); path(g);
    if (flat) g.fillStyle = col;
    else { const b = this.#bounds; const gr = g.createLinearGradient(0, b.y1, 0, b.y0); gr.addColorStop(0, hex(col, light)); gr.addColorStop(.55, col); gr.addColorStop(1, hex(col, dark)); g.fillStyle = gr; }
    g.fill(); g.restore();
  }
  #bounds = { y0: 0, y1: 1 };
  span(y0, y1) { this.#bounds = { y0, y1 }; return this; }   // the vertical range the next gradient fill spans
  rect(x, y, w, h, col, o = {}) { const r = o.r ?? 0; this.span(y, y + h).fill(g => rr(g, x, y, w, h, r), col, o); }
  circle(x, y, r, col, o = {}) { this.span(y - r, y + r).fill(g => g.arc(x, y, r, 0, Math.PI * 2), col, o); }
  ellipse(x, y, rx, ry, col, o = {}) { this.span(y - ry, y + ry).fill(g => g.ellipse(x, y, rx, ry, o.rot ?? 0, 0, Math.PI * 2), col, o); }
  poly(pts, col, o = {}) { const ys = pts.map(p => p[1]); this.span(Math.min(...ys), Math.max(...ys)).fill(g => { g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); }, col, o); }
  shape(fn, y0, y1, col, o = {}) { this.span(y0, y1).fill(fn, col, o); }
  // a soft gloss streak, the clay highlight
  gloss(x, y, rx, ry, a = .35) { const g = this.g; g.save(); g.globalAlpha = a; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, rx, ry, -.3, 0, Math.PI * 2); g.fill(); g.restore(); }
  text(str, x, y, size, col, { weight = 800, maxW = Infinity, font = "'Baloo 2', ui-rounded, system-ui, sans-serif", shadow = true } = {}) {
    const g = this.g; g.save(); g.translate(x, y); g.scale(1, -1);
    g.font = `${weight} ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(str).width; if (w > maxW) { g.scale(maxW / w, 1); }
    if (shadow) { g.fillStyle = 'rgba(60, 30, 50, .25)'; g.fillText(str, 0, size * .07); }
    g.fillStyle = col; g.fillText(str, 0, 0); g.restore();
  }
}
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); }
const stripes = (p, x, y, w, h, cols, n, o = {}) => { const s = w / n; for (let i = 0; i < n; i++) p.rect(x + i * s, y, s + .01, h, cols[i % cols.length], o); };
const scallop = (p, x, y, w, depth, cols, n) => {   // an awning's scalloped hem
  const s = w / n; for (let i = 0; i < n; i++) p.shape(g => { g.moveTo(x + i * s, y); g.lineTo(x + i * s + s, y); g.arc(x + i * s + s / 2, y, s / 2, 0, Math.PI, true); }, y - depth, y, cols[i % cols.length]);
};
const shadeBand = (p, x, y, w, h, a = .16) => p.rect(x, y, w, h, `rgba(60, 30, 50, ${a})`, { flat: true });

/* ---------- the kit: name -> { w, h, kind, paint(p) } ---------- */
const P = { sand: '#f3d6a0', wood: '#c99a6a', woodDk: '#9a6a44', woodHi: '#dcb488', cream: '#fff1d6', white: '#fff6ea', pink: '#ff4f9a', flamingo: '#ff86b0',
  coral: '#ff6b5a', orange: '#ff8a3c', sun: '#ffc93c', lemon: '#ffe066', teal: '#2fc4a8', mint: '#8ee8cf', palm: '#4fb04a', palmDk: '#2f8a3a', trunk: '#b9875a',
  red: '#e8343c', navy: '#22305a', sky: '#7fd8f0', glass: '#9fe4f4', blue: '#3a7aff', grape: '#a68cff', plum: '#5a3a6a' };
export const KIT = {};
const def = (name, w, h, paint, kind = 'stand') => { KIT[name] = { w, h, kind, paint }; };

def('palm', 5.2, 7.6, p => {
  // a leaning trunk of stacked rings, then a crown of fronds
  for (let i = 0; i < 11; i++) { const t = i / 11, x = Math.sin(t * 1.6) * .9, y = t * 6.1; p.ellipse(x, y + .3, .34 - t * .08, .34, i % 2 ? P.trunk : hex(P.trunk, -.06)); }
  const cx = Math.sin(1.6) * .9, cy = 6.4;
  const frond = (a, len, col) => p.shape(g => { const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * .7, mx = cx + Math.cos(a) * len * .55, my = cy + Math.sin(a) * len * .7 + .55;
    g.moveTo(cx, cy); g.quadraticCurveTo(mx - Math.sin(a) * .5, my + .3, ex, ey); g.quadraticCurveTo(mx + Math.sin(a) * .5, my - .5, cx, cy); }, cy - len * .7, cy + 1, col);
  for (const [a, l] of [[3.5, 2.4], [-.35, 2.4], [2.6, 2.3], [.5, 2.3]]) frond(a, l, P.palmDk);
  for (const [a, l] of [[3.1, 2.5], [.05, 2.5], [1.95, 1.9], [1.2, 1.9], [4.1, 1.8], [-1, 1.8]]) frond(a, l, P.palm);
  for (const dx of [-.22, .2, 0]) p.circle(cx + dx, cy - .25 - (dx ? 0 : .12), .2, '#8a5a2a');
});
for (const [nm, c1, c2] of [['coral', P.coral, P.white], ['teal', P.teal, P.white], ['sun', P.sun, P.pink], ['flamingo', P.flamingo, P.white], ['blue', P.blue, P.white], ['orange', P.orange, P.lemon]])
  def('umbrella-' + nm, 3.2, 3, p => {
    p.rect(-.06, 0, .12, 2.3, '#e8e0d0');
    const n = 8, R = 1.55, top = 2.95, rim = 2.05;
    for (let i = 0; i < n; i++) { const a0 = Math.PI - i * Math.PI / n, a1 = Math.PI - (i + 1) * Math.PI / n;
      p.shape(g => { g.moveTo(0, top); g.lineTo(Math.cos(a0) * R, rim + Math.sin(a0) * .1); g.lineTo(Math.cos(a1) * R, rim + Math.sin(a1) * .1); g.closePath(); }, rim, top, i % 2 ? c2 : c1); }
    scallop(p, -R, rim + .02, R * 2, .16, [c1, c2], 8);
    p.circle(0, top, .1, c1); p.gloss(-.55, 2.6, .35, .1, .3);
  });
def('lifeguard-red', 3.2, 4.6, p => tower(p, P.red));
def('lifeguard-yellow', 3.2, 4.6, p => tower(p, '#ffb020'));
function tower(p, col) {
  for (const x of [-1.1, 1.1]) p.poly([[x - .12, 0], [x + .12, 0], [x * .8 + .1, 2.4], [x * .8 - .1, 2.4]], P.white);
  for (let y = .4; y < 2.3; y += .45) p.rect(-.35, y, .7, .1, P.woodHi);
  p.rect(-1.25, 2.3, 2.5, .25, P.woodHi);
  p.rect(-1.05, 2.55, 2.1, 1.25, col, { r: .08 }); p.rect(-.75, 2.95, 1.5, .6, P.glass, { r: .05 });
  p.text('LIFEGUARD', 0, 2.75, .26, P.white, { maxW: 1.9 });
  p.poly([[-1.35, 3.8], [1.35, 3.8], [0, 4.45]], P.white); p.rect(1.05, 3.8, .05, .8, '#ddd'); p.poly([[1.1, 4.6], [1.55, 4.45], [1.1, 4.3]], col);
}
def('net', 7, 2.2, p => {
  for (const x of [-3.3, 3.3]) p.rect(x - .07, 0, .14, 2.1, P.lemon);
  p.rect(-3.25, 1.2, 6.5, .75, 'rgba(255,255,255,.35)', { flat: true });
  const g = p.g; g.save(); g.fillStyle = 'rgba(255,255,255,.75)';
  for (let x = -3.2; x < 3.25; x += .22) g.fillRect(x, 1.2, .025, .75);
  for (let y = 1.2; y < 1.96; y += .19) g.fillRect(-3.25, y, 6.5, .025); g.restore();
  p.rect(-3.25, 1.88, 6.5, .1, P.white);
});
def('sandcastle', 2.6, 2, p => {
  const s = '#e8c07c';
  p.rect(-1.1, 0, 2.2, .8, s, { r: .1 });
  for (const [x, w, h] of [[-1.15, .55, 1.3], [.6, .55, 1.3], [-.3, .6, 1.65]]) { p.rect(x, 0, w, h, s, { r: .06 }); for (let i = 0; i < 3; i++) p.rect(x + i * w / 3 + .02, h, w / 3 - .06, .14, s); }
  p.rect(-.12, 0, .24, .4, hex(s, -.18), { r: .1 }); p.rect(-.02, 1.8, .03, .35, '#ddd'); p.poly([[.01, 2.15], [.4, 2.05], [.01, 1.95]], P.pink);
});
def('icecream', 2.6, 3.2, p => {
  p.rect(-.04, 1.5, .08, 1.2, '#ddd'); p.shape(g => { g.ellipse(0, 2.6, 1.2, .5, 0, Math.PI, 0, true); }, 2.6, 3.1, P.flamingo); scallop(p, -1.2, 2.62, 2.4, .12, [P.flamingo, P.white], 6);
  p.rect(-1, .35, 2, 1.25, P.white, { r: .15 }); p.rect(-1, 1.25, 2, .3, P.mint, { r: .06 });
  p.text('FROSTY', 0, .85, .38, P.pink, { maxW: 1.7 });
  for (const x of [-.65, .65]) p.circle(x, .3, .26, '#4a4050');
  p.circle(.2, 1.85, .2, P.flamingo); p.poly([[.02, 1.75], [.38, 1.75], [.2, 1.5]], '#e8a85a');
});
// a storefront, stall or booth: a facade, an awning, a sign board and a counter
function store(p, { w = 3.6, h = 2.6, body = P.teal, awn = [P.lemon, P.white], sign = 'SHOP', signBg = P.cream, signFg = P.pink, roof = null, extra }) {
  const x = -w / 2;
  p.rect(x, 0, w, h, body, { r: .08 });
  p.rect(x + .25, .9, w - .5, h - 1.25, hex(body, -.22), { r: .06 });   // the dark opening
  p.rect(x + .1, 0, w - .2, 1, hex(body, .08), { r: .05 }); p.rect(x, .95, w, .14, P.woodHi);   // the counter
  if (roof === 'thatch') { p.poly([[x - .4, h], [-x + .4, h], [0, h + 1.2]], '#d8a85a'); for (let i = 0; i < 9; i++) p.rect(x - .3 + i * (w + .6) / 9, h - .25, .12, .35, '#c8944a'); }
  else { stripes(p, x - .15, h - .55, w + .3, .55, awn, Math.round(w * 2.2)); scallop(p, x - .15, h - .55, w + .3, .18, awn, Math.round(w * 2.2)); }
  const sw = Math.min(w + .2, Math.max(2, sign.length * .3)), sy = h + (roof === 'thatch' ? .4 : .05);
  if (sign) { p.rect(-sw / 2, sy, sw, .62, signBg, { r: .14 }); p.text(sign, 0, sy + .32, .44, signFg, { maxW: sw - .2 }); }
  extra?.(p, w, h);
}
const STORES = {
  'stall-margaritas': { w: 3.6, body: P.teal, awn: [P.lemon, '#8ad84a'], sign: "ROSA'S MARGARITAS", extra: (p) => { p.rect(.6, 1.1, .4, .6, 'rgba(190,234,255,.8)', { r: .1 }); p.circle(.8, 1.4, .14, '#8ad84a'); } },
  'stall-sharkteeth': { w: 3.6, body: P.blue, awn: [P.flamingo, P.white], sign: "PAM'S SHARK TEETH", signFg: P.blue },
  'shack-airbrush': { w: 3.4, h: 2.9, body: P.flamingo, awn: [P.grape, P.white], sign: 'AIRBRUSH TEES', signBg: '#2a2035', signFg: '#7fffe0',
    extra: (p) => { for (const [x, c] of [[-.9, '#ffd84a'], [0, '#7fffe0'], [.9, P.pink]]) { p.rect(x - .35, 1.3, .7, .75, c, { r: .1 }); p.rect(x - .5, 1.75, 1, .2, c, { r: .08 }); } } },
  arcade: { w: 4.6, h: 3.2, body: '#5a3a9a', awn: ['#ff4f9a', '#2a2035'], sign: 'JELLY ARCADE', signBg: '#2a2035', signFg: '#ffe066',
    extra: (p) => { for (const x of [-1.4, 0, 1.4]) { p.rect(x - .45, .1, .9, 1.9, '#2a2035', { r: .12 }); p.rect(x - .32, 1.2, .64, .5, ['#7fffe0', '#ff86c4', '#ffe066'][Math.round(x / 1.4) + 1], { r: .05 }); } } },
  minigolf: { w: 3.8, body: '#4fb04a', awn: [P.lemon, '#2f8a3a'], sign: "GATOR GUS' MINI GOLF", signFg: '#2f8a3a',
    extra: (p) => { p.ellipse(1.3, .25, .7, .3, '#3a9a3a'); p.rect(1.28, .25, .04, .8, '#ddd'); p.poly([[1.32, 1.05], [1.75, .95], [1.32, .85]], P.red); } },
  baitshop: { w: 3.6, h: 2.6, body: '#6aa0b0', awn: [P.white, P.navy], sign: 'BAIT & TACKLE', signBg: '#fff6ea', signFg: P.navy },
  'booth-jiggle': { w: 4.4, h: 2.4, body: '#2a2035', awn: [P.lemon, '#2a2035'], sign: '$JIGGLE TO THE MOON', signBg: P.lemon, signFg: '#2a2035',
    extra: (p, w, h) => { p.rect(-1.9, h + .8, 3.8, 1.4, '#2a2035', { r: .12 }); p.shape(g => { g.moveTo(-1.6, h + 1.1); g.lineTo(-.6, h + 1.4); g.lineTo(.2, h + 1.2); g.lineTo(1.5, h + 2); g.lineTo(1.5, h + 1.95); g.lineTo(.2, h + 1.12); g.lineTo(-.6, h + 1.32); g.lineTo(-1.6, h + 1.02); }, h + 1, h + 2, '#7fffa0', { flat: true }); } },
  tikibar: { w: 4.2, h: 2.4, body: '#b9875a', awn: [], sign: 'TIKI TOM', signBg: '#ffe066', signFg: '#8a4a2a', roof: 'thatch' },
  djbooth: { w: 3.2, h: 1.6, body: '#2a2035', awn: [P.pink, '#7fffe0'], sign: 'DJ TURBO SPLASH', signBg: '#2a2035', signFg: '#7fffe0',
    extra: (p) => { for (const x of [-1.9, 1.9]) { p.rect(x - .4, 0, .8, 1.5, '#3a3050', { r: .1 }); p.circle(x, .5, .25, '#1a1426'); p.circle(x, 1.1, .15, '#1a1426'); } } },
};
for (const [n, o] of Object.entries(STORES)) def(n, (o.w ?? 3.6) + 1.2, (o.h ?? 2.6) + (n === 'booth-jiggle' ? 2.4 : o.roof ? 1.6 : 1), p => store(p, o));
def('hotdog', 2.4, 3, p => {
  p.rect(-1, .35, 2, 1.1, P.red, { r: .12 }); p.rect(-1, 1.3, 2, .22, P.lemon, { r: .05 }); p.text("HAL'S", 0, .85, .4, P.white);
  for (const x of [-.6, .6]) p.circle(x, .3, .26, '#4a4050');
  p.rect(-.05, 1.5, .1, .5, '#ddd');
  p.ellipse(0, 2.3, 1.05, .32, '#e8b060'); p.ellipse(0, 2.42, 1.1, .2, '#c8503a'); p.shape(g => { for (let i = 0; i < 6; i++) { const x = -.8 + i * .32; g.moveTo(x, 2.48); g.quadraticCurveTo(x + .08, 2.58, x + .16, 2.48); g.lineTo(x + .16, 2.44); g.quadraticCurveTo(x + .08, 2.54, x, 2.44); } }, 2.4, 2.6, P.lemon, { flat: true });
});
def('arch', 10, 5.4, p => {
  for (const x of [-4.4, 4.4]) { p.rect(x - .35, 0, .7, 4.2, P.flamingo, { r: .2 }); p.circle(x, 4.3, .45, P.lemon); }
  p.shape(g => { g.moveTo(-4.6, 3.5); g.quadraticCurveTo(0, 5.6, 4.6, 3.5); g.lineTo(4.6, 2.6); g.quadraticCurveTo(0, 4.6, -4.6, 2.6); }, 2.6, 5, P.teal);
  p.text('PALMETTO POINT', 0, 3.9, .78, P.white, { maxW: 6.6 }); p.text('SPRING BREAK', 0, 3.25, .4, P.lemon, { maxW: 3.6 });
});
def('lamp', 1, 3.8, p => { p.rect(-.08, 0, .16, 3.3, '#3a7a8a'); p.rect(-.2, 0, .4, .25, '#3a7a8a', { r: .05 }); p.circle(0, 3.45, .3, '#fff4c8'); p.rect(-.32, 3.6, .64, .14, '#3a7a8a', { r: .07 }); });
def('bench', 2.2, 1.2, p => { for (const x of [-.85, .85]) p.rect(x - .06, 0, .12, .55, '#5a5a6a'); p.rect(-1, .45, 2, .15, P.wood, { r: .05 }); p.rect(-1, .72, 2, .14, P.wood, { r: .05 }); p.rect(-1, .98, 2, .14, P.wood, { r: .05 }); });
for (const [nm, c] of [['teal', P.teal], ['coral', P.coral], ['sun', P.sun], ['white', P.white]])
  def('chair-' + nm, 1.6, 1.2, p => { p.poly([[-.7, 0], [-.6, 0], [.2, .55], [.1, .55]], '#ddd'); p.poly([[.6, 0], [.7, 0], [-.1, .8], [-.2, .8]], '#ddd');
    p.poly([[-.65, .45], [.35, .45], [.75, 1.1], [.6, 1.15], [.25, .62], [-.6, .62]], c); });
def('resort', 15, 15, p => {
  p.rect(-6.5, 0, 13, 12.5, '#ffc2d6', { r: .3 });
  for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) { const x = -5.6 + c * 1.95, y = 1.6 + r * 1.55;
    p.rect(x, y, 1.4, 1.05, P.glass, { r: .08 }); p.rect(x - .1, y - .18, 1.6, .2, P.white, { r: .05 }); }
  p.rect(-1.4, 0, 2.8, 1.5, P.glass, { r: .1 }); p.rect(-6.8, 12.4, 13.6, .5, P.white, { r: .15 });
  p.rect(-4.2, 12.9, 8.4, 1.4, P.white, { r: .3 }); p.text('GRAND FLAMINGO', 0, 13.6, .95, P.pink, { maxW: 7.8 });
});
const TOWN = ['#ffd8b0', '#ffc2d6', '#c8e8ff', '#d8f0c0', '#fff0a8', '#e8d0ff', '#ffe0e8', '#bff0e0'];
TOWN.forEach((c, i) => def('town-' + i, 7.5, 7, p => {
  const h = 4.2 + (i % 3) * 1.2;
  p.rect(-3.4, 0, 6.8, h, c, { r: .2 }); p.rect(-3.6, h - .1, 7.2, .35, P.white, { r: .1 });
  for (let y = 1.5; y < h - .6; y += 1.5) for (const x of [-2.4, -.6, 1.2]) p.rect(x, y, 1.1, .8, P.glass, { r: .08 });
  p.rect(-.5, 0, 1, 1.25, hex(c, -.25), { r: .08 }); stripes(p, -1, 1.25, 2, .3, [P.coral, P.white], 6);
}));
def('bush', 2.2, 1.4, p => { p.circle(-.5, .55, .55, P.palmDk); p.circle(.45, .55, .6, P.palmDk); p.circle(0, .8, .65, P.palm); p.gloss(-.2, 1.1, .3, .12, .25); });
def('cannon', 1.8, 2.2, p => { p.rect(-.5, 0, 1, .6, '#9aa0aa', { r: .1 }); p.poly([[-.3, .5], [.3, .5], [.75, 1.9], [.25, 2.05]], '#7fd8f0'); p.circle(.5, 2, .35, '#fffdf8'); p.circle(.15, 2.2, .25, '#fffdf8'); });
def('gate', 3.4, 2.4, p => { for (const x of [-1.5, 1.5]) p.rect(x - .15, 0, .3, 2.2, P.white, { r: .08 }); for (let x = -1.3; x < 1.35; x += .26) p.rect(x - .04, .1, .08, 1.7, '#ffc2d6'); p.rect(-1.4, 1.7, 2.8, .45, P.pink, { r: .1 }); p.text('POOL · VIP', 0, 1.93, .3, P.white); });
def('yacht', 13, 5.2, p => {
  p.shape(g => { g.moveTo(-6.2, 1.4); g.lineTo(6.3, 1.4); g.quadraticCurveTo(6.1, .3, 4.8, 0); g.lineTo(-5.4, 0); g.quadraticCurveTo(-6.1, .4, -6.2, 1.4); }, 0, 1.4, P.white);
  p.rect(-6.2, .55, 12.5, .2, P.navy, { flat: true });
  p.rect(-4, 1.4, 7.5, 1.4, P.white, { r: .3 }); for (let x = -3.5; x < 3; x += 1.1) p.rect(x, 1.75, .8, .6, '#2a3a5a', { r: .15 });
  p.rect(-2.2, 2.8, 4, 1.1, P.white, { r: .3 }); p.rect(-1.8, 3, 3.2, .55, '#2a3a5a', { r: .15 });
  p.rect(-.05, 3.9, .1, 1.1, '#ddd'); p.text('MOONSHOT', -2.6, 1.0, .5, P.navy, { shadow: false });
});
def('parasail', 4.6, 2.2, p => { p.shape(g => { g.moveTo(-2.1, .9); g.lineTo(2.2, .9); g.lineTo(1.8, 0); g.lineTo(-1.7, 0); }, 0, .9, P.orange); p.rect(-.8, .9, 1.6, .9, P.white, { r: .15 }); p.rect(-.6, 1.1, 1.2, .45, P.glass, { r: .1 }); p.rect(1.4, .9, .08, 1.2, '#ddd'); });
def('barge', 7, 2.8, p => { p.rect(-3.3, 0, 6.6, .8, '#6a6a7a', { r: .1 }); for (let i = 0; i < 5; i++) p.rect(-2.8 + i * 1.15, .8, 1, .8 + (i % 2) * .4, i % 2 ? P.red : '#c8503a', { r: .08 }); p.text('DANGER', 0, .42, .36, P.lemon, { shadow: false }); });
def('buoy-red', .8, 1.2, p => { p.ellipse(0, .35, .36, .3, P.red); p.rect(-.06, .5, .12, .6, P.red); p.circle(0, 1.1, .1, P.lemon); });
def('buoy-sun', .8, 1.2, p => { p.ellipse(0, .35, .36, .3, P.sun); p.rect(-.06, .5, .12, .6, P.sun); p.circle(0, 1.1, .1, P.red); });
def('crab', 5.6, 3.8, p => {   // Shelly, the $JIGGLE mascot balloon
  for (const s of [-1, 1]) { for (let k = 0; k < 3; k++) p.poly([[s * (1 + k * .3), .9], [s * (1.5 + k * .45), .1], [s * (1.62 + k * .45), .1], [s * (1.18 + k * .3), 1]], '#d8402c');
    p.poly([[s * 1.6, 1.6], [s * 2.3, 2.2], [s * 2.2, 2.4], [s * 1.5, 1.8]], '#e85040'); p.circle(s * 2.45, 2.75, .55, '#f05a46'); p.poly([[s * 2.3, 3.2], [s * 2.8, 3.5], [s * 2.55, 2.9]], '#d8402c'); }
  p.ellipse(0, 1.6, 1.9, 1.1, '#f05a46'); p.gloss(-.7, 2.2, .6, .2, .3);
  for (const s of [-1, 1]) { p.rect(s * .55 - .05, 2.5, .1, .55, '#d8402c'); p.circle(s * .55, 3.15, .3, '#fff'); p.circle(s * .55, 3.1, .15, '#241a2e'); }
});
def('car-teal', 4.2, 2, p => car(p, P.teal)); def('car-coral', 4.2, 2, p => car(p, P.coral)); def('car-lemon', 4.2, 2, p => car(p, P.lemon)); def('car-grape', 4.2, 2, p => car(p, P.grape));
function car(p, c) { p.rect(-1.9, .3, 3.8, .9, c, { r: .35 }); p.rect(-1.1, 1.05, 2.1, .8, c, { r: .35 }); p.rect(-.9, 1.15, .85, .55, P.glass, { r: .15 }); p.rect(.1, 1.15, .75, .55, P.glass, { r: .15 }); for (const x of [-1.2, 1.2]) p.circle(x, .32, .34, '#3a3048'); }
def('piling', .5, 1.4, p => { p.rect(-.17, 0, .34, 1.3, P.woodDk, { r: .12 }); p.ellipse(0, 1.3, .17, .07, P.woodHi); });
def('gator', 2.6, 1, p => { p.ellipse(0, .35, 1.1, .3, '#4a8a3a'); p.poly([[.9, .3], [1.3, .35], [1.3, .55], [.9, .6]], '#4a8a3a'); p.poly([[-1, .3], [-1.3, .4], [-1, .45]], '#4a8a3a'); for (const x of [-.4, 0, .4]) p.circle(x, .62, .09, '#3a7a2a'); p.circle(.95, .65, .09, '#ffe066'); });
def('plinth', 1.3, .8, p => { p.rect(-.55, 0, 1.1, .6, '#e8dccb', { r: .06 }); p.text('$1 PHOTOS', 0, .3, .17, '#7a6a5a', { shadow: false }); });

/* ---------- ground art (seen from above, north up) ---------- */
const flatPainter = fn => p => fn(p);
for (const [nm, a, b] of [['pink', P.pink, P.white], ['teal', P.teal, P.white], ['sun', P.sun, P.coral], ['grape', P.grape, P.lemon], ['coral', P.coral, P.white]])
  def('towel-' + nm, 1.2, 2, flatPainter(p => { p.rect(-.6, 0, 1.2, 2, a, { r: .06, flat: true }); for (let y = .25; y < 2; y += .5) p.rect(-.6, y, 1.2, .18, b, { flat: true }); }), 'ground');
for (const [nm, c] of [['lemon', P.lemon], ['pink', P.flamingo], ['blue', P.blue]])
  def('jetski-' + nm, 1.2, 2.6, flatPainter(p => { p.shape(g => { g.moveTo(0, 2.6); g.quadraticCurveTo(.6, 2, .55, .3); g.lineTo(-.55, .3); g.quadraticCurveTo(-.6, 2, 0, 2.6); }, 0, 2.6, c); p.ellipse(0, 1.1, .3, .5, '#2a2035'); p.rect(-.45, .5, .9, .12, '#2a2035', { flat: true }); }), 'ground');
def('kayak', 1, 3.4, flatPainter(p => { p.ellipse(0, 1.7, .42, 1.7, P.orange); p.ellipse(0, 1.7, .26, .5, '#8a4a2a'); p.rect(-.9, 1.62, 1.8, .07, '#ddd', { flat: true }); }), 'ground');
def('lagoon', 6, 4.5, flatPainter(p => { p.ellipse(0, 2.25, 3, 2.25, '#6a9a4a', { flat: true }); p.ellipse(0, 2.25, 2.6, 1.9, '#3f7a5a', { flat: true }); p.gloss(-1, 3, 1, .3, .15); }), 'ground');

/* ---------- textures and meshes ---------- */
const texCache = new Map();
export function spriteTexture(name) {
  if (texCache.has(name)) return texCache.get(name);
  const k = KIT[name]; if (!k) throw new Error('no sprite ' + name);
  let tex;
  if (ART[name]) { tex = new THREE.TextureLoader().load(BASE + ART[name]); }
  else {
    const s = Math.min(PPU, MAXPX / Math.max(k.w, k.h)), cv = document.createElement('canvas');
    cv.width = Math.ceil(k.w * s); cv.height = Math.ceil(k.h * s);
    const g = cv.getContext('2d'); g.setTransform(s, 0, 0, -s, cv.width / 2, cv.height);   // units, origin at the base centre, y up
    k.paint(new Painter(g));
    tex = new THREE.CanvasTexture(cv);
  }
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  texCache.set(name, tex); return tex;
}
const geoCache = new Map();
// a standing cutout, base centred at the origin, tilted back by `tilt` so it faces the fixed camera
export function standing(name, tilt, scale = 1) {
  const k = KIT[name], key = `${k.w}x${k.h}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.PlaneGeometry(k.w, k.h).translate(0, k.h / 2, 0));
  const m = new THREE.Mesh(geoCache.get(key), new THREE.MeshBasicMaterial({ map: spriteTexture(name), alphaTest: .5, alphaToCoverage: true, toneMapped: false, side: THREE.DoubleSide }));
  m.rotation.x = -tilt; m.scale.setScalar(scale); m.userData.sprite = name;
  return m;
}
// ground art lying flat, centred at the origin
export function ground(name, scale = 1) {
  const k = KIT[name];
  const m = new THREE.Mesh(new THREE.PlaneGeometry(k.w, k.h).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: spriteTexture(name), alphaTest: .5, toneMapped: false, depthTest: false }));
  m.scale.setScalar(scale); m.renderOrder = -3; m.userData.sprite = name; return m;
}
export const size = name => KIT[name];

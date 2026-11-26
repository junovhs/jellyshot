// The Judge (Judge Gumbo), modelled from the approved character design sheet.
// Signed-distance sculpt + per-part simplification, shared by concepts/gumbo.html (showcase)
// and scripts/bake-gumbo.mjs (LOD bake for the perf bench).
//
// Axes: origin between his feet, +y up, +z toward the viewer. -x is the viewer's left.
// Every mesh carries userData.tag: 'jelly' (orange jelly: head, lids, brows, hands),
// 'satin' (robe, sleeves, shoes, gavel) or 'gloss' (wig, jabot, eyes, tooth, tongue).
// All colour is per-vertex, so a whole character is three materials.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { sph, ell, cone, cap, rbox, chain, smin, smax, sculpt, frontZ, hit, len3 } from './sculpt.js';
import { simplify, simplifierReady } from './simplify.js';

/* ======================================================================
   Palette (from the sheet)
   ====================================================================== */
export const C = {
  orange: 0xff8410, orangeDk: 0xe2481a, plum: 0x40142f, plumDk: 0x2f0c22, gold: 0xf0a020, cream: 0xf0e2d8, creamSh: 0xc9b2a6,
  white: 0xfbf4ee, whiteSh: 0xdccdc4, brown: 0x7a3a20, brownDk: 0x5a2814, shoe: 0x6b3420, mouth: 0x7a1428, mouthDk: 0x4a0a1a,
  tongue: 0xff7d96, tooth: 0xfffcf2, eye: 0xfffdf8, pupil: 0x1c1420,
};
export const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ======================================================================
   Head: wide, round, glossy. Eyes, brows and mouth sit on it.
   ====================================================================== */
export const HC = [0, 1.8, .02], HR = [.78, .62, .67];   // measured off judge-turnaround.webp (1 unit = 208 px, feet at y 627)
// a rounded square, like the art: wide right up to the brows, soft corners
export const head = (x, y, z) => smin(ell(x, y, z, HC[0], HC[1], HC[2], HR[0], HR[1], HR[2]), rbox(x, y, z, HC[0], HC[1] + .03, HC[2], HR[0] - .06, HR[1] - .1, HR[2] - .08, .34), .12);
const memo = new Map();
const cached = (k, f) => { let v = memo.get(k); if (v === undefined) memo.set(k, v = f()); return v; };
export const fz = (x, y, off = 0) => cached('h' + x + ',' + y, () => frontZ(head, x, y)) + off;

export const EYE_L = { x: -.28, y: 1.89, r: .29 }; EYE_L.z = fz(EYE_L.x, EYE_L.y) - EYE_L.r * .45;   // wide open
export const EYE_R = { x: .37, y: 1.85, r: .25 };  EYE_R.z = fz(EYE_R.x, EYE_R.y) - EYE_R.r * .45;   // heavy lid
export const MOUTH = { x: .04, y: 1.44, rx: .27, ry: .21 }; MOUTH.z = fz(MOUTH.x, MOUTH.y);
const mouthCav = (x, y, z) => ell(x, y, z, MOUTH.x, MOUTH.y, MOUTH.z + .03, MOUTH.rx, MOUTH.ry, .24);

export function headSDF(x, y, z) {
  let d = head(x, y, z);
  if (z < .2) return d;
  d = smax(d, -sph(x, y, z, EYE_L.x, EYE_L.y, EYE_L.z, EYE_L.r * 1.04), .03);    // shallow sockets
  d = smax(d, -sph(x, y, z, EYE_R.x, EYE_R.y, EYE_R.z, EYE_R.r * 1.04), .03);
  d = smax(d, -mouthCav(x, y, z), .035);                                         // clean, rounded opening
  return d;
}
export function headColor(x, y, z) {
  const m = sstep(.02, -.03, mouthCav(x, y, z)) * sstep(MOUTH.z + .02, MOUTH.z - .05, z);
  if (m > 0) return [C.orange, y > MOUTH.y - .02 ? C.mouthDk : C.mouth, m];
  return C.orange;
}
// tongue: a soft pink mound filling the bottom of the mouth
export const tongueSDF = (x, y, z) => ell(x, y, z, MOUTH.x + .01, MOUTH.y - .085, MOUTH.z - .12, .15, .075, .1);
// one square tooth, upper right of the mouth
export const toothSDF = (x, y, z) => rbox(x, y, z, MOUTH.x + .085, MOUTH.y + .1, MOUTH.z - .07, .055, .055, .035, .018);

// brows: thick sausages, both angled down toward the middle (stern)
const BROW_L = [[-.56, 2.25], [-.3, 2.23], [-.06, 2.12]], BROW_R = [[.18, 2.13], [.42, 2.2], [.62, 2.22]];
const browPts = (P) => P.map(([bx, by], i) => [bx, by, fz(bx, by, .02), [.075, .09, .07][i]]);
const BLP = browPts(BROW_L), BRP = browPts(BROW_R);
export const browSDF = (x, y, z) => Math.min(chain(x, y, z, BLP, .06), chain(x, y, z, BRP, .06));

/* ======================================================================
   Wig: glossy cream. Puffy crown with a rounded front roll, two big spiral
   curls on each side (facing out and forward), stacked rolls across the back.
   ====================================================================== */
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
function curl(ax, ay, az, bx, by, bz, r) {   // a roll from a to b; the spiral is carved into the b end
  const a = v3(ax, ay, az), b = v3(bx, by, bz), u = b.clone().sub(a).normalize();
  const e1 = new THREE.Vector3().crossVectors(u, v3(0, 1, 0)).normalize(), e2 = new THREE.Vector3().crossVectors(e1, u);
  return { a, b, u, e1, e2, r };
}
export const CURLS = [];
for (const s of [-1, 1]) {
  CURLS.push(curl(s * .6, 2.14, -.5, s * .95, 2.12, -.14, .33));    // upper, at the temples (outer edge ±1.28)
  CURLS.push(curl(s * .62, 1.68, -.36, s * .97, 1.66, .0, .33));    // lower, at the cheeks
}
function curlSDF(c, x, y, z) {
  const qx = x - c.b.x, qy = y - c.b.y, qz = z - c.b.z;
  let d = cap(x, y, z, c.a.x, c.a.y, c.a.z, c.b.x, c.b.y, c.b.z, c.r);
  const along = qx * c.u.x + qy * c.u.y + qz * c.u.z;
  if (along > -c.r * .7 && Math.abs(d) < .06) {      // the spiral groove on the end face
    const p1 = qx * c.e1.x + qy * c.e1.y + qz * c.e1.z, p2 = qx * c.e2.x + qy * c.e2.y + qz * c.e2.z;
    const rho = Math.hypot(p1, p2), phi = Math.atan2(p2, p1);
    const g = Math.abs(((rho / (c.r * .42) - phi / (2 * Math.PI)) % 1 + 1) % 1 - .5);
    d += .045 * sstep(.28, .46, g) * sstep(c.r * .98, c.r * .8, rho) * sstep(-c.r * .7, -c.r * .2, along);
  }
  return d;
}
const BACK_ROLLS = [2.42, 2.08, 1.68].map((y, i) => ({ y, r: .2 + i * .04, zb: -(3 - hit(head, 0, y, -3, 0, 0, 1, 6)) - .05 }));
export function wigSDF(x, y, z) {
  // a thin crown over the head, front edge just above the brows
  const zn = Math.max(-1, Math.min(1, z / .66));
  const hairline = Math.max(1.22, 2.32 - .6 * (1 - zn));
  let d = smax(head(x, y, z) - .09, hairline - y, .08);
  // the top: three round lobes with parting grooves between them (front view)
  d = smin(d, ell(x, y, z, -.33, 2.5, -.02, .33, .34, .46), .04);
  d = smin(d, ell(x, y, z, 0, 2.56, -.06, .29, .34, .48), .04);   // top of the wig at 2.9 (art)
  d = smin(d, ell(x, y, z, .33, 2.5, -.02, .33, .34, .46), .04);
  // the back, stacked like a cake: tall narrow dome, wider roll, widest roll down to the collar
  d = smin(d, ell(x, y, z, 0, 2.48, -.36, .56, .4, .52), .03);
  d = smin(d, ell(x, y, z, 0, 2.06, -.52, .78, .32, .5), .03);
  d = smin(d, ell(x, y, z, 0, 1.62, -.5, .92, .34, .46), .03);
  for (const c of CURLS) d = smin(d, curlSDF(c, x, y, z), .04);
  return d;
}
export function wigColor(x, y, z) {
  // soft shading in the spiral grooves and between rolls (it's one glossy material)
  let sh = 0;
  for (const c of CURLS) {
    const qx = x - c.b.x, qy = y - c.b.y, qz = z - c.b.z, along = qx * c.u.x + qy * c.u.y + qz * c.u.z;
    if (along < -c.r * .7 || len3(qx, qy, qz) > c.r * 1.1) continue;
    const p1 = qx * c.e1.x + qy * c.e1.y + qz * c.e1.z, p2 = qx * c.e2.x + qy * c.e2.y + qz * c.e2.z;
    const rho = Math.hypot(p1, p2), phi = Math.atan2(p2, p1);
    const g = Math.abs(((rho / (c.r * .42) - phi / (2 * Math.PI)) % 1 + 1) % 1 - .5);
    sh = Math.max(sh, sstep(.34, .48, g) * sstep(c.r * .98, c.r * .8, rho) * .8);
  }
  return sh > 0 ? [C.cream, C.creamSh, sh] : C.cream;
}

/* ======================================================================
   Robe: a plum bell, gold-trimmed lapels, front opening, hem and collar.
   ====================================================================== */
const ROBE = { y0: .24, y1: 1.18, r0: .75, r1: .44, zs: .82 };
const robeR = y => { const t = Math.max(0, Math.min(1, (y - ROBE.y0) / (ROBE.y1 - ROBE.y0))); return ROBE.r1 + (ROBE.r0 - ROBE.r1) * Math.pow(1 - t, 1.6); };
function robeBody(x, y, z) {
  let d = (Math.hypot(x, z / ROBE.zs) - robeR(y)) * .92;
  d = smin(d, ell(x, y, z, 0, 1.12, 0, .58, .19, .44), .14);                    // rounded shoulders
  d = smax(d, ROBE.y0 - y, .04);                                               // hem
  return d;
}
export const rz = (x, y) => cached('r' + x + ',' + y, () => frontZ(robeBody, x, y));
// gold trim regions, measured on the front
const lapelLine = (x, y) => {   // distance (in x) from the lapel edge: from the shoulder (±.46, 1.22) down to (±.08, .62)
  const t = Math.max(0, Math.min(1, (1.22 - y) / .6)), ex = .46 + (.08 - .46) * t;
  return Math.abs(Math.abs(x) - ex);
};
function trim(x, y, z) {
  if (y < ROBE.y0 + .1) return 1;                                             // hem band
  if (z < .05) return 0;
  if (y > .6 && y < 1.26 && lapelLine(x, y) < .065) return 1;                 // lapels
  if (y <= .62 && Math.abs(Math.abs(x) - .08 - (.62 - y) * .05) < .055) return 1;   // front opening edges
  return 0;
}
export function robeSDF(x, y, z) {
  let d = robeBody(x, y, z);
  if (Math.abs(d) < .05 && trim(x, y, z)) d -= .014;                          // trims stand slightly proud
  // standing collar behind the neck
  d = smin(d, smax(Math.abs(Math.hypot(x, (z + .02) / .85) - .5) - .09, Math.max(Math.abs(y - 1.27) - .06, z - .15), .03), .04);
  return d;
}
export const robeColor = (x, y, z) => (trim(x, y, z) || (y > 1.16 && z < .15 && Math.abs(Math.hypot(x, (z + .02) / .85) - .5) < .13) ? C.gold
  : Math.abs(x) < .08 && y < .6 ? C.plumDk : C.plum);

/* ---- jabot: three stacked white ruffles tucked under the chin ---- */
const JAB = [0, 1, 2].map(i => ({ y: 1.1 - i * .15, rx: .22 + i * .07 }));
export function jabotSDF(x, y, z) {
  let d = 1e9;
  for (const [i, L] of JAB.entries()) {
    const zf = rz(0, L.y) + .08 + i * .02;
    let l = ell(x, y, z + x * x * .7, 0, L.y, zf, L.rx, .12, .1);    // sits proud of the robe, curving round the chest
    l -= .012 * Math.max(0, Math.sin(x * 38)) * sstep(L.y - .02, L.y - .08, y);   // scalloped edge
    d = Math.min(d, l);   // hard union: the layers read as separate ruffles
  }
  // two collar tabs under the chin
  d = smin(d, ell(x, y, z, -.11, 1.2, rz(0, 1.18) + .05, .12, .07, .05), .03);
  d = smin(d, ell(x, y, z, .11, 1.2, rz(0, 1.18) + .05, .12, .07, .05), .03);
  return d;
}
export const jabotColor = (x, y) => {
  let sh = 0;
  for (const L of JAB) sh = Math.max(sh, sstep(L.y - .05, L.y - .1, y) * sstep(L.y - .15, L.y - .1, y));
  return sh > 0 ? [C.white, C.whiteSh, sh * .7] : C.white;
};

/* ---- sleeves: bell sleeves with gold cuffs; built from the shoulder pivot along -y ---- */
const SLEEVE_LEN = .38;
export const sleeveSDF = (x, y, z) => smax(cone(x, y, z, 0, .05, 0, 0, -SLEEVE_LEN, 0, .2, .25), -(y + SLEEVE_LEN + .04), .04);
export const sleeveColor = (x, y) => (y < -SLEEVE_LEN + .085 ? C.gold : C.plum);
export const handSDF = (x, y, z) => smin(sph(x, y, z, 0, -SLEEVE_LEN - .12, .02, .17), ell(x, y, z, .07, -SLEEVE_LEN - .05, .11, .065, .075, .075), .04);

/* ---- shoes: chocolate brown, rounded, peeking out under the hem ---- */
export const shoeSDF = (x, y, z) => Math.min(ell(x, y, z, -.3, .14, .1, .27, .15, .36), ell(x, y, z, .3, .14, .1, .27, .15, .36));
export const shoeColor = (x, y) => (y < .03 ? C.brownDk : C.shoe);

/* ---- gavel: chunky wooden head with a gold band, built along +y from the grip ---- */
export const GAVEL = { handle: .5, headR: .2, headL: .55 };
export function gavelSDF(x, y, z) {
  const h = GAVEL.handle;
  let d = cap(x, y, z, 0, -.16, 0, 0, h, 0, .048);                                 // handle
  d = Math.min(d, sph(x, y, z, 0, -.2, 0, .075));                                  // knob
  d = smin(d, cap(x, y, z, 0, -.05, 0, 0, .0, 0, .065), .02);                       // collar
  // the head: a fat cylinder across the top of the handle, slightly domed ends
  const hx = Math.abs(x), dh = Math.hypot(y - h - .05, z);
  const body = Math.max(dh - GAVEL.headR, hx - GAVEL.headL / 2) ;
  const rounded = Math.hypot(Math.max(dh - GAVEL.headR + .04, 0), Math.max(hx - GAVEL.headL / 2 + .04, 0)) - .04 + Math.min(Math.max(dh - GAVEL.headR + .04, hx - GAVEL.headL / 2 + .04), 0);
  d = Math.min(d, Math.max(body, rounded));
  return d;
}
export function gavelColor(x, y, z) {
  if (y > GAVEL.handle - .2) {
    if (Math.abs(x) < .075) return C.gold;                                         // the band
    if (Math.abs(x) > GAVEL.headL / 2 - .03) return C.brownDk;                      // end faces
  }
  return C.brown;
}

/* ======================================================================
   Assembly. detail: cell sizes (fine → coarse) and a triangle budget for the whole
   character; each sculpted part is simplified to its share of the budget.
   ====================================================================== */
export const DETAIL = {
  hero: { cell: 1, seg: .8, budget: 15000, small: true },
  mid: { cell: 1.6, seg: .5, budget: 5000, small: true },
  far: { cell: 2.6, seg: .3, budget: 1500, small: false },
};

const sphereGeo = (r, w, h, hex) => {
  const g = new THREE.SphereGeometry(r, w, h); g.deleteAttribute('uv');
  const c = new THREE.Color(hex), n = g.getAttribute('position').count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};
const one = hex => () => hex;

export async function assemble(detail = DETAIL.hero, { pose = 'gavel' } = {}) {
  await simplifierReady;
  const root = new THREE.Group();
  const parts = { lids: [], pupils: [] };
  const sculpted = [];   // [mesh, weight] — simplified at the end to share the budget
  const K = c => c * detail.cell, seg = n => Math.max(6, Math.round(n * detail.seg));
  const add = (geo, tag, parent, weight = 0) => { const m = new THREE.Mesh(geo, null); m.userData.tag = tag; parent.add(m); if (weight) sculpted.push([m, weight]); return m; };

  // head + face (weights: how much of the budget each part may keep; detailed, visible parts get more)
  add(sculpt(headSDF, headColor, [-.85, 1.12, -.72], [.85, 2.48, .76], K(.012)), 'jelly', root, 1.4);
  add(sculpt(tongueSDF, one(C.tongue), [-.25, 1.2, .3], [.35, 1.5, 1.0], K(.008)), 'gloss', root, .5);
  if (detail.small) add(sculpt(toothSDF, one(C.tooth), [-.05, 1.42, .35], [.3, 1.7, 1.0], K(.006)), 'gloss', root, .3);
  parts.brows = add(sculpt(browSDF, one(C.orangeDk), [-.72, 2.0, .2], [.75, 2.4, 1.0], K(.01)), 'jelly', root, .6);
  add(sculpt(wigSDF, wigColor, [-1.5, 1.15, -1.1], [1.5, 3.15, .85], K(.014)), 'gloss', root, 2.2);

  // robe, jabot, shoes
  add(sculpt(robeSDF, robeColor, [-.9, .2, -.75], [.9, 1.4, .75], K(.016)), 'satin', root, 1.2);
  add(sculpt(jabotSDF, jabotColor, [-.5, .66, .05], [.5, 1.32, .9], K(.009)), 'gloss', root, .7);
  add(sculpt(shoeSDF, shoeColor, [-.64, -.04, -.32], [.64, .32, .52], K(.012)), 'satin', root, .4);

  // eyes: glossy beads; the right one under a heavy lid, its pupil peeking out below
  for (const [E, lidRest, look, pr] of [[EYE_L, -1.6, [.08, .02], .5], [EYE_R, .42, [-.18, -.32], .46]]) {
    const eg = new THREE.Group(); eg.position.set(E.x, E.y, E.z); root.add(eg);
    add(sphereGeo(E.r, seg(36), seg(26), C.eye), 'gloss', eg);
    const pg = new THREE.Group(); eg.add(pg); pg.rotation.set(-look[1], look[0], 0);
    const pu = add(sphereGeo(E.r * pr, seg(28), seg(18), C.pupil), 'gloss', pg); pu.scale.set(1, 1.05, .42); pu.position.z = E.r * .86;
    if (detail.small) add(sphereGeo(E.r * .13, seg(12), seg(8), 0xffffff), 'gloss', pg).position.set(-E.r * .18, E.r * .2, E.r * 1.0);
    parts.pupils.push(pg);
    const r = E.r;
    const lid = new THREE.Group(); eg.add(lid);
    add(sculpt((x, y, z) => smax(Math.abs(len3(x, y, z) - r * 1.08) - .022, -y, .012), one(C.orange),
      [-r * 1.3, -r * .2, -r * 1.3], [r * 1.3, r * 1.3, r * 1.3], K(.008)), 'jelly', lid, .25);
    lid.rotation.x = lidRest; lid.userData.rest = lidRest;
    parts.lids.push(lid);
  }

  // arms: sleeve + mitt hand under a shoulder pivot
  const arm = (side) => {
    const p = new THREE.Group(); p.position.set(side * .6, 1.1, .04); root.add(p);
    add(sculpt(sleeveSDF, sleeveColor, [-.3, -.6, -.3], [.3, .12, .3], K(.012)), 'satin', p, .45);
    add(sculpt(handSDF, one(C.orange), [-.25, -.75, -.25], [.25, -.25, .3], K(.01)), 'jelly', p, .3);
    return p;
  };
  parts.armL = arm(-1); parts.armR = arm(1);
  // aim a sleeve so its hand lands at a point (sleeve + hand reach ≈ SLEEVE_LEN + .1 from the shoulder)
  const aim = (g, hx, hy, hz) => g.quaternion.setFromUnitVectors(v3(0, -1, 0), v3(hx, hy, hz).sub(g.position).normalize());
  aim(parts.armL, -.86, .74, .08);                                    // hands hang out at the sides (turnaround)
  if (pose === 'turnaround') aim(parts.armR, .86, .74, .08);
  else aim(parts.armR, .68, .98, .45);                                // front view: hand up at his chest, gavel by his cheek
  parts.armL.userData.q0 = parts.armL.quaternion.clone(); parts.armR.userData.q0 = parts.armR.quaternion.clone();

  if (pose !== 'turnaround') {
    const gavel = new THREE.Group(); parts.armR.add(gavel);
    gavel.position.set(.01, -SLEEVE_LEN - .1, .02);
    add(sculpt(gavelSDF, gavelColor, [-.34, -.3, -.22], [.34, .86, .22], K(.009)), 'satin', gavel, .6);
    // handle points up and a little back; set in world terms, then expressed in the arm's frame
    const want = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), v3(.42, 1, -.05).normalize());
    gavel.quaternion.copy(parts.armR.quaternion.clone().invert().multiply(want));
    parts.gavel = gavel;
  }

  // simplify every sculpted part to its share of the budget
  const total = sculpted.reduce((n, [, w]) => n + w, 0);
  for (const [m, w] of sculpted) m.geometry = simplify(m.geometry, detail.budget * .82 * w / total);   // ~18% is left for the eyes
  return { root, parts };
}

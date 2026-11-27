// The locked jelly character (DEC-06, DEC-08) as a module, for scenes that need many jellies (the boardwalk diorama).
// Body, arm bend, paint, eyes and the arm pose are taken from concepts/randomizer.html, which stays the reference;
// FEAT-01 ports both into the app. Keep the two in step until then.
import * as THREE from 'three';

// (not new URL(x, import.meta.url): Vite rewrites that pattern to the server root)
const BASE = import.meta.url.replace(/[^/]*$/, '');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- clay (props and hats) ---------- */
function clayNoise() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S);
  const rnd = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const smooth = (x, y, f) => { const xi = Math.floor(x * f), yi = Math.floor(y * f), xf = x * f - xi, yf = y * f - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = f;
    const a = rnd(xi % w, yi % w), b = rnd((xi + 1) % w, yi % w), c2 = rnd(xi % w, (yi + 1) % w), d = rnd((xi + 1) % w, (yi + 1) % w);
    return a + (b - a) * u + (c2 - a) * v + (a - b - c2 + d) * u * v; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const nx = x / S, ny = y / S;
    let n = smooth(nx, ny, 4) * .5 + smooth(nx, ny, 9) * .3 + smooth(nx, ny, 23) * .2;
    n += Math.sin((nx * 3 + ny * 2) * 18 + smooth(nx, ny, 5) * 6) * .04;
    const v = Math.max(0, Math.min(255, n * 255)), i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export const BUMP = clayNoise();
const mats = new Map();
export function clay(hex, bump = .55, extra = {}) {
  const key = 'c' + hex + bump + JSON.stringify(extra);
  if (!mats.has(key)) { const col = new THREE.Color(hex);
    mats.set(key, new THREE.MeshPhysicalMaterial({ color: col, roughness: .82, sheen: .55, sheenRoughness: .7,
      sheenColor: col.clone().lerp(new THREE.Color('#fff'), .55), bumpMap: BUMP, bumpScale: bump, ...extra })); }
  return mats.get(key);
}
export function glossy(hex, extra = {}) {
  const key = 'g' + hex + JSON.stringify(extra);
  if (!mats.has(key)) mats.set(key, new THREE.MeshPhysicalMaterial({ color: hex, roughness: .25, clearcoat: .7, clearcoatRoughness: .25, ...extra }));
  return mats.get(key);
}
const geos = new Map();
export const G = (k, make) => { if (!geos.has(k)) geos.set(k, make()); return geos.get(k); };
export function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
export const sph = (r, w = 20, h = 14) => G(`s${r}${w}${h}`, () => new THREE.SphereGeometry(r, w, h));
export const cyl = (rt, rb, h, n = 20, open = false) => G(`c${rt},${rb},${h},${n},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, n, 1, open));
export const tor = (r, t, a = Math.PI * 2) => G(`t${r},${t},${a}`, () => new THREE.TorusGeometry(r, t, 10, 28, a));
export const cone = (r, h, n = 18) => G(`k${r},${h},${n}`, () => new THREE.ConeGeometry(r, h, n));

/* ---------- the body ---------- */
const PROFILE = [[0, 0], [.78, 0], [.95, .1], [1.0, .3], [.96, .62], [.84, .92], [.62, 1.16], [.34, 1.3], [0, 1.34]];
const profPts = new THREE.CatmullRomCurve3(PROFILE.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal').getPoints(40).map(p => new THREE.Vector2(Math.max(0, p.x), Math.min(1.34, Math.max(0, p.y))));
profPts[profPts.length - 1].x = 0;
const BODY = await (await fetch(BASE + 'assets/jelly-body.json')).json();
const BUF = await (await fetch(BASE + BODY.file)).arrayBuffer();
const bodyGeo = (() => {
  const n = BODY.verts, g = new THREE.BufferGeometry(); let o = 0;
  const take = k => { const a = new Float32Array(BUF, o, n * k); o += n * k * 4; return a; };
  g.setAttribute('position', new THREE.BufferAttribute(take(3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(take(3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(take(2), 2)); g.setAttribute('armW', new THREE.BufferAttribute(take(1), 1));
  g.setAttribute('armG', new THREE.BufferAttribute(take(3), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(BUF, o, BODY.tris * 3), 1)); g.computeTangents(); g.computeBoundingSphere(); return g;
})();
const ARM = BODY.arm;
const ARM_AXIS = new THREE.Vector3(...ARM.tip).sub(new THREE.Vector3(...ARM.base)).normalize();
export const rAt = y => { for (let i = 1; i < profPts.length; i++) if (profPts[i].y >= y) { const a = profPts[i - 1], b = profPts[i]; return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return 0; };
const BR_N = 96, BR = (() => {
  const d = new THREE.CatmullRomCurve3(PROFILE.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal').getPoints(1200).map(p => [Math.max(0, p.x), Math.min(1.34, Math.max(0, p.y))]);
  const r = y => { for (let i = 1; i < d.length; i++) if (d[i][1] >= y) { const a = d[i - 1], b = d[i]; return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1] || 1); } return 0; };
  return Array.from({ length: BR_N + 1 }, (_, i) => r(i / BR_N * 1.34));
})();
const f4 = v => v.toFixed(4);
const PIV = `vec3(s * ${f4(ARM.pivot[0])}, ${f4(ARM.pivot[1])}, ${f4(ARM.pivot[2])})`;
const ARM_GLSL = /* glsl */`
attribute float armW;
attribute vec3 armG;
uniform vec4 uArmL, uArmR;
mat3 armRot(float w, vec4 A) {
  float a = -A.x * w, b = A.y * w, ca = cos(a), sa = sin(a), cb = cos(b), sb = sin(b);
  return mat3(1., 0., 0., 0., ca, sa, 0., -sa, ca) * mat3(cb, sb, 0., -sb, cb, 0., 0., 0., 1.);
}
vec3 armBend(vec3 p) {
  float w = abs(armW), s = sign(armW); if (w < 1e-4) return p;
  vec4 A = s < 0. ? uArmL : uArmR;
  vec3 P = ${PIV};
  vec3 ax = vec3(s * ${f4(ARM_AXIS.x)}, ${f4(ARM_AXIS.y)}, ${f4(ARM_AXIS.z)});
  vec3 q = p - P; q += (A.z - 1.) * w * max(dot(q, ax), 0.) * ax;
  return P + armRot(w, A) * q;
}
const float BR[${BR_N + 1}] = float[${BR_N + 1}](${BR.map(r => r.toFixed(4)).join(', ')});
vec2 bodyRad(float y) {
  const float dy = 1.34 / ${BR_N}.;
  float f = clamp(y / 1.34, 0., 1.) * ${BR_N}., i = min(floor(f), ${BR_N - 1}.), t = f - i; int k = int(i);
  float p0 = BR[max(k - 1, 0)], p1 = BR[k], p2 = BR[k + 1], p3 = BR[min(k + 2, ${BR_N})];
  float m1 = (p2 - p0) * .5, m2 = (p3 - p1) * .5, t2 = t * t, t3 = t2 * t;
  float r = (2. * t3 - 3. * t2 + 1.) * p1 + (t3 - 2. * t2 + t) * m1 + (-2. * t3 + 3. * t2) * p2 + (t3 - t2) * m2;
  float dr = (6. * t2 - 6. * t) * p1 + (3. * t2 - 4. * t + 1.) * m1 + (-6. * t2 + 6. * t) * p2 + (3. * t2 - 2. * t) * m2;
  return vec2(r, dr / dy);
}
mat3 armRotD(float w, vec4 A) {
  float a = -A.x * w, b = A.y * w, ca = cos(a), sa = sin(a), cb = cos(b), sb = sin(b);
  mat3 Rx = mat3(1., 0., 0., 0., ca, sa, 0., -sa, ca), Rz = mat3(cb, sb, 0., -sb, cb, 0., 0., 0., 1.);
  mat3 dRx = mat3(0., 0., 0., 0., -sa, ca, 0., -ca, -sa), dRz = mat3(-sb, cb, 0., -cb, -sb, 0., 0., 0., 0.);
  return -A.x * dRx * Rz + A.y * Rx * dRz;
}
vec3 armBendN(vec3 n, vec3 p) {
  float w = abs(armW), s = sign(armW); if (w < 1e-4) return n;
  vec4 A = s < 0. ? uArmL : uArmR;
  vec3 P = ${PIV};
  mat3 R = armRot(w, A); vec3 u = armRotD(w, A) * (p - P), g = s * armG, Rn = R * n;
  return normalize(Rn - (R * g) * dot(u, Rn) / max(.2, 1. + dot(g, transpose(R) * u)));
}
vec3 armBendT(vec3 t, vec3 p) {
  float w = abs(armW), s = sign(armW); if (w < 1e-4) return t;
  vec4 A = s < 0. ? uArmL : uArmR;
  vec3 P = ${PIV};
  return armRot(w, A) * t + armRotD(w, A) * (p - P) * dot(s * armG, t);
}
float sdBody(vec3 p) { vec2 R = bodyRad(p.y); return (length(p.xz) - R.x) / sqrt(1. + R.y * R.y); }
float sdCone(vec3 p, vec3 a, vec3 b, float r1, float r2) { vec3 pa = p - a, e = b - a; float h = clamp(dot(pa, e) / dot(e, e), 0., 1.); return length(pa - e * h) - (r1 + (r2 - r1) * h); }
float sminK(float a, float b, float k) { float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
float sdPosed(vec3 x, float s, vec4 A) {
  vec3 P = ${PIV};
  vec3 ax = vec3(s * ${f4(ARM_AXIS.x)}, ${f4(ARM_AXIS.y)}, ${f4(ARM_AXIS.z)});
  vec3 b = vec3(s * ${f4(ARM.base[0])}, ${f4(ARM.base[1])}, ${f4(ARM.base[2])});
  vec3 t = vec3(s * ${f4(ARM.tip[0])}, ${f4(ARM.tip[1])}, ${f4(ARM.tip[2])});
  t += (A.z - 1.) * max(dot(t - P, ax), 0.) * ax;
  vec3 xr = P + transpose(armRot(1., A)) * (x - P);
  return sminK(sdBody(x), sdCone(xr, b, t, ${f4(ARM.baseR)}, ${f4(ARM.tipR)}), ${f4(ARM.blend)});
}
vec3 gradPosed(vec3 x, float s, vec4 A) {
  const float e = .002;
  return normalize(vec3(sdPosed(x + vec3(e, 0., 0.), s, A) - sdPosed(x - vec3(e, 0., 0.), s, A),
                        sdPosed(x + vec3(0., e, 0.), s, A) - sdPosed(x - vec3(0., e, 0.), s, A),
                        sdPosed(x + vec3(0., 0., e), s, A) - sdPosed(x - vec3(0., 0., e), s, A)));
}
vec3 armSnap(vec3 p) {
  float w = abs(armW), s = sign(armW); if (w < 1e-4) return p;
  vec4 A = s < 0. ? uArmL : uArmR; vec3 x = p;
  for (int i = 0; i < 3; i++) x -= gradPosed(x, s, A) * sdPosed(x, s, A);
  return x;
}
vec3 armSnapN(vec3 n, vec3 p) {
  float w = abs(armW), s = sign(armW); if (w < 1e-4) return n;
  return gradPosed(p, s, s < 0. ? uArmL : uArmR);
}
`;
function bendArms(mat, u) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = ARM_GLSL + sh.vertexShader
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  objectNormal = armSnapN(armBendN(objectNormal, position), armSnap(armBend(position)));\n#ifdef USE_TANGENT\n  objectTangent = armBendT(objectTangent, position);\n#endif')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed = armSnap(armBend(transformed));');
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>',
      THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
  };
  mat.customProgramCacheKey = () => 'armbend';
  return mat;
}

/* ---------- paint ---------- */
const vAt = y => { for (let i = 1; i < profPts.length; i++) if (profPts[i].y >= y) return (i - 1 + (y - profPts[i - 1].y) / (profPts[i].y - profPts[i - 1].y || 1)) / (profPts.length - 1); return 1; };
const BW = 512, BH = 256;
const bpx = (angle, y) => [(.5 + angle / (Math.PI * 2)) * BW, (1 - vAt(y)) * BH];
export const shade = (hex, l) => new THREE.Color(hex).offsetHSL(0, 0, l).getStyle();
// level 1 paints (see the outfit kit in docs/levels/01-spring-break-boardwalk.md)
export const PAINT = {
  blush(c) { for (const s of [-1, 1]) { const [x, y] = bpx(s * .62, .6);
    const g = c.createRadialGradient(x, y, 0, x, y, 23); g.addColorStop(0, 'rgba(255,70,120,.55)'); g.addColorStop(1, 'rgba(255,70,120,0)');
    c.fillStyle = g; c.fillRect(x - 30, y - 30, 60, 60); } },
  // a loud shirt from the base up to the shoulders: flat ground, big flowers and leaves
  'hawaiian shirt'(c, col, o = {}) { const ground = o.ground ?? '#1f8fa0', [, top] = bpx(0, .58);
    c.fillStyle = ground; c.fillRect(0, top, BW, BH - top);
    for (let i = 0; i < 34; i++) { const x = Math.random() * BW, y = top + 8 + Math.random() * (BH - top - 10);
      if (Math.random() < .45) { c.fillStyle = '#2f6b2a'; c.save(); c.translate(x, y); c.rotate(Math.random() * 6); c.beginPath(); c.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2); c.fill(); c.restore(); continue; }
      c.fillStyle = pick(o.flowers ?? ['#ff5a6e', '#ffd84a', '#fff4e6', '#ff9a3c']);
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4.2, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(x, y, 2.4, 0, Math.PI * 2); c.fill(); }
    // collar points under the face
    c.fillStyle = shade(ground, .1); for (const s of [-1, 1]) { const [x, y] = bpx(s * .22, .6); c.beginPath(); c.moveTo(x, y - 2); c.lineTo(x + s * 26, y - 4); c.lineTo(x + s * 8, y + 18); c.fill(); } },
  'board shorts'(c, col, o = {}) { const [, top] = bpx(0, .22); c.fillStyle = o.ground ?? pick(['#ff5a4e', '#2a5acc', '#ffd84a', '#ff86c4']); c.fillRect(0, top, BW, BH - top);
    c.fillStyle = 'rgba(255,255,255,.75)'; for (let x = 0; x < BW; x += 22) c.fillRect(x, top, 6, BH - top); },
  // zinc on the nose: lifeguards. A white smear between the eyes
  zinc(c) { const [x, y] = bpx(0, .72); c.fillStyle = '#fbfbff'; c.beginPath(); c.ellipse(x, y, 13, 8, 0, 0, Math.PI * 2); c.fill(); },
  'tan lines'(c, col) { const [, a] = bpx(0, .62), [, b] = bpx(0, .5); c.fillStyle = shade(col, .14); c.fillRect(0, a, BW, b - a); },
  'ref stripes'(c) { const [, top] = bpx(0, .62); for (let x = 0, i = 0; x < BW; x += 18, i++) { c.fillStyle = i % 2 ? '#fbfbff' : '#1c1426'; c.fillRect(x, top, 18, BH - top); } },
  'lifeguard tank'(c) { const [, top] = bpx(0, .6); c.fillStyle = '#e8343c'; c.fillRect(0, top, BW, BH - top);
    c.fillStyle = '#fff'; const [x, y] = bpx(0, .42); c.fillRect(x - 4, y - 14, 8, 28); c.fillRect(x - 14, y - 4, 28, 8); },
};
const texCache = new Map();
function bodyTex(col, paints) {
  const k = col + '|' + paints.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(',');
  const shareable = !paints.some(p => p === 'hawaiian shirt' || p?.[0] === 'hawaiian shirt');
  if (shareable && texCache.has(k)) return texCache.get(k);
  const cv = document.createElement('canvas'); cv.width = BW; cv.height = BH; const c = cv.getContext('2d');
  c.fillStyle = col; c.fillRect(0, 0, BW, BH);
  for (const p of paints) { const [name, o] = Array.isArray(p) ? p : [p, {}]; PAINT[name](c, col, o); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.wrapS = THREE.RepeatWrapping;
  if (shareable) texCache.set(k, tex);
  return tex;
}
// transmission costs a second scene pass: the diorama turns it on for everyone or no one (quality toggle)
export const QUALITY = { transmission: true };
function bodyMaterial(col, paints) {
  const sc = new THREE.Color(col).lerp(new THREE.Color('#fff'), .55);
  const jc = new THREE.Color(col), deep = jc.clone().offsetHSL(0, .25, -.06);
  const m = new THREE.MeshPhysicalMaterial({ map: bodyTex(col, paints), roughness: .16, clearcoat: 1, clearcoatRoughness: .06,
    transmission: QUALITY.transmission ? .55 : 0, thickness: 1.4, ior: 1.36, attenuationColor: deep.clone().lerp(new THREE.Color('#fff'), .45), attenuationDistance: 2.2,
    emissive: deep, emissiveIntensity: .12,
    sheen: .35, sheenRoughness: .35, sheenColor: sc, specularIntensity: 1,
    side: THREE.DoubleSide, forceSinglePass: true });
  m.userData.trans = .55;
  return m;
}
const EYE_TILT = .36;
const eyeCache = new Map();
function eyeMaterial(col, pupil, lid = 0) {
  const k = `${pupil}|${lid ? col : ''}`;
  if (eyeCache.has(k)) return eyeCache.get(k).clone();   // clones share the texture; offsets differ per jelly via map clone below
  const W = 128, H = 64, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const p = pupil / 2;
  c.fillStyle = '#fbf8f4'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#241a2e'; c.beginPath(); c.arc(W * .25, H * .5, p, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(W * .25 - p * .35, H * .5 - p * .4, Math.max(1.5, p * .22), 0, Math.PI * 2); c.fill();
  if (lid) { c.fillStyle = col; c.fillRect(0, 0, W, H * lid); c.fillStyle = shade(col, -.15); c.fillRect(0, H * lid - 2, W, 2); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 4;
  tex.offset.y = EYE_TILT / Math.PI;
  const m = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .3, clearcoat: .6, clearcoatRoughness: .2 });
  eyeCache.set(k, m); return m;
}

/* ---------- level 1 outfit kit: 3D hats (clay) and a few props ---------- */
function domeShell(y0, off, lift = 1) {
  return G(`dome${y0},${off},${lift}`, () => {
    const src = [new THREE.Vector2(rAt(y0), y0), ...profPts.filter(p => p.y > y0 + 1e-3)];
    const out = src.map((p, i) => {
      const a = src[Math.max(0, i - 1)], b = src[Math.min(src.length - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const [nx, ny] = i === src.length - 1 ? [0, 1] : [ty, -tx];
      return new THREE.Vector2(Math.max(0, p.x + nx * off), y0 + (p.y + ny * off - y0) * lift);
    });
    out[out.length - 1].x = 0;
    return new THREE.LatheGeometry(out, 40);
  });
}
const shellTop = (y0, off, lift = 1) => y0 + (1.34 + off - y0) * lift;
// a soft brim: a flat ring that droops (or flips up) toward its outer edge, with a wavy rim
function brim(key, r0, r1, droop, wave = 0, n = 48) {
  return G(key, () => {
    const g = new THREE.RingGeometry(r0, r1, n, 3).rotateX(-Math.PI / 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), t = (r - r0) / (r1 - r0), a = Math.atan2(x, z);
      p.setY(i, -droop * t * t + wave * t * Math.sin(a * 7)); }
    g.computeVertexNormals(); return g;
  });
}
const DS = { side: THREE.DoubleSide };
export const HATS = {
  'backwards cap'(g, o = {}) { const m = clay(o.col ?? '#2a2035'), cg = new THREE.Group(); g.add(cg); cg.rotation.y = Math.PI;
    const y0 = 1.04, off = .05, R = rAt(y0) + off;
    mesh(domeShell(y0, off, 1.05), m, cg);
    mesh(tor(R, .03), m, cg, 0, y0, 0).rotation.x = Math.PI / 2;
    mesh(sph(.05), m, cg, 0, shellTop(y0, off, 1.05), 0);
    const bill = mesh(G('bill', () => { const s = new THREE.Shape(); s.moveTo(-.44, 0); s.quadraticCurveTo(-.46, .44, 0, .46); s.quadraticCurveTo(.46, .44, .44, 0); s.lineTo(-.44, 0);
      return new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 2, curveSegments: 16 }).rotateX(Math.PI / 2); }), m, cg, 0, y0 + .02, R - .14);
    bill.rotation.x = .14; },
  'sun hat'(g, o = {}) { const m = clay(o.col ?? '#fff1d6', .7, DS), y0 = 1.06, off = .05, R = rAt(y0) + off;
    mesh(domeShell(y0, off, 1.25), m, g);
    mesh(brim('sunbrim', R - .02, R + .72, .2, .035), m, g, 0, y0, 0);
    mesh(G('sunband', () => new THREE.CylinderGeometry(R + .005, R + .015, .12, 40, 1, true)), clay(o.band ?? '#ff4f9a', .4, DS), g, 0, y0 + .07, 0); },
  'captain hat'(g, o = {}) { const w = clay('#fbf8f2', .5), y0 = 1.1, R = rAt(y0) + .04;
    mesh(G('capband', () => new THREE.CylinderGeometry(R, R, .16, 40, 1, true)), clay('#1c1d33', .4, DS), g, 0, y0 + .08, 0);
    const top = mesh(cyl(R + .14, R + .02, .16, 40), w, g, 0, y0 + .24, -.04); top.scale.z = 1.04;
    mesh(cyl(R + .14, R + .14, .03, 40), w, g, 0, y0 + .33, -.04);
    const bill = mesh(G('capbill', () => new THREE.SphereGeometry(R * .9, 24, 8, -Math.PI / 2, Math.PI, Math.PI / 2, .5)), glossy('#141420', DS), g, 0, y0 + .02, .12);
    bill.scale.set(1, .5, 1.2);
    mesh(sph(.07), glossy('#ffcf3a', { metalness: .6, roughness: .2 }), g, 0, y0 + .12, R + .02).scale.set(1.3, 1, .5);
    if (o.stack) for (let i = 1; i < o.stack; i++) { const c = new THREE.Group(); c.position.y = .3 * i; c.scale.setScalar(1 - i * .06); g.add(c); HATS['captain hat'](c); } },
  'lifeguard hat'(g) { const m = clay('#ecd08a', 1.4, DS), y0 = 1.08, off = .05, R = rAt(y0) + off;
    mesh(domeShell(y0, off, 1.05), m, g);
    mesh(brim('lgbrim', R - .02, R + .62, .08), m, g, 0, y0, 0);
    mesh(G('lgband', () => new THREE.CylinderGeometry(R + .005, R + .01, .1, 40, 1, true)), clay('#e8343c', .4, DS), g, 0, y0 + .06, 0); },
  visor(g, o = {}) { const m = clay(o.col ?? '#ffffff', .4, DS), y0 = 1.0, R = rAt(y0) + .03;
    mesh(G('visorband', () => new THREE.CylinderGeometry(R, R, .14, 40, 1, true)), m, g, 0, y0 + .06, 0);
    const b = mesh(G('visorbill', () => new THREE.SphereGeometry(R * 1.02, 24, 8, -Math.PI / 2, Math.PI, Math.PI / 2, .55)), glossy(o.bill ?? '#3cc8a0', { transparent: true, opacity: .8, ...DS }), g, 0, y0 + .02, .1);
    b.scale.set(1, .45, 1.25); },
  'bucket hat'(g, o = {}) { const m = clay(o.col ?? '#f2e6c4', 1, DS), y0 = 1.04, off = .06, R = rAt(y0) + off;
    mesh(domeShell(y0, off, 1.15), m, g);
    mesh(G('bucketbrim', () => new THREE.CylinderGeometry(R, R + .3, .2, 40, 1, true)), m, g, 0, y0 - .06, 0); },
  'soda-can hat'(g) { const m = clay('#ff3a4e', .5), y0 = 1.06, off = .04;
    mesh(domeShell(y0, off, 1.05), clay('#fff4e6'), g);
    for (const s of [-1, 1]) { const c = mesh(cyl(.13, .13, .36, 16), glossy('#e8343c'), g, s * .42, 1.42, 0); c.rotation.z = s * .2;
      mesh(cyl(.02, .02, .7, 6), clay('#fff4e6'), g, s * .22, 1.3, .2).rotation.set(.6, 0, -s * 1.1); } void m; },
  'paper hat'(g) { const m = clay('#fffaf2', .4, DS);
    const h = mesh(G('paperhat', () => new THREE.CylinderGeometry(.02, .5, .36, 4, 1, true).scale(1, 1, .32)), m, g, 0, 1.36, 0); h.rotation.y = Math.PI / 4 * 0;
    mesh(cyl(.08, .08, .05, 10), clay('#ff5a4e'), g, 0, 1.38, .17).rotation.x = Math.PI / 2; },
  'swim cap'(g) { mesh(domeShell(.98, .03, 1.02), glossy('#ffd84a'), g); },
};
export const EXTRAS = {
  aviators(g) { const fm = glossy('#ffcf3a', { metalness: .6, roughness: .2 }), lm = glossy('#3a2a20', { clearcoat: 1, roughness: .08 });
    for (const s of [-1, 1]) { const l = mesh(sph(.22, 20, 12), lm, g, s * .26, .76, 1.0); l.scale.set(1, 1.1, .3); l.rotation.y = s * .25; }
    mesh(cyl(.016, .016, .18, 6), fm, g, 0, .85, 1.06).rotation.z = Math.PI / 2; },
  'cat-eye shades'(g) { const m = glossy('#ffffff', { clearcoat: 1, roughness: .1 }), lm = glossy('#1c1426', { clearcoat: 1, roughness: .08 });
    for (const s of [-1, 1]) { const f = mesh(sph(.25, 20, 12), m, g, s * .27, .8, .99); f.scale.set(1.1, .8, .3); f.rotation.set(0, s * .25, -s * .35);
      const l = mesh(sph(.2, 20, 12), lm, g, s * .27, .79, 1.04); l.scale.set(1.05, .78, .25); l.rotation.set(0, s * .25, -s * .35); } },
  wraparounds(g) { mesh(G('wrap', () => new THREE.TorusGeometry(.78, .09, 8, 28, Math.PI * .55)), glossy('#ff3a8e', { clearcoat: 1, roughness: .1 }), g, 0, .8, .2).rotation.set(0, 0, Math.PI * .225 + Math.PI / 2 * 0); },
  'gold chain'(g) { const m = glossy('#ffcf3a', { metalness: .7, roughness: .18 }), r = rAt(.5) + .03;
    const c = mesh(G('chain', () => new THREE.TorusGeometry(r, .035, 8, 40)), m, g, 0, .5, 0); c.rotation.x = Math.PI / 2 - .18;
    mesh(sph(.09), m, g, 0, .4, r * .98).scale.set(1, 1, .4); },
  whistle(g) { const r = rAt(.52) + .02; mesh(G('lanyard', () => new THREE.TorusGeometry(r, .015, 6, 40)), clay('#e8343c'), g, 0, .52, 0).rotation.x = Math.PI / 2 - .2;
    mesh(cyl(.05, .05, .14, 10), glossy('#d8dde6', { metalness: .7, roughness: .2 }), g, 0, .42, r).rotation.x = Math.PI / 2; },
};
export const PROPS = {
  phone(h) { mesh(G('phone', () => new THREE.BoxGeometry(.2, .34, .04)), glossy('#2a2035'), h, 0, .14, 0);
    mesh(G('screen', () => new THREE.PlaneGeometry(.17, .29)), new THREE.MeshBasicMaterial({ color: '#9fe8ff' }), h, 0, .14, -.022).rotation.y = Math.PI; },
  cigar(h) { mesh(cyl(.04, .04, .34, 10), clay('#7a4426'), h, 0, 0, .14).rotation.x = Math.PI / 2;
    mesh(cyl(.041, .041, .05, 10), clay('#ff5a4e'), h, 0, 0, .06).rotation.x = Math.PI / 2;
    mesh(sph(.042, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff8a3a' }), h, 0, 0, .31); },
  drink(h, o = {}) { mesh(cyl(.13, .1, .3, 14), glossy(o.col ?? pick(['#ff5a6e', '#4fdcb9', '#ffd84a', '#7fe0ff'])), h, 0, .1, 0);
    const s = mesh(cyl(.018, .018, .32, 6), clay('#ff86c4'), h, .04, .36, 0); s.rotation.z = -.3; },
  'selfie stick'(h) { const s = mesh(cyl(.025, .025, 1.3, 6), glossy('#d8dde6', { metalness: .6, roughness: .2 }), h, 0, .6, .2); s.rotation.x = -.35;
    const p = new THREE.Group(); p.position.set(0, 1.22, -.02); h.add(p); PROPS.phone(p); p.rotation.x = .6; },
  'ice cream'(h) { const c = mesh(cone(.12, .3), clay('#e8a85a', 1.2), h, 0, .06, 0); c.rotation.x = Math.PI;
    mesh(sph(.15), clay(pick(['#ff9ac8', '#fff4e6', '#8ad84a'])), h, 0, .26, 0); },
  'hot dog'(h) { const b = mesh(G('bun', () => new THREE.CapsuleGeometry(.07, .3, 4, 10)), clay('#e8b060'), h, 0, .12, 0); b.rotation.z = Math.PI / 2;
    const d = mesh(G('dog', () => new THREE.CapsuleGeometry(.045, .4, 4, 10)), clay('#c8503a'), h, 0, .17, 0); d.rotation.z = Math.PI / 2; },
  'metal detector'(h) { const m = glossy('#9aa0aa', { metalness: .6, roughness: .3 }); const s = mesh(cyl(.02, .02, 1.1, 6), m, h, 0, -.1, .4); s.rotation.x = 1.0;
    mesh(cyl(.17, .17, .03, 20), clay('#2a2035'), h, 0, -.42, .92); },
  'fishing rod'(h) { const r = mesh(cyl(.015, .03, 2.6, 6), clay('#6b4226'), h, 0, .9, .6); r.rotation.x = .75; },
  binoculars(h) { for (const s of [-1, 1]) mesh(cyl(.06, .06, .2, 10), glossy('#1c1426'), h, s * .07, .05, .05).rotation.x = Math.PI / 2; },
  'tip jar'(h) { mesh(cyl(.13, .13, .26, 14), glossy('#bfe8ff', { transparent: true, opacity: .55 }), h, 0, .1, 0); },
  kazoo(h) { mesh(cyl(.04, .05, .24, 10), glossy('#ffd84a'), h, 0, 0, .12).rotation.x = Math.PI / 2; },
};

/* ---------- one jelly ---------- */
export const JELLY_COLS = ['#ff86c4', '#4fdcb9', '#ff9a3c', '#a68cff', '#4a8dff', '#ffd84a', '#ff5a6e', '#3cc8e0', '#8ad84a', '#ff7aa8'];
const W = .88, H = 1.06;   // the reference proportions
// spec: { col, size, paints: [name | [name, opts]], hat: [name, opts], extras: [names], prop: [name, opts], eyes: 'normal'|'sleepy'|'big'|'small', beh }
export function makeJelly(spec = {}) {
  const col = spec.col ?? pick(JELLY_COLS), size = spec.size ?? rand(.55, .72);
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const armU = { uArmL: { value: new THREE.Vector4(0, 0, 1, 0) }, uArmR: { value: new THREE.Vector4(0, 0, 1, 0) } };
  const body = mesh(bodyGeo, bendArms(bodyMaterial(col, spec.paints ?? []), armU), rig);
  body.customDepthMaterial = bendArms(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), armU);
  const pr = { normal: 19, small: 11, big: 27, sleepy: 19 }[spec.eyes ?? 'normal'];
  const em = eyeMaterial(col, pr, spec.eyes === 'sleepy' ? .44 : 0); em.map = em.map.clone(); em.map.needsUpdate = true;
  const eyes = [-.24, .24].map(sx => { const e = mesh(sph(.2, 20, 14), em, rig, sx, .78, .83); e.scale.set(1, 1.15, .6); e.rotation.x = -EYE_TILT; e.castShadow = false; return e; });
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * ARM.pivot[0], ARM.pivot[1], ARM.pivot[2]); rig.add(pivot);
    const rest = new THREE.Vector3(side * (ARM.hold[0] - ARM.pivot[0]), ARM.hold[1] - ARM.pivot[1], ARM.hold[2] - ARM.pivot[2]);
    const hold = new THREE.Group(); hold.position.copy(rest); hold.rotation.order = 'ZYX'; pivot.add(hold);
    return { side, pivot, hold, rest, axis: ARM_AXIS.clone().multiply(new THREE.Vector3(side, 1, 1)), u: side < 0 ? armU.uArmL : armU.uArmR };
  });
  const acc = new THREE.Group(); rig.add(acc);
  if (spec.hat) { const [n, o] = [].concat(spec.hat); HATS[n](acc, o ?? {}); }
  for (const n of spec.extras ?? []) EXTRAS[n](acc);
  if (spec.prop) { const [n, o] = [].concat(spec.prop); PROPS[n](arms[1].hold, o ?? {}); }
  if (spec.propL) { const [n, o] = [].concat(spec.propL); PROPS[n](arms[0].hold, o ?? {}); }
  acc.traverse(o => { if (o.isMesh) o.castShadow = size > .5; });
  rig.scale.set(size * W, size * H, size * W);
  const j = { root, rig, body, eyes, eyeMat: em, arms, acc, col, size, spec, beh: spec.beh ?? 'idle', ph: rand(0, 20), name: spec.name };
  root.traverse(o => { o.userData.j = j; });
  return j;
}
export function setTransmission(jellies, on) {
  QUALITY.transmission = on;
  for (const j of jellies) { j.body.material.transmission = on ? j.body.material.userData.trans : 0; j.body.material.needsUpdate = true; }
}

/* ---------- animation ---------- */
const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
function setArm(a, fwd, out, stretch = 1) {
  const o = Math.max(-.95, Math.min(1.5, out - ARM.restOut)), f = Math.max(-.6, Math.min(1.7, fwd));
  a.u.value.set(f, a.side * o, stretch, 0);
  a.pivot.rotation.set(-f, 0, a.side * o);
  a.hold.position.copy(a.rest).addScaledVector(a.axis, (stretch - 1) * Math.max(0, a.rest.dot(a.axis)));
  a.hold.rotation.set(f, 0, -a.side * o);
}
const JIGGLE = 2;
// behaviours for the diorama: the level 1 loops in miniature. The root's position and yaw belong to the scene
// (routes, facing); this only poses the rig.
export function animate(j, t) {
  const T = t + j.ph, [L, R] = j.arms;
  let bob = 0, q = Math.sin(T * 2.2) * .025, lean = 0, turn = 0, crouch = 0, tilt = 0;
  let lf = 0, lo = .12, rf = 0, ro = .12, rs = 1, look = [Math.sin(T * .7) * .03, 0], closed = false;
  switch (j.beh) {
    case 'idle': lo = ro = .15 + Math.sin(T * 1.3) * .05; break;
    case 'waving': ro = 2.5 + Math.sin(T * 12) * .35; rf = .3; lean = -.05; break;
    case 'cheering': { const k = Math.abs(Math.sin(T * 5)); bob = k * .3; lo = ro = 2.4 + k * .3; lf = rf = .2; break; }
    case 'dancing': bob = Math.abs(Math.sin(T * 6)) * .35; q = -Math.max(0, .12 - bob) * .8; turn = Math.sin(T * 3) * .45;
      lo = 1.8 + Math.sin(T * 6) * .8; ro = 1.8 - Math.sin(T * 6) * .8; lean = Math.sin(T * 3) * .1; break;
    case 'chatting': bob = Math.max(0, Math.sin(T * 5)) * .04; lean = Math.sin(T * 1.3) * .08;
      rf = .7 + Math.sin(T * 5) * .5; ro = .45 + Math.sin(T * 3.1) * .2; lf = .3 + Math.sin(T * 4.3) * .3; lo = .3; break;
    case 'phone': rf = 1.25; ro = -.35; rs = 1.2 + Math.sin(T * 9) * .02; look = [0, -.05]; break;
    case 'selfie': rf = 1.1; ro = .9; lo = .2 + Math.sin(T * 2) * .1; tilt = Math.sin(T * 1.6) * .12; bob = Math.max(0, Math.sin(T * 3)) * .05; break;
    case 'smoking': { const c = T % 4.5, up = ease(c / .8) * (1 - ease((c - 2.4) / .8)); rf = 1.5 * up; ro = .15 - .55 * up; rs = 1 + .35 * up; break; }
    case 'eating': { const c = T % 1.8, up = ease(c / .4) * (1 - ease((c - .9) / .4)); rf = 1.5 * up; ro = .15 - .55 * up; rs = 1 + .35 * up;
      if (c > .45 && c < .9) q = -Math.abs(Math.sin((c - .45) * 21)) * .08; break; }
    case 'napping': closed = true; q = Math.sin(T * 1.1) * .06; lean = .12; lo = ro = .05; break;
    case 'sunbathing': closed = true; q = .12 + Math.sin(T * 1.1) * .03; lo = ro = 1.2; break;   // flattened in the sun, arms spread
    case 'scanning': { rf = lf = 1.35; ro = -.3; lo = -.3; turn = Math.sin(T * .6) * .9; look = [0, .02]; break; }   // binoculars up
    case 'walking': bob = Math.abs(Math.sin(T * 7)) * .12; lf = Math.sin(T * 7) * .6; rf = -Math.sin(T * 7) * .6; lo = ro = .25; lean = 0; break;
    case 'floating': bob = Math.sin(T * 1.4) * .06; lean = Math.sin(T * .9) * .08; lo = ro = 1.1 + Math.sin(T * 1.4) * .1; break;
    case 'fishing': rf = .9; ro = .1; lo = .1; q += Math.sin(T * .5) * .02; break;
    case 'statue': lo = 1.5; ro = 2.8; rf = .4; q = 0; look = [0, 0]; break;   // Silver Steve: never moves
    case 'volleyball': { const c = T % 2.2; const jump = c < .5 ? Math.sin(c / .5 * Math.PI) : 0; bob = jump * .7; lo = ro = 1.2 + jump * 1.5; lf = rf = .5 + jump * .6; break; }
    case 'djing': bob = Math.abs(Math.sin(T * 8)) * .12; rf = .9 + Math.sin(T * 8) * .2; lf = .9; ro = .4; lo = .4 + Math.max(0, Math.sin(T * 2)) * 2; break;
  }
  if (j.beh === 'statue') { closed = false; }
  j.rig.position.y = bob;
  j.rig.rotation.set(0, turn, lean + tilt);
  q *= JIGGLE;
  const sy = j.size * H * (1 - q - crouch), sxz = j.size * W * (1 + q * .7 + crouch * .4);
  j.rig.scale.set(sxz, sy, sxz);
  setArm(L, lf, lo); setArm(R, rf, ro, rs);
  const blink = closed || (j.beh !== 'statue' && (T % 3.7) < .12);
  j.eyes.forEach(e => e.scale.y = blink ? .12 : 1.15);
  j.eyeMat.map.offset.x = -(look[0] / .2) / (Math.PI * 2);
  j.eyeMat.map.offset.y = -(look[1] / .2 - EYE_TILT) / Math.PI;
}

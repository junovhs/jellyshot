// Clay sculpting kit: signed distance functions + a surface-nets mesher.
// A character is written as one SDF (smooth unions blend the parts like pressed-together clay),
// then polygonised into a single seamless mesh with normals from the field's gradient.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

/* ---------------- primitives (scalar args, no allocation: they run millions of times) ---------------- */
export const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
export const sph = (x, y, z, cx, cy, cz, r) => len3(x - cx, y - cy, z - cz) - r;
// ellipsoid (iq's bound): good near the surface, which is all we need
export function ell(x, y, z, cx, cy, cz, rx, ry, rz) {
  const px = x - cx, py = y - cy, pz = z - cz;
  const k0 = len3(px / rx, py / ry, pz / rz), k1 = len3(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k1 === 0 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
}
// capsule whose radius tapers from r1 at a to r2 at b
export function cone(x, y, z, ax, ay, az, bx, by, bz, r1, r2) {
  const px = x - ax, py = y - ay, pz = z - az, ex = bx - ax, ey = by - ay, ez = bz - az;
  const h = Math.max(0, Math.min(1, (px * ex + py * ey + pz * ez) / (ex * ex + ey * ey + ez * ez)));
  return len3(px - ex * h, py - ey * h, pz - ez * h) - (r1 + (r2 - r1) * h);
}
export const cap = (x, y, z, ax, ay, az, bx, by, bz, r) => cone(x, y, z, ax, ay, az, bx, by, bz, r, r);
export function rbox(x, y, z, cx, cy, cz, hx, hy, hz, r) {
  const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r, qz = Math.abs(z - cz) - hz + r;
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
// a chain of tapering capsules through points [[x,y,z,r], ...], smoothly joined
export function chain(x, y, z, pts, k = .04) {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    d = smin(d, cone(x, y, z, a[0], a[1], a[2], b[0], b[1], b[2], a[3], b[3]), k);
  }
  return d;
}
export function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; }
export const smax = (a, b, k) => -smin(-a, -b, k);

/* ---------------- clay surface: thumb-press lumps and faint smear lines ---------------- */
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
export function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
           l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf), zf);
}
// add to a distance near the surface only (cheap, and keeps the field well-behaved)
export function clayGrain(d, x, y, z, amp = 1) {
  if (Math.abs(d) > .06) return d;
  // broad, soft thumb-presses; only a whisper of fine grain (the old mix read as cratered)
  const n = (vnoise(x * 5, y * 5, z * 5) - .5) * .006 + (vnoise(x * 13 + 5, y * 13, z * 13) - .5) * .0018
          + Math.sin((x * 2.1 + y * 1.3 + z * .7) * 22 + vnoise(x * 3, y * 3, z * 3) * 5) * .0007;
  return d + n * amp;
}

/* ---------------- surface nets ---------------- */
// sdf(x,y,z) -> distance; color(x,y,z) -> 0xRRGGBB. Returns an indexed BufferGeometry.
export function sculpt(sdf, color, min, max, cell = .02) {
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1, ny = Math.ceil((max[1] - min[1]) / cell) + 1, nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const F = new Float32Array(nx * ny * nz);
  const I = (i, j, k) => i + nx * (j + ny * k);
  // coarse-to-fine: sample every 4th point first; fine samples are only evaluated near the surface
  const S = 4, mx = Math.ceil((nx - 1) / S) + 1, my = Math.ceil((ny - 1) / S) + 1, mz = Math.ceil((nz - 1) / S) + 1;
  // a fine sample is never more than sqrt(3)*S/2 cells from its coarse sample, so beyond that the coarse value is safe
  const G = new Float32Array(mx * my * mz), far = cell * (Math.sqrt(3) * S / 2 + 1.2);
  for (let k = 0; k < mz; k++) for (let j = 0; j < my; j++) for (let i = 0; i < mx; i++)
    G[i + mx * (j + my * k)] = sdf(min[0] + i * S * cell, min[1] + j * S * cell, min[2] + k * S * cell);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const g = G[Math.round(i / S) + mx * (Math.round(j / S) + my * Math.round(k / S))];
    F[I(i, j, k)] = Math.abs(g) > far ? g : sdf(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell);
  }

  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const C = (i, j, k) => i + cx * (j + cy * k);
  const cellV = new Int32Array(cx * cy * cz).fill(-1);
  const pos = [], nor = [], col = [];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8), e = 1e-3, c3 = new THREE.Color(), c2 = new THREE.Color();
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let neg = 0;
    for (let b = 0; b < 8; b++) { v[b] = F[I(i + (b & 1), j + ((b >> 1) & 1), k + ((b >> 2) & 1))]; if (v[b] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EDGES) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += (a & 1) + (((b & 1) - (a & 1)) * t);
      sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * t);
      sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * t);
      n++;
    }
    let x = min[0] + (i + sx / n) * cell, y = min[1] + (j + sy / n) * cell, z = min[2] + (k + sz / n) * cell;
    // gradient → normal; one Newton step pulls the vertex onto the true surface
    let d = sdf(x, y, z);
    let gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    let gl = len3(gx, gy, gz) || 1;
    const step = Math.max(-cell, Math.min(cell, d * 2 * e / gl));
    x -= gx / gl * step; y -= gy / gl * step; z -= gz / gl * step;
    gx = sdf(x + e, y, z) - sdf(x - e, y, z); gy = sdf(x, y + e, z) - sdf(x, y - e, z); gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    gl = len3(gx, gy, gz) || 1;
    cellV[C(i, j, k)] = pos.length / 3;
    pos.push(x, y, z); nor.push(gx / gl, gy / gl, gz / gl);
    const cv = color(x, y, z);
    if (typeof cv === 'number') c3.setHex(cv); else { c3.setHex(cv[0]); c3.lerp(c2.setHex(cv[1]), cv[2]); }
    col.push(c3.r, c3.g, c3.b);
  }

  const idx = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const f0 = F[I(i, j, k)] < 0;
    if (i < cx && j > 0 && k > 0 && j < cy && k < cz && f0 !== (F[I(i + 1, j, k)] < 0))
      quad(cellV[C(i, j - 1, k - 1)], cellV[C(i, j, k - 1)], cellV[C(i, j, k)], cellV[C(i, j - 1, k)], !f0);
    if (j < cy && i > 0 && k > 0 && i < cx && k < cz && f0 !== (F[I(i, j + 1, k)] < 0))
      quad(cellV[C(i - 1, j, k - 1)], cellV[C(i - 1, j, k)], cellV[C(i, j, k)], cellV[C(i, j, k - 1)], !f0);
    if (k < cz && i > 0 && j > 0 && i < cx && j < cy && f0 !== (F[I(i, j, k + 1)] < 0))
      quad(cellV[C(i - 1, j - 1, k)], cellV[C(i, j - 1, k)], cellV[C(i, j, k)], cellV[C(i - 1, j, k)], !f0);
  }
  // make every triangle face the way its gradient normals point (robust to winding mistakes above)
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2];
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
    const ndot = fx * (nor[a] + nor[b] + nor[c]) + fy * (nor[a + 1] + nor[b + 1] + nor[c + 1]) + fz * (nor[a + 2] + nor[b + 2] + nor[c + 2]);
    if (ndot < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/* ---------------- helpers for placing features on a surface ---------------- */
// march along a ray until we hit the surface; returns the distance travelled
export function hit(sdf, ox, oy, oz, dx, dy, dz, far = 4) {
  let t = 0;
  for (let s = 0; s < 200 && t < far; s++) {
    const d = sdf(ox + dx * t, oy + dy * t, oz + dz * t);
    if (d < 1e-4) return t;
    t += Math.max(d * .8, 1e-3);
  }
  return far;
}
// front surface z at (x, y), from a ray fired down -z
export const frontZ = (sdf, x, y) => 3 - hit(sdf, x, y, 3, 0, 0, -1, 6);

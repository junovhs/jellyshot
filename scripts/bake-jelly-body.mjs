// Bake the jelly base mesh: the clay3d gumdrop body and both arms as one smooth-unioned SDF (DEC-06).
// Sculpted once here, never at load. Output: concepts/assets/jelly-body.bin + jelly-body.json.
// Per vertex: position, normal, uv (cylindrical, matching the randomizer's paint canvas) and armW
// (signed arm weight: -1 left arm .. 0 body .. +1 right arm) for the shoulder bend in the vertex shader.
// Run: npm run bake:body
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { sculpt, cone, smin } from '../concepts/sculpt.js';
import { simplify, simplifierReady } from '../concepts/simplify.js';

/* ---------- the shape (keep PROFILE and its curve in step with concepts/randomizer.html) ---------- */
// centripetal Catmull-Rom: the uniform SplineCurve overshot at the base corner and dented a dark ring round the bottom
const PROFILE = [[0, 0], [.78, 0], [.95, .1], [1.0, .3], [.96, .62], [.84, .92], [.62, 1.16], [.34, 1.3], [0, 1.34]];
const prof = new THREE.CatmullRomCurve3(PROFILE.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal').getPoints(40).map(p => [Math.max(0, p.x), Math.min(1.34, Math.max(0, p.y))]);
prof[prof.length - 1][0] = 0;
// the SDF uses a much finer polyline: its normals are flat along each segment, and 40 segments shaded the
// lower body in visible horizontal steps. `prof` (40) stays for the uv, so it matches the randomizer's vAt.
const profD = new THREE.CatmullRomCurve3(PROFILE.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal').getPoints(1200).map(p => [Math.max(0, p.x), Math.min(1.34, Math.max(0, p.y))]);
profD[profD.length - 1][0] = 0;

// The arms are sculpted held out (a T-pose), so their tips stay clear of the body and never fuse to it.
// The shader swings them down from here; ARM.restOut says how far that rest pose sits above "hanging".
const ARM = {
  pivot: [.8, .66, .1],              // shoulder pivot (right arm; the left is mirrored in x)
  base: [.66, .68, .1], baseR: .3,   // fat root, buried in the body
  tip: [1.08, .6, .12], tipR: .23,   // short, round thumb tip: a stub, never a tentacle
  blend: .16,                        // smooth-union radius: the fillet where arm becomes body
  hold: [1.16, .56, .3],             // prop grip at the tip, a little in front
  restOut: .38,                      // radians the sculpted arm is raised above the old "out = 0" pose
};
const TAPER = 1.2;   // shoulder weight falloff into the body, in multiples of the blend radius. The randomizer snaps the bent shoulder onto the posed union, so this only needs to be wide enough to start the bend smoothly; wider drags the top of the head along with the arm

// signed distance to the revolved profile: 2D polygon distance in (radius, height)
function body(x, y, z) {
  const r = Math.hypot(x, z);
  let d = Infinity, inside = false;
  const n = profD.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {   // closed: the last point joins the first along the axis
    const [ax, ay] = profD[j], [bx, by] = profD[i];
    const ex = bx - ax, ey = by - ay, wx = r - ax, wy = y - ay;
    const h = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(wx - ex * h, wy - ey * h));
    if ((ay > y) !== (by > y) && r < ax + (y - ay) * ex / ey) inside = !inside;
  }
  return inside ? -d : d;
}
const arm = (x, y, z, s) => cone(x, y, z, s * ARM.base[0], ARM.base[1], ARM.base[2], s * ARM.tip[0], ARM.tip[1], ARM.tip[2], ARM.baseR, ARM.tipR);
const sdf = (x, y, z) => smin(body(x, y, z), arm(x, y, z, x < 0 ? -1 : 1), ARM.blend);

/* ---------- mesh, simplify ---------- */
await simplifierReady;
const t0 = performance.now();
const dense = sculpt(sdf, () => 0xffffff, [-1.5, -.06, -1.1], [1.5, 1.42, 1.1], .016);
const g = simplify(dense, 9000);
// the simplifier lets vertices drift off the surface (lumpy silhouette, faceted bottom rim): snap every vertex
// back onto the exact SDF surface and take its normal from the field, so the shape matches the old lathe
{
  const P = g.getAttribute('position').array, N = g.getAttribute('normal').array, e = 1e-4;
  const grad = (x, y, z) => { const gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l]; };
  for (let i = 0; i < P.length; i += 3) {
    let x = P[i], y = P[i + 1], z = P[i + 2];
    for (let k = 0; k < 6; k++) { const d = sdf(x, y, z), [nx, ny, nz] = grad(x, y, z); x -= nx * d; y -= ny * d; z -= nz * d; }
    const n = grad(x, y, z); P[i] = x; P[i + 1] = y; P[i + 2] = z; N[i] = n[0]; N[i + 1] = n[1]; N[i + 2] = n[2];
  }
}
console.log(`sculpted ${dense.index.count / 3} tris, simplified to ${g.index.count / 3} in ${Math.round(performance.now() - t0)} ms`);

/* ---------- uv, arm weight, back-seam split ---------- */
// v from height along the profile (the randomizer's vAt); u = .5 + angle/2pi, angle 0 = front (+z), + toward +x
const vAt = y => { for (let i = 1; i < prof.length; i++) if (prof[i][1] >= y) return (i - 1 + (y - prof[i - 1][1]) / (prof[i][1] - prof[i - 1][1] || 1)) / (prof.length - 1); return 1; };
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const P = g.getAttribute('position').array, N = g.getAttribute('normal').array, idx = Array.from(g.index.array);
const pos = Array.from(P), nor = Array.from(N), uv = [], armW = [], armG = [];
// signed arm weight: wide on the body side (the shoulder drapes), short on the arm side (the whole stub turns fully)
const wAt = (x, y, z) => { const s = x < 0 ? -1 : 1; return s * sm(-ARM.blend * TAPER, ARM.blend * .7, body(x, y, z) - arm(x, y, z, s)); };
for (let i = 0; i < P.length / 3; i++) {
  const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], s = x < 0 ? -1 : 1;
  uv.push(.5 + Math.atan2(x, z) / (Math.PI * 2), vAt(Math.min(1.34, Math.max(0, y))));
  // weight by which shape owns the point: 1 where the arm is nearer, 0 on the body, blended across the fillet
  armW.push(wAt(x, y, z));
  // the weight's gradient: the shader needs it to bend normals correctly where the turn angle varies
  const e = 1e-3; armG.push((wAt(x + e, y, z) - wAt(x - e, y, z)) / (2 * e), (wAt(x, y + e, z) - wAt(x, y - e, z)) / (2 * e), (wAt(x, y, z + e) - wAt(x, y, z - e)) / (2 * e));
}
// triangles that straddle the back seam: give their low-u corners a copy with u + 1 (the texture repeats)
const dup = new Map();
for (let t = 0; t < idx.length; t += 3) {
  const us = [0, 1, 2].map(c => uv[idx[t + c] * 2]);
  if (Math.max(...us) - Math.min(...us) < .5) continue;
  for (let c = 0; c < 3; c++) {
    const v = idx[t + c];
    if (uv[v * 2] >= .5) continue;
    if (!dup.has(v)) {
      dup.set(v, pos.length / 3);
      pos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); nor.push(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]);
      uv.push(uv[v * 2] + 1, uv[v * 2 + 1]); armW.push(armW[v]); armG.push(armG[v * 3], armG[v * 3 + 1], armG[v * 3 + 2]);
    }
    idx[t + c] = dup.get(v);
  }
}

/* ---------- write ---------- */
const verts = pos.length / 3;
const chunks = [Float32Array.from(pos), Float32Array.from(nor), Float32Array.from(uv), Float32Array.from(armW), Float32Array.from(armG), Uint32Array.from(idx)];
const buf = Buffer.concat(chunks.map(a => Buffer.from(a.buffer)));
writeFileSync('concepts/assets/jelly-body.bin', buf);
writeFileSync('concepts/assets/jelly-body.json', JSON.stringify({ file: 'assets/jelly-body.bin', verts, tris: idx.length / 3, bytes: buf.length,
  layout: 'f32 position[3], f32 normal[3], f32 uv[2], f32 armW[1], f32 armG[3] per vertex, then u32 index', arm: ARM }, null, 1));
console.log(`wrote ${verts} verts, ${idx.length / 3} tris, ${(buf.length / 1024).toFixed(0)} KB (${dup.size} seam copies)`);

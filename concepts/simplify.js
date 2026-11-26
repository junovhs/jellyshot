// Mesh simplification for sculpted parts (meshoptimizer). The sculpt is dense and evenly spaced;
// jelly is smooth, so most of those triangles can go without a visible change. Normals and colours
// come from the dense sculpt and are kept per vertex, so the shading stays smooth after simplifying.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { MeshoptSimplifier } from 'https://cdn.jsdelivr.net/npm/meshoptimizer@1.3.0/meshopt_simplifier.js';

export const simplifierReady = MeshoptSimplifier.ready;

// geometry: indexed, with position/normal/color. Returns a new compact geometry with ~tris triangles.
export function simplify(g, tris) {
  const have = g.index.count / 3;
  if (tris >= have * .95) return g;
  const pos = g.getAttribute('position').array, nor = g.getAttribute('normal').array, col = g.getAttribute('color').array;
  const n = pos.length / 3, attr = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) {
    attr[i * 6] = nor[i * 3]; attr[i * 6 + 1] = nor[i * 3 + 1]; attr[i * 6 + 2] = nor[i * 3 + 2];
    attr[i * 6 + 3] = col[i * 3]; attr[i * 6 + 4] = col[i * 3 + 1]; attr[i * 6 + 5] = col[i * 3 + 2];
  }
  // normals weigh in so curvature keeps its triangles; colours so painted edges (mouth, blush) stay crisp
  const [idx] = MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(g.index.array), Float32Array.from(pos), 3, attr, 6,
    [.5, .5, .5, 1.5, 1.5, 1.5], null, Math.max(24, Math.round(tris) * 3), .02);
  const remap = new Int32Array(n).fill(-1); let k = 0;
  for (const v of idx) if (remap[v] < 0) remap[v] = k++;
  const P = new Float32Array(k * 3), N = new Float32Array(k * 3), C = new Float32Array(k * 3);
  for (let v = 0; v < n; v++) {
    const r = remap[v]; if (r < 0) continue;
    for (let a = 0; a < 3; a++) { P[r * 3 + a] = pos[v * 3 + a]; N[r * 3 + a] = nor[v * 3 + a]; C[r * 3 + a] = col[v * 3 + a]; }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  out.setIndex(new THREE.BufferAttribute(Uint32Array.from(idx, v => remap[v]), 1));
  return out;
}

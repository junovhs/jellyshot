// Bake Judge Gumbo at three LODs into compact binary meshes for the perf test (concepts/assets/gumbo-*.bin).
// He's sculpted once at hero resolution, merged by material group (jelly / clay / gloss, so a baked
// character is 3 draw calls), then simplified with meshoptimizer to each LOD's triangle budget.
// Run: node --import ./scripts/register-cdn-three.mjs scripts/bake-gumbo.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { writeFileSync } from 'node:fs';
import { MeshoptSimplifier } from 'meshoptimizer';
import { assemble, DETAIL } from '../concepts/gumbo-model.js';

const GROUP = { jelly: 'jelly', jellyDark: 'jelly', tongue: 'jelly', lid: 'jelly', clay: 'clay', eye: 'gloss', pupil: 'gloss', glint: 'gloss', steel: 'gloss', bubble: 'gloss' };
const FLAT = { eye: 0xfffdf8, pupil: 0x1e1626, glint: 0xffffff, steel: 0xcfc9e0, bubble: 0xfff6e8 };
const c = new THREE.Color();

// triangle budget for the whole character at each LOD
const BUDGET = { hero: 40000, mid: 10000, far: 2500 };
await MeshoptSimplifier.ready;

const t0 = performance.now();
const sculptMs = () => Math.round(performance.now() - t0);
const source = (() => {
  const { root } = assemble(DETAIL.hero);
  root.updateMatrixWorld(true);
  const groups = { jelly: [], clay: [], gloss: [] };
  root.traverse(m => {
    if (!m.isMesh) return;
    let g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    g.deleteAttribute('uv');
    if (!g.getAttribute('color')) {
      c.setHex(FLAT[m.userData.tag]);
      const n = g.getAttribute('position').count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    if (!g.index) g = g.toNonIndexed(), g.setIndex([...Array(g.getAttribute('position').count).keys()]);
    groups[GROUP[m.userData.tag]].push(g);
  });
  const merged = {};
  for (const [name, list] of Object.entries(groups)) merged[name] = mergeGeometries(list);
  return merged;
})();
const heroMs = sculptMs();
const sourceTris = Object.values(source).reduce((n, g) => n + g.index.count / 3, 0);
console.log(`sculpted ${sourceTris.toLocaleString()} source tris in ${heroMs} ms`);

// simplify one group to a triangle count, keeping normals and colours in mind, then drop unused vertices
function simplify(g, tris) {
  const pos = g.getAttribute('position').array, nor = g.getAttribute('normal').array, col = g.getAttribute('color').array;
  const n = pos.length / 3, attr = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) attr.set([nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2], col[i * 3], col[i * 3 + 1], col[i * 3 + 2]], i * 6);
  const [idx] = MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(g.index.array), Float32Array.from(pos), 3, attr, 6, [.6, .6, .6, 1, 1, 1], null, Math.max(36, Math.round(tris) * 3), .05);
  const remap = new Int32Array(n).fill(-1); let k = 0;
  for (const v of idx) if (remap[v] < 0) remap[v] = k++;
  const P = new Float32Array(k * 3), N = new Float32Array(k * 3), C = new Float32Array(k * 3);
  for (let v = 0; v < n; v++) { const r = remap[v]; if (r < 0) continue; for (let a = 0; a < 3; a++) { P[r * 3 + a] = pos[v * 3 + a]; N[r * 3 + a] = nor[v * 3 + a]; C[r * 3 + a] = col[v * 3 + a]; } }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  out.setIndex(new THREE.BufferAttribute(Uint32Array.from(idx, v => remap[v]), 1));
  return out;
}

const manifest = {};
for (const lod of Object.keys(BUDGET)) {
  const t1 = performance.now();
  const ratio = BUDGET[lod] / sourceTris;
  const groups = Object.fromEntries(Object.entries(source).map(([name, g]) => [name, simplify(g, g.index.count / 3 * ratio)]));
  const ms = Math.round(performance.now() - t1);
  // layout per group: positions f32, normals i8 (quantised), colours u8 (sRGB-ish linear bytes), indices u32
  const chunks = [], meta = {};
  let off = 0;
  const push = arr => { const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); const pad = (4 - (b.length % 4)) % 4; chunks.push(b, Buffer.alloc(pad)); const o = off; off += b.length + pad; return o; };
  let tris = 0;
  for (const [name, g] of Object.entries(groups)) {
    const pos = g.getAttribute('position').array, nor = g.getAttribute('normal').array, col = g.getAttribute('color').array, idx = g.index.array;
    const n8 = new Int8Array(nor.length); for (let i = 0; i < nor.length; i++) n8[i] = Math.round(nor[i] * 127);
    const c8 = new Uint8Array(col.length); for (let i = 0; i < col.length; i++) c8[i] = Math.round(Math.min(1, Math.max(0, col[i])) * 255);
    const i32 = Uint32Array.from(idx);
    meta[name] = { verts: pos.length / 3, tris: i32.length / 3, pos: push(Float32Array.from(pos)), nor: push(n8), col: push(c8), idx: push(i32) };
    tris += i32.length / 3;
  }
  const buf = Buffer.concat(chunks);
  writeFileSync(`concepts/assets/gumbo-${lod}.bin`, buf);
  manifest[lod] = { file: `assets/gumbo-${lod}.bin`, bytes: buf.length, tris, sculptMs: heroMs, simplifyMs: ms, groups: meta };
  console.log(`${lod}: ${tris.toLocaleString()} tris, ${(buf.length / 1048576).toFixed(2)} MB, simplified in ${ms} ms`);
}
writeFileSync('concepts/assets/gumbo-lods.json', JSON.stringify(manifest, null, 1));

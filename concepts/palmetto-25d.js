// LVL-01 Palmetto Point as a 2.5D world (Don't Starve / Cult of the Lamb structure, no line art): a flat painted
// floor, standing cutouts that face the fixed camera, and the 3D jellies walking among them. Everything stands on y = 0.
// Same layout as concepts/diorama.html. Map: x east, z south (toward the camera). The sea is west, the beach runs
// north–south, the boardwalk is east of the beach, the pier runs west from it out to sea, the Grand Flamingo is north-east.
import * as THREE from 'three';
import { standing, ground, size } from './sprites.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- painted floor textures (tiled, world-scaled) ---------- */
function canvasTex(px, paint, repeatUnits) {
  const cv = document.createElement('canvas'); cv.width = cv.height = px; const g = cv.getContext('2d'); paint(g, px);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.repeat.set(1 / repeatUnits, 1 / repeatUnits); return t;
}
function speckle(g, px, n, cols, r0, r1, rnd) { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = .25 + rnd() * .35; g.beginPath(); g.ellipse(rnd() * px, rnd() * px, r0 + rnd() * (r1 - r0), (r0 + rnd() * (r1 - r0)) * .7, rnd() * 3, 0, 7); g.fill(); } g.globalAlpha = 1; }
function planks(g, px, { col = '#d8ab78', n = 8, along = 'x', rnd }) {
  const s = px / n;
  for (let i = 0; i < n; i++) {
    const c = new THREE.Color(col).offsetHSL(0, 0, (rnd() - .5) * .07).getStyle(); g.fillStyle = c;
    if (along === 'x') g.fillRect(0, i * s, px, s); else g.fillRect(i * s, 0, s, px);
    g.fillStyle = 'rgba(120, 70, 40, .22)';   // the gap: a soft shade, not a line
    if (along === 'x') g.fillRect(0, i * s + s - 3, px, 3); else g.fillRect(i * s + s - 3, 0, 3, px);
    g.fillStyle = 'rgba(255, 240, 210, .25)'; if (along === 'x') g.fillRect(0, i * s, px, 2); else g.fillRect(i * s, 0, 2, px);
  }
  speckle(g, px, 40, ['#a87a4a'], 1, 3, rnd);
}
// floor art that blends (soft shades, footprints, blob shadows) but still draws in the floor pass, before any jelly
export const decal = (extra = {}) => new THREE.MeshBasicMaterial({ toneMapped: false, depthTest: false, depthWrite: false, transparent: false,
  blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, ...extra });
const basic = (map, extra = {}) => new THREE.MeshBasicMaterial({ map, toneMapped: false, depthTest: false, depthWrite: false, ...extra });

export function buildMap(scene, rnd, { tilt }) {
  const rand = (a, b) => a + rnd() * (b - a), pick = a => a[Math.floor(rnd() * a.length)];
  const A = { occluders: [], tick: [], standers: [] };
  const shoreX = z => -14 + Math.sin(z * .09) * 1.6 + Math.sin(z * .23 + 1) * .6; A.shoreX = shoreX;
  const layer = (geo, mat, order) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = order; scene.add(m); return m; };
  const flat = (pts, mat, order) => { const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    return layer(new THREE.ShapeGeometry(s, 2).rotateX(-Math.PI / 2), mat, order); };
  const rect = (x0, z0, x1, z1, mat, order) => flat([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], mat, order);
  const soft = (x0, z0, x1, z1, order, a = .18) => rect(x0, z0, x1, z1, decal({ color: '#6a4a3a', opacity: a }), order);

  /* ---------- the sea: one shader for water, wet sand, the wash and its foam ---------- */
  const seaU = { uT: { value: 0 } };
  const sea = layer(new THREE.PlaneGeometry(420, 420).rotateX(-Math.PI / 2).translate(-150, -.02, -40), new THREE.ShaderMaterial({
    uniforms: seaU, toneMapped: false, depthFunc: THREE.AlwaysDepth,   // writes depth so swimmers sit half under the water
    vertexShader: `varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uT; varying vec2 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float x = vW.x, z = vW.y;
        float shore = -14. + sin(z * .09) * 1.6 + sin(z * .23 + 1.) * .6;
        float s = x - shore;                       // + toward the land
        if (s > 4.6) discard;
        float wash = .6 + 1.3 * (.5 + .5 * sin(uT * .55 + z * .045)) + n(vec2(z * .4, uT * .3)) * .5;   // how far the wave runs up
        vec3 wet = vec3(.86, .70, .49), shallow = vec3(.42, .86, .84), mid = vec3(.17, .71, .78), deep = vec3(.09, .51, .65);
        float d = -s;                              // distance out to sea
        vec3 water = mix(shallow, mid, smoothstep(0., 7., d)); water = mix(water, deep, smoothstep(10., 40., d));
        // soft swells: lighter bands drifting toward the shore
        float sw = sin(d * .9 + uT * 1.3 + n(vec2(z * .15, d * .1)) * 4.);
        water += vec3(.07, .09, .08) * smoothstep(.75, 1., sw) * smoothstep(40., 4., d);
        water += vec3(.10) * smoothstep(.82, .9, n(vec2(x * 1.3, z * 1.3 + uT * .4))) * .6;   // glints
        vec3 col = s > 0. ? wet * (1. - .06 * n(vec2(x * 3., z * 3.))) : water;
        if (s > 0. && s < wash) col = mix(col, shallow, .55 * (1. - s / wash));        // the wash over the sand
        float edge = abs(s - wash);
        col = mix(col, vec3(1., .98, .94), smoothstep(.35, .05, edge) * .9);          // the foam lip
        col = mix(col, vec3(1.), smoothstep(.12, 0., abs(s + .4 + .3 * sin(z * .6 + uT))) * .35 * step(s, 0.));
        float sand = smoothstep(4.1, 4.6, s); col = mix(col, vec3(.95, .84, .63), sand);
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }` }), -10);
  A.tick.push(t => { seaU.uT.value = t; });

  /* ---------- dry sand from the wet line east ---------- */
  const zs = []; for (let z = 70; z >= -110; z -= 2) zs.push(z);
  const sandTex = canvasTex(256, (g, px) => { g.fillStyle = '#f3d6a0'; g.fillRect(0, 0, px, px); speckle(g, px, 260, ['#e8c088', '#fff0cc', '#dcae74'], 1, 4, rnd); }, 6);
  flat([...zs.map(z => [shoreX(z) + 4.4, z]), [200, -110], [200, 70]], basic(sandTex), -9);
  // the beach's paths of footprints and dunes: a few soft darker swirls for scale
  for (let i = 0; i < 18; i++) { const z = rand(-46, 28), x = rand(shoreX(z) + 6, 3); const m = layer(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), decal({ color: '#d8b07a', opacity: .18 }), -8.5); m.position.set(x, 0, z); m.scale.set(rand(1.5, 3), 1, rand(.6, 1.2)); }

  /* ---------- the street along the south edge ---------- */
  rect(-60, 34, 80, 42, basic(canvasTex(128, (g, px) => { g.fillStyle = '#6f6a78'; g.fillRect(0, 0, px, px); speckle(g, px, 120, ['#5f5a68', '#807a88'], 1, 3, rnd); }, 6)), -8);
  rect(-60, 31.8, 80, 34, basic(canvasTex(64, (g, px) => { g.fillStyle = '#efe4d2'; g.fillRect(0, 0, px, px); g.fillStyle = 'rgba(150,120,100,.18)'; g.fillRect(0, px - 3, px, 3); g.fillRect(px - 3, 0, 3, px); }, 2)), -8);
  for (let x = -55; x < 80; x += 5) rect(x, 37.8, x + 2.6, 38.2, basic(null, { color: '#fff3c0' }), -7.9);

  /* ---------- boardwalk and pier ---------- */
  const BWX = 10, BWW = 8; Object.assign(A, { BWX, BWW });
  const plankX = canvasTex(256, (g, px) => planks(g, px, { along: 'y', rnd }), 4);   // boards across the boardwalk (it runs north–south)
  const plankZ = canvasTex(256, (g, px) => planks(g, px, { along: 'x', rnd, col: '#d2a170' }), 4);
  soft(BWX - BWW / 2 - .25, -52.2, BWX + BWW / 2 + .25, 32.2, -7.5, .22);
  rect(BWX - BWW / 2, -52, BWX + BWW / 2, 32, basic(plankX), -7);
  const PIER_Z = -6, PIER_LEN = 50; Object.assign(A, { PIER_Z, PIER_LEN });
  soft(BWX - PIER_LEN - .3, PIER_Z - 3.8, BWX - BWW / 2, PIER_Z + 3.8, -7.5, .3);
  rect(BWX - PIER_LEN, PIER_Z - 3.5, BWX - BWW / 2, PIER_Z + 3.5, basic(plankZ), -7);
  A.onPier = (s, side = 0) => V(BWX - s, 0, PIER_Z + side);
  // the dock for the jet skis
  soft(-30.3, 13.6, -17.8, 16.6, -7.5, .3); rect(-30, 14, -18, 16.2, basic(plankZ), -7);

  /* ---------- the Grand Flamingo deck ---------- */
  const RES = V(29, 0, -38); A.RES = RES;
  const tiles = canvasTex(128, (g, px) => { g.fillStyle = '#fbefe0'; g.fillRect(0, 0, px, px); g.fillStyle = 'rgba(200,160,130,.25)'; g.fillRect(0, px / 2 - 2, px, 4); g.fillRect(px / 2 - 2, 0, 4, px); g.fillStyle = '#fff8ee'; g.fillRect(4, 4, px / 2 - 8, px / 2 - 8); }, 3);
  soft(RES.x - 13.3, RES.z - 12.3, RES.x + 13.3, RES.z + 12.3, -7.5, .2);
  rect(RES.x - 13, RES.z - 12, RES.x + 13, RES.z + 12, basic(tiles), -7);
  A.poolP = V(RES.x - 1, 0, RES.z + 2);
  { const pw = 12, pd = 6.5, p = A.poolP;
    rect(p.x - pw / 2 - .5, p.z - pd / 2 - .5, p.x + pw / 2 + .5, p.z + pd / 2 + .5, basic(null, { color: '#ffffff' }), -6.5);
    const poolU = { uT: { value: 0 } };
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: poolU, toneMapped: false, depthFunc: THREE.AlwaysDepth,
      vertexShader: `varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uT; varying vec2 vW; void main(){ vec3 c = vec3(.31, .82, .93);
        float k = sin(vW.x * 2.1 + uT * 1.7 + sin(vW.y * 1.7 + uT)) * sin(vW.y * 2.4 - uT * 1.3 + sin(vW.x * 1.3));
        c += vec3(.25) * smoothstep(.55, .95, k); gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }` }));
    pool.position.set(p.x, -.02, p.z); pool.renderOrder = -6; scene.add(pool); A.tick.push(t => { poolU.uT.value = t; }); }
  A.lagoonP = V(RES.x + 9, 0, RES.z + 5);

  /* ---------- the volleyball court (lines on the sand), net runs east–west ---------- */
  A.court = V(-3, 0, 0);
  { const c = A.court, w = 9, d = 5, lm = basic(null, { color: '#fff6e0' }), t = .12;
    rect(c.x - w / 2, c.z - d, c.x + w / 2, c.z - d + t, lm, -6); rect(c.x - w / 2, c.z + d - t, c.x + w / 2, c.z + d, lm, -6);
    rect(c.x - w / 2, c.z - d, c.x - w / 2 + t, c.z + d, lm, -6); rect(c.x + w / 2 - t, c.z - d, c.x + w / 2, c.z + d, lm, -6); }

  /* ---------- standing pieces ---------- */
  const shadowTex = canvasTex(64, (g, px) => { const r = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2); r.addColorStop(0, 'rgba(70,40,60,.5)'); r.addColorStop(.6, 'rgba(70,40,60,.25)'); r.addColorStop(1, 'rgba(70,40,60,0)'); g.fillStyle = r; g.fillRect(0, 0, px, px); }, 1);
  shadowTex.wrapS = shadowTex.wrapT = THREE.ClampToEdgeWrapping; shadowTex.repeat.set(1, 1); A.shadowTex = shadowTex;
  const shadowMat = decal({ map: shadowTex }); A.shadowMat = shadowMat;
  const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); A.blobGeo = blobGeo;
  const blob = (x, z, w, d, o = .95) => { const m = new THREE.Mesh(blobGeo, o === .95 ? shadowMat : shadowMat.clone()); if (o !== .95) m.material.opacity = o; m.position.set(x, .01, z); m.scale.set(w, 1, d); m.renderOrder = -2; scene.add(m); return m; };
  A.blob = blob;
  const stand = (name, x, z, { s = 1, sh = .75, occ = false, flip = false } = {}) => {
    const m = standing(name, tilt, s); m.position.set(x, 0, z); if (flip) m.scale.x *= -1; scene.add(m);
    const k = size(name); if (sh) blob(x, z + .1, k.w * s * sh, k.w * s * sh * .38);
    if (occ) A.occluders.push(m); A.standers.push(m); return m; };
  const flatArt = (name, x, z, ry = 0, s = 1) => { const m = ground(name, s); m.position.set(x, .005, z); m.rotation.y = ry; scene.add(m); return m; };

  // street and town
  [[-2, 'teal'], [18, 'coral'], [27, 'lemon'], [40, 'grape']].forEach(([x, c], i) => stand('car-' + c, x, i % 2 ? 36.3 : 39.7, { flip: i % 2 === 0 }));
  for (let z = 28, i = 0; z > -22; z -= rand(9, 11)) for (const x of [31, 39]) stand('town-' + (i++ % 8), x, z, { s: rand(.95, 1.15), sh: .6 });
  // boardwalk
  for (let z = 28; z > -50; z -= 12) stand('lamp', BWX - BWW / 2 + .4, z, { sh: .5 });
  A.arch = stand('arch', BWX, 30.5, { sh: .4 });
  const SX = 16.6;
  // the shop row's paving, from the boardwalk's east edge
  rect(BWX + BWW / 2, -24, 25, 26, basic(canvasTex(128, (g, px) => { g.fillStyle = '#f2e2c8'; g.fillRect(0, 0, px, px); g.fillStyle = 'rgba(170,130,100,.16)'; g.fillRect(0, px / 2 - 2, px, 4); g.fillRect(px / 2 - 2, 0, 4, px / 2); g.fillRect(px / 4 - 2, px / 2, 4, px / 2); speckle(g, px, 30, ['#e0cfb2'], 1, 3, rnd); }, 2.4)), -7.2);
  A.rosa = stand('stall-margaritas', SX, 22); A.vinnie = stand('shack-airbrush', SX, 12); A.arcade = stand('arcade', SX + .4, 1);
  A.golf = stand('minigolf', SX + .2, -10); A.pam = stand('stall-sharkteeth', SX, -19);
  A.halCart = stand('hotdog', BWX + 2.2, 17); stand('plinth', BWX + 1.5, 6, { sh: .5 });
  for (let z = 20; z > -46; z -= rand(15, 19)) stand('palm', BWX - BWW / 2 - 1.6 - rand(0, 3), z, { s: rand(.85, 1.05), flip: rnd() < .5, occ: true, sh: .45 });
  for (const z of [27, 7, -4, -15]) stand('palm', SX + 7.5, z, { s: rand(.95, 1.1), flip: rnd() < .5, occ: true, sh: .45 });
  // beach
  A.towerA = stand('lifeguard-red', -8, 16); A.towerB = stand('lifeguard-yellow', -8, -26);
  A.towerTop = t => V(t.position.x, 0, t.position.z + .3);   // lifeguards stand in front of their towers
  stand('net', A.court.x, A.court.z, { sh: .2 });
  A.castle = V(-10, 0, 7); stand('sandcastle', A.castle.x, A.castle.z);
  A.frank = V(2, 0, 22); stand('icecream', A.frank.x, A.frank.z);
  const UMB = ['coral', 'teal', 'sun', 'flamingo', 'blue', 'orange'], TOW = ['pink', 'teal', 'sun', 'grape', 'coral'], CH = ['teal', 'coral', 'sun'];
  const spots = []; A.beachSpots = spots;
  for (let i = 0, tries = 0; i < 30 && tries < 600; tries++) {
    const z = rand(-46, 28), x = rand(shoreX(z) + 5.5, 3.5);
    if (Math.abs(x - A.court.x) < 7 && Math.abs(z - A.court.z) < 7) continue;
    if ([A.castle, A.frank, V(-8, 0, 16), V(-8, 0, -26)].some(p => Math.hypot(p.x - x, p.z - z) < 4)) continue;
    if (Math.abs(z - PIER_Z) < 5.5) continue;
    if (spots.some(([a, b]) => Math.hypot(a - x, b - z) < 4)) continue;
    stand('umbrella-' + pick(UMB), x, z, { occ: true, sh: .55 });
    flatArt('towel-' + pick(TOW), x + 1.3, z + .9, rand(-.4, .4));
    if (i % 3 === 0) stand('chair-' + pick(CH), x - 1.1, z + 1.2, { flip: rnd() < .5, sh: .5 });
    spots.push([x + 1.3, z + .9]); i++;
  }
  // pier
  for (let s = 6; s <= PIER_LEN; s += 4) for (const side of [-3.6, 3.6]) stand('piling', BWX - s, PIER_Z + side, { sh: 0 });
  A.booth = A.onPier(30); stand('booth-jiggle', A.booth.x, A.booth.z - 1.6, { sh: .5 }); A.shelly = stand('crab', A.booth.x - 4.2, A.booth.z - 2.2, { s: .85, sh: .5 });
  stand('baitshop', A.onPier(44).x, PIER_Z - 1.8, { sh: .5 });
  stand('bench', A.onPier(38).x, PIER_Z + 2.9, { sh: .5 }); stand('bench', A.onPier(22).x, PIER_Z - 2.9, { sh: .5 });
  // water
  A.dockEnd = V(-29, 0, 15);
  [['lemon', -20], ['pink', -23], ['blue', -26]].forEach(([c, x]) => flatArt('jetski-' + c, x, 12.4, Math.PI / 2));
  A.brayJet = flatArt('jetski-lemon', -34, 22); A.jetHome = A.brayJet.position.clone();
  A.psBoat = stand('parasail', -32, 2, { sh: 0 });
  A.moon = stand('yacht', -30, -30, { sh: 0 });
  A.barge = stand('barge', -36, -48, { sh: 0 });
  A.kay = flatArt('kayak', -36, 28, .7); A.kayHome = A.kay.position.clone();
  for (const [z, c] of [[24, 'red'], [6, 'sun'], [-16, 'red'], [-38, 'sun']]) stand('buoy-' + c, -26, z, { sh: 0 });
  // the Grand Flamingo
  stand('resort', RES.x + 1, RES.z - 10, { sh: .5 });
  flatArt('lagoon', A.lagoonP.x, A.lagoonP.z); stand('gator', A.lagoonP.x + .5, A.lagoonP.z + .4, { sh: 0 });
  A.tikiP = V(RES.x - 9, 0, RES.z + 8); stand('tikibar', A.tikiP.x, A.tikiP.z - .8);
  A.djP = V(RES.x - 3, 0, RES.z - 3); stand('djbooth', A.djP.x, A.djP.z - .6);
  for (const [dx, dz] of [[-9, -2], [6, -2], [5, 9]]) stand('cannon', RES.x + dx, RES.z + dz, { sh: .5 });
  A.gateP = V(BWX + BWW / 2 + 1.4, 0, -27); stand('gate', A.gateP.x, A.gateP.z, { sh: .4 });
  for (const [dx, dz] of [[-10, 3], [-7, 10], [9, -1]]) stand('chair-white', RES.x + dx, RES.z + dz, { sh: .5 });
  for (let x = RES.x - 11; x < RES.x + 13; x += 2.4) stand('bush', x, RES.z + 12.4, { s: rand(.9, 1.15), sh: .5 });
  for (const x of [RES.x - 8, RES.x - 1, RES.x + 7]) stand('palm', x, RES.z + 11.6, { s: rand(1, 1.15), flip: rnd() < .5, occ: true, sh: .45 });
  return A;
}

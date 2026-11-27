// LVL-01 Palmetto Point: the ground, the set pieces and their anchors, as a module.
// Ported from concepts/diorama.html (which keeps its own inline copy). Map: x east (right), z south (toward the perch).
// The sea is west, the beach runs north–south, the boardwalk and its stalls are east of the beach, the pier runs west
// from the boardwalk out to sea, and the Grand Flamingo fills the north-east corner. The square is x -40..40, z -48..32.
import * as THREE from 'three';
import { mesh, clay, glossy, G } from './jelly-rig.js';
import * as K from './boardwalk-kit.js';
const { PAL } = K;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildMap(scene, rnd) {
  const rand = (a, b) => a + rnd() * (b - a), pick = a => a[Math.floor(rnd() * a.length)];
  const animated = [];
  const place = (obj, x, y, z, ry = 0, s = 1) => { obj.position.set(x, y, z); obj.rotation.y = ry; obj.scale.setScalar(s); scene.add(obj);
    obj.traverse(o => { if (o.isMesh) { o.castShadow ??= true; o.receiveShadow = true; } }); return obj; };
  const put = (obj, x, y, z, ry, s) => { place(obj, x, y, z, ry, s); animated.push(obj); return obj; };
  const occluders = [];   // things you look down through: umbrellas and palm crowns (the game fades them near the reticle)
  const A = { animated, occluders };

  /* ---------- ground ---------- */
  const shoreX = z => -14 + Math.sin(z * .09) * 1.6 + Math.sin(z * .23 + 1) * .6;   // the waterline, wobbling along z
  A.shoreX = shoreX;
  const flatShape = (pts, mat, y) => { const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s, 2).rotateX(-Math.PI / 2), mat); m.position.y = y; m.receiveShadow = true; scene.add(m); return m; };
  const zs = []; for (let z = 120; z >= -200; z -= 2) zs.push(z);
  flatShape([...zs.map(z => [shoreX(z), z]), [300, -200], [300, 120]], clay(PAL.sand, 1.4), .02);
  flatShape([...zs.map(z => [shoreX(z) - .3, z]), ...zs.slice().reverse().map(z => [shoreX(z) + 4.5, z])], clay(PAL.wetSand, 1.4), .03);
  { const foam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zs.map(z => V(shoreX(z) - .5, .1, z))), 600, .28, 6), clay(PAL.foam, .4));
    foam.scale.y = .35; scene.add(foam); A.foam = foam; }
  const seaMat = new THREE.MeshPhysicalMaterial({ color: PAL.sea, roughness: .12, clearcoat: 1, clearcoatRoughness: .1, sheen: .4, sheenColor: new THREE.Color('#cffaff') });
  A.seaMat = seaMat;
  { const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2), seaMat); sea.position.set(-380, -.05, -60); sea.receiveShadow = true; scene.add(sea);
    flatShape([...zs.map(z => [shoreX(z) + .2, z]), ...zs.slice().reverse().map(z => [shoreX(z) - 12, z])], new THREE.MeshPhysicalMaterial({ color: '#5fd8d8', roughness: .1, clearcoat: 1, transparent: true, opacity: .55 }), -.02); }
  { const geo = G('ripple', () => new THREE.TorusGeometry(1, .05, 3, 14, Math.PI * .5).rotateX(Math.PI / 2)), n = 160;
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#8fe4ee', transparent: true, opacity: .6 }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) { const z = rand(-90, 50), x = shoreX(z) - rand(4, 60); q.setFromAxisAngle(V(0, 1, 0), Math.PI * .5 + rand(-.3, .3)); m4.compose(V(x, -.03, z), q, V(1.6, 1, 1)); im.setMatrixAt(i, m4); }
    im.castShadow = false; scene.add(im); A.ripples = im; }
  { const road = new THREE.Mesh(new THREE.PlaneGeometry(220, 8).rotateX(-Math.PI / 2), clay(PAL.asphalt, 1.2)); road.position.set(40, .06, 38); road.receiveShadow = true; scene.add(road);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(220, 2.2).rotateX(-Math.PI / 2), clay('#efe4d2', 1)); walk.position.set(40, .1, 33); walk.receiveShadow = true; scene.add(walk);
    [[-2, PAL.teal], [18, PAL.coral], [27, PAL.lemon], [40, '#a68cff']].forEach(([x, c], i) => place(K.car(c), x, 0, i % 2 ? 36.3 : 39.7, i % 2 ? 0 : Math.PI)); }

  /* ---------- boardwalk ---------- */
  const BWX = 10, BWW = 8, BWY = .45;
  Object.assign(A, { BWX, BWW, BWY });
  place(K.boardwalkDeck(84, BWW), BWX, -.2, -10, Math.PI / 2);
  for (let z = 28; z > -50; z -= 12) place(K.streetLamp(), BWX - BWW / 2 + .4, BWY, z, 0);
  put(K.welcomeArch(), BWX, BWY, 30, 0, 1.15);
  const SX = 19, face = -Math.PI / 2 + .45;
  A.rosa = put(K.stall({ sign: "ROSA'S MARGARITAS", cols: [PAL.lemon, '#8ad84a'], body: PAL.teal, extra: g => { mesh(G('blender', () => new THREE.CylinderGeometry(.25, .18, .6, 12)), glossy('#bfeaff', { transparent: true, opacity: .6 }), g, .9, 1.5, .2); } }), SX, BWY, 22, face, 1.15);
  A.vinnie = put(K.shack('AIRBRUSH TEES'), SX, BWY, 12, face, 1.1);
  A.arcade = put(K.arcade(), SX + 1, BWY, 1, face, 1.1);
  A.golf = put(K.miniGolf(), SX + 3, BWY, -10, face, 1.1);
  A.pam = put(K.stall({ sign: "PAM'S SHARK TEETH", cols: [PAL.flamingo, PAL.white], body: '#3a7aff' }), SX, BWY, -19, face, 1.15);
  A.halCart = put(K.hotDogCart(), BWX + 2.2, BWY, 17, -.5, 1.1);
  put(K.plinth(), BWX + 1.5, BWY, 6, 0, 1.1);
  for (let z = 20; z > -46; z -= rand(15, 19)) occluders.push(put(K.palm(rand(6, 7.5), rand(.12, .32), rnd()), BWX - BWW / 2 - 1.6 - rand(0, 3), 0, z, rand(0, 6)));
  for (const z of [27, 7, -4, -15]) occluders.push(put(K.palm(rand(7, 8.5), rand(.1, .3), rnd()), SX + 6, 0, z, rand(0, 6)));
  const TOWN = ['#ffd8b0', '#ffc2d6', '#c8e8ff', '#d8f0c0', '#fff0a8', '#e8d0ff', '#ffe0e8', '#bff0e0'];
  for (let z = 28; z > -22; z -= rand(9, 11)) for (const x of [30, 39]) {
    const w = rand(6.5, 8.5), h = x === 30 ? rand(3.5, 5.5) : rand(5, 9), g = new THREE.Group();
    K.box(g, w, h, w * rand(.8, 1), clay(pick(TOWN), 1.1), 0, 0, 0, .35); K.box(g, w + .5, .4, w * .9, clay(PAL.white), 0, h, 0, .15);
    for (let k = 0; k < Math.floor(h / 2.6); k++) K.box(g, w * .7, .8, .1, glossy('#7fd8f0'), -w * .5 - .02, 1.2 + k * 2.6, 0, .05).rotation.y = Math.PI / 2;
    place(g, x, 0, z, 0); }

  /* ---------- beach ---------- */
  A.towerA = put(K.lifeguardTower(PAL.red, false), -8, 0, 16, -Math.PI / 2, 1.1);
  A.towerB = put(K.lifeguardTower('#ffb020', true), -8, 0, -26, -Math.PI / 2, 1.1);
  A.court = V(-3, 0, 0); put(K.volleyballCourt(), A.court.x, 0, A.court.z, 0);
  A.castle = V(-10, 0, 7); put(K.sandcastle(), A.castle.x, 0, A.castle.z, -.3, 1.2);
  A.frank = V(2, 0, 22); put(K.iceCreamCart(), A.frank.x, 0, A.frank.z, -.4);
  const UMB = [[PAL.coral, PAL.white], [PAL.teal, PAL.white], [PAL.sun, PAL.pink], [PAL.flamingo, PAL.white], ['#3a7aff', PAL.white], [PAL.orange, PAL.lemon]];
  const beachSpots = []; A.beachSpots = beachSpots;
  for (let i = 0, tries = 0; i < 30 && tries < 600; tries++) {
    const z = rand(-46, 28), x = rand(shoreX(z) + 5, 3.5);
    if (Math.abs(x - A.court.x) < 7 && Math.abs(z - A.court.z) < 6) continue;
    if ([A.castle, A.frank, V(-8, 0, 16), V(-8, 0, -26)].some(p => Math.hypot(p.x - x, p.z - z) < 4)) continue;
    if (Math.abs(z + 6) < 5) continue;
    if (beachSpots.some(([a, b]) => Math.hypot(a - x, b - z) < 4)) continue;
    occluders.push(put(K.umbrella(pick(UMB)), x, 0, z, rand(0, 6)));
    place(K.towel(pick([PAL.pink, PAL.teal, PAL.sun, '#a68cff', PAL.coral])), x + 1.2, 0, z + .8, rand(-.4, .4));
    if (i % 3 === 0) place(K.beachChair(pick([PAL.teal, PAL.coral, PAL.sun])), x - 1.1, 0, z + 1, Math.PI / 2 + rand(-.5, .5));
    beachSpots.push([x + 1.2, z + .8]); i++;
  }

  /* ---------- pier ---------- */
  const PIER_Z = -6, PIER_LEN = 50, DECK = 2.1;
  Object.assign(A, { PIER_Z, PIER_LEN, DECK });
  place(K.pierDeck(PIER_LEN, 7), BWX, -.2, PIER_Z, Math.PI / 2);
  A.onPier = (s, side = 0, y = DECK) => V(BWX - s, y, PIER_Z + side);
  A.booth = A.onPier(30); put(K.jiggleBooth(), A.booth.x, DECK, A.booth.z, 0);
  put(K.shelly(), A.booth.x, DECK, A.booth.z - .5);
  put(K.baitShop(), A.onPier(44).x, DECK, PIER_Z - 1.2, 0);
  put(K.bench(), A.onPier(38).x, DECK, PIER_Z + 2.8, 0); put(K.bench(), A.onPier(22).x, DECK, PIER_Z - 2.8, Math.PI);

  /* ---------- water ---------- */
  put(K.dock(12), -24, -.15, 15);
  A.dockEnd = V(-29, 0, 15);
  for (const [x, c] of [[-20, PAL.lemon], [-23, PAL.pink], [-26, '#3a7aff']]) put(K.jetSki(c), x, -.1, 12.6, Math.PI / 2);
  A.brayJet = put(K.jetSki(PAL.lemon), -34, -.1, 22, .5); A.jetHome = A.brayJet.position.clone();
  A.psBoat = put(K.parasailBoat(), -32, -.1, 2, Math.PI * .5);
  A.moon = put(K.yacht(), -30, -.1, -30, .45);
  A.barge = put(K.fireworksBarge(), -36, -.2, -48, -.2);
  A.kay = put(K.kayak(), -36, -.05, 28, .7); A.kayHome = A.kay.position.clone();
  for (const [z, c] of [[24, PAL.red], [6, PAL.sun], [-16, PAL.red], [-38, PAL.sun]]) put(K.buoy(c), -26, 0, z);

  /* ---------- the Grand Flamingo ---------- */
  const RES = V(29, 0, -38); A.RES = RES;
  { const deck = new THREE.Group(); K.box(deck, 26, .5, 24, clay('#fbefe0', .8), 0, 0, 0, .2);
    for (let i = 0; i < 24; i++) K.box(deck, 3, .04, 3, clay('#fff8ee', .6), rand(-11, 11), .5, rand(-10, 10), .05).castShadow = false;
    place(deck, RES.x, 0, RES.z); }
  put(K.resortTower(), RES.x + 1, .5, RES.z - 8, 0, .95);
  A.poolP = V(RES.x - 1, .5, RES.z + 2); put(K.pool(12, 6.5), A.poolP.x, A.poolP.y, A.poolP.z);
  A.lagoonP = V(RES.x + 9, .5, RES.z + 5); put(K.gatorLagoon(), A.lagoonP.x, .5, A.lagoonP.z, -.2);
  A.tikiP = V(RES.x - 9, .5, RES.z + 8); put(K.tikiBar(), A.tikiP.x, .5, A.tikiP.z, .5);
  A.djP = V(RES.x - 3, .5, RES.z - 3); put(K.djBooth(), A.djP.x, .5, A.djP.z, 0);
  for (const [dx, dz, r] of [[-9, -2, -.6], [6, -2, .6], [5, 9, Math.PI]]) put(K.foamCannon(), RES.x + dx, .5, RES.z + dz, r);
  A.gateP = V(BWX + BWW / 2 + 1.2, BWY, -27); put(K.poolGate(), A.gateP.x, BWY, A.gateP.z, -Math.PI / 2 + .3);
  for (const [dx, dz] of [[-10, 3], [-7, 10], [9, -1]]) place(K.beachChair(PAL.white), RES.x + dx, .5, RES.z + dz, Math.PI / 2);
  for (let x = RES.x - 11; x < RES.x + 13; x += 2.6) place(K.bush(rand(.9, 1.2), pick([PAL.palm, PAL.palmDk, '#5fbe5a'])), x, .5, RES.z + 12.2);
  for (const x of [RES.x - 8, RES.x - 1, RES.x + 7]) occluders.push(put(K.palm(rand(7, 8.5), rand(.15, .3), rnd()), x, .5, RES.z + 11.5, rand(0, 6)));
  return A;
}

/* the ground height a walker stands on at (x, z): boardwalk deck, pier deck, pool deck, or sand */
export function groundAt(A, x, z) {
  if (Math.abs(z - A.PIER_Z) < 3.4 && x < A.BWX - A.BWW / 2 && x > A.BWX - A.PIER_LEN) return A.DECK;
  if (Math.abs(x - A.BWX) <= A.BWW / 2 + .2 && z > -52 && z < 32) return A.BWY;
  if (Math.abs(x - A.RES.x) < 13 && Math.abs(z - A.RES.z) < 12) return .5;
  return 0;
}

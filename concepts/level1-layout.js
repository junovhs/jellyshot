// Level 1 layout, frozen from the grey-box camera match (concepts/greybox.html) at the settings the person chose:
// an 80° vertical lens on the concept frame and a 13-wide boardwalk.
//
// Every ground spot is a pixel on docs/reference/level1-concept-v2-camera-target.webp (941 x 1672), cast through
// the reference camera onto the ground (y = 0). World: x to the right, z toward the perch (the camera looks down -z),
// one jelly is 1.1 tall. To move something, move its pixel; to move the far end (resort, marina) closer, change
// FAR_PULL below, which squeezes everything beyond the pier toward it.
import * as THREE from 'three';

export const IW = 941, IH = 1672, HORIZON = 355;
export const LENS = 80, BW = 13, FAR_CAP = 1600;
export const FAR_PULL = 1;   // 1 = as painted; .6 = the stretch past the pier is 60% as long

export const PX = {
  shore: [[0,1190],[60,1060],[150,965],[260,895],[360,835],[440,778],[500,725],[545,665],[580,615],[620,575],[655,535],[668,505],[655,482],[610,472],[560,470]],
  farCoast: [[500,405],[430,388],[300,372],[150,364],[0,360]],
  rail: [[385,1600],[470,1440],[545,1300],[600,1190],[640,1100],[668,1000],[690,900],[710,800],[728,700],[745,610],[758,540],[768,480]],
  palmsBeach: [[85,1400],[435,1405],[510,1265],[545,1055],[615,895],[660,775],[695,690],[722,640],[738,600],[752,570]],
  palmsShop: [[880,1520],[935,1050],[905,760],[860,600]],
  umbrellas: [[245,1500],[290,1225],[245,1130],[312,1045],[410,1000],[495,805],[555,785],[150,1300],[360,1250],[200,1050],[420,880],[600,700],[640,640]],
  towerRed: [330,940], towerYellow: [555,750],
  net: [[432,900],[535,903]], sandcastle: [450,1100], iceCreamCart: [380,1150],
  pier: [[685,600],[310,592]],
  yacht: [[155,530],[275,530]], barge: [[310,455],[375,455]], sails: [[480,440],[505,438],[530,432]], marina: [[520,470],[560,470]],
  resort: [[640,450],[755,450]], resortTop: 330, pool: [[620,470],[720,470]],
  jetDock: [[440,790],[350,770]], parasail: [180,660], kayak: [110,820],
  buoys: [[120,1000],[250,860],[380,740],[470,665]],
};

/* ---------- reference camera ---------- */
const rc = new THREE.PerspectiveCamera(LENS, IW / IH, .1, 20000);
const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
export const CAM = { fov: LENS, h: 1, pitch: 0 };
function setRef(h) {
  const f = (IH / 2) / Math.tan(LENS * Math.PI / 360);
  CAM.h = h; CAM.pitch = Math.atan((IH / 2 - HORIZON) / f);
  rc.position.set(0, h, 0); rc.rotation.set(-CAM.pitch, 0, 0); rc.updateProjectionMatrix(); rc.updateMatrixWorld();
}
function rawCast([x, y]) {
  ray.setFromCamera(new THREE.Vector2(x / IW * 2 - 1, -(y / IH * 2 - 1)), rc);
  const hit = ray.ray.intersectPlane(ground, new THREE.Vector3()) ?? rc.position.clone().addScaledVector(ray.ray.direction, FAR_CAP);
  const flat = Math.hypot(hit.x, hit.z); if (flat > FAR_CAP) hit.multiplyScalar(FAR_CAP / flat).setY(0);
  return hit;
}
setRef(1); setRef(BW / rawCast([600, 1170]).distanceTo(rawCast([800, 1170])));   // boardwalk is BW wide at row 1170
const PIER_Z = rawCast([600, 598]).z;
export function cast(p) {   // pixel -> world, with the far stretch squeezed by FAR_PULL
  const v = rawCast(p); if (v.z < PIER_Z && FAR_PULL !== 1) { const k = PIER_Z + (v.z - PIER_Z) * FAR_PULL, s = k / v.z; v.x *= s; v.z = k; }
  return v;
}
export function heightAt(base, topY) {   // height a vertical thing on `base` needs to reach pixel row topY in the painting
  const p = rawCast(base); let lo = 0, hi = 2000;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, s = new THREE.Vector3(p.x, m, p.z).project(rc); ((1 - s.y) / 2 * IH > topY) ? lo = m : hi = m; }
  return lo * (p.z < PIER_Z ? Math.max(FAR_PULL, .6) : 1);
}
export const PERCH = new THREE.Vector3(0, CAM.h, 0);

/* ---------- polylines ---------- */
export function extendNear(pts, z = 14) { const [a, b] = pts, d = a.clone().sub(b).normalize(); return [a.clone().addScaledVector(d, (z - a.z) / d.z), ...pts]; }
export function xAtZ(pts, z) {
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1];
    if ((z <= a.z && z >= b.z) || (z >= a.z && z <= b.z)) return a.x + (b.x - a.x) * ((z - a.z) / (b.z - a.z || 1)); }
  return pts[pts.length - 1].x;
}
export const offsetRight = (pts, w) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const d = b.clone().sub(a).normalize(); return p.clone().add(new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(w)); });
// direction of a polyline near z (unit, pointing away from the perch)
export function dirAtZ(pts, z) { for (let i = 0; i < pts.length - 1; i++) if (z <= pts[i].z && z >= pts[i + 1].z) return pts[i + 1].clone().sub(pts[i]).normalize(); return pts.at(-1).clone().sub(pts.at(-2)).normalize(); }

export const SHORE = extendNear(PX.shore.map(cast));
export const FAR_COAST = PX.farCoast.map(cast);
export const RAIL = extendNear(PX.rail.map(cast));
export const SHOP = offsetRight(RAIL, BW);
export const at = cast;

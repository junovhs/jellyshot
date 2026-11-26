/* =====================================================================
   INPUT — touch, mouse, keyboard. Firing is never gated on how long a
   click took: a press goes to requestFire(), which queues it if the
   rifle isn't ready yet.
   ===================================================================== */
import { initAudio, isMuted, setMuted } from "./audio";
import { TARGET_IDS, WORLD } from "./data";
import { bound, cycleAmmo, cycleZoom, liveScale, lowerScope, raiseScope, requestFire, selectAmmo, setZoom, startReload, surveyScale, toggleSurvey } from "./rules";
import { SAVE, persist } from "./save";
import { G, INPUT, VIEW } from "./state";
import { $, closeIntel, endMission, hudTick, openIntel, showBrief, startMission } from "./ui";
import { dist } from "./util";

const TAP_SLOP = 8;       // px a press may wander and still count as a click / tap
const PINCH_DOWN = .42;   // pinching out past this zoom drops into survey
const WHEEL_DOWN = 260;   // accumulated wheel-out at minimum zoom that lowers the rifle

interface Gesture { x: number; y: number; cx: number; cy: number; s: number; dist?: number; z?: number }
const pointers = new Map<number, { x: number; y: number }>();
let gesture: Gesture | null = null;
let press: { x: number; y: number; t: number; type: string; moved: number; multi: boolean } | null = null;
let wheelOut = 0;

const playing = () => G.started && !G.ended && !G.paused;

function startGesture(): void {
  const p = [...pointers.values()];
  if (p.length === 1) gesture = { x: p[0].x, y: p[0].y, cx: G.cam.x, cy: G.cam.y, s: liveScale() };
  else if (p.length >= 2) gesture = { dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, z: G.zoom, x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, cx: G.cam.x, cy: G.cam.y, s: liveScale() };
  else gesture = null;
}
/** Screen point → world point in the wide (survey) view. */
function surveyWorld(clientX: number, clientY: number, canvas: HTMLCanvasElement): { x: number; y: number } {
  const r = canvas.getBoundingClientRect(), So = surveyScale();
  return { x: G.cam.x + (clientX - r.left - VIEW.W / 2) / So, y: G.cam.y + (clientY - r.top - VIEW.H / 2) / So };
}

export function bindInput(canvas: HTMLCanvasElement, mini: HTMLCanvasElement): void {
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
    press = pointers.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType, moved: 0, multi: false } : press && { ...press, multi: true };
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (press) press.moved = Math.max(press.moved, dist(e.clientX, e.clientY, press.x, press.y));
    const p = [...pointers.values()];
    const sens = G.steady > .5 ? .55 : 1;
    if (p.length === 1) {
      G.cam.x = gesture.cx - (p[0].x - gesture.x) / gesture.s * sens;
      G.cam.y = gesture.cy - (p[0].y - gesture.y) / gesture.s * sens;
    } else if (gesture.dist && gesture.z != null) {
      const x = (p[0].x + p[1].x) / 2, y = (p[0].y + p[1].y) / 2;
      const ratio = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) / gesture.dist;
      if (G.survey) { if (ratio > 1.3) { raiseScope(); startGesture(); return; } }
      else if (gesture.z * ratio < PINCH_DOWN && G.zoom <= .5) { lowerScope(); startGesture(); return; }
      else setZoom(gesture.z * ratio);
      G.cam.x = gesture.cx - (x - gesture.x) / gesture.s; G.cam.y = gesture.cy - (y - gesture.y) / gesture.s;
    }
    bound();
  });
  const release = (e: PointerEvent, up: boolean) => {
    const pr = press;
    pointers.delete(e.pointerId); startGesture();
    if (pointers.size === 0) press = null;
    if (!up || !pr || pr.multi || pr.moved > TAP_SLOP || !playing()) return;
    if (G.survey) {
      // tap the wide view: bring the scope up right there
      if (pr.type === 'mouse' ? e.button === 0 : performance.now() - pr.t < 450) raiseScope(surveyWorld(e.clientX, e.clientY, canvas));
      return;
    }
    if (pr.type === 'mouse' && e.button === 0) requestFire();
  };
  canvas.addEventListener('pointerup', e => release(e, true));
  canvas.addEventListener('pointercancel', e => release(e, false));
  canvas.addEventListener('lostpointercapture', e => { pointers.delete(e.pointerId); startGesture(); });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (!playing()) return;
    if (G.survey) { if (e.deltaY < 0) { wheelOut = 0; raiseScope(); } return; }
    if (e.deltaY > 0 && G.zoom <= .5 + 1e-6) { wheelOut += e.deltaY; if (wheelOut > WHEEL_DOWN) { wheelOut = 0; lowerScope(); } return; }
    wheelOut = 0;
    setZoom(G.zoom * Math.exp(-e.deltaY * .0015));
  }, { passive: false });
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (playing()) toggleSurvey(); });

  const miniJump = (e: PointerEvent) => {
    const r = mini.getBoundingClientRect();
    G.cam.x = (e.clientX - r.left) / r.width * WORLD.w; G.cam.y = (e.clientY - r.top) / r.height * WORLD.h; bound();
  };
  mini.addEventListener('pointerdown', e => { e.preventDefault(); mini.setPointerCapture(e.pointerId); miniJump(e); });
  mini.addEventListener('pointermove', e => { if (mini.hasPointerCapture(e.pointerId)) miniJump(e); });

  const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyZ', 'ShiftLeft', 'ShiftRight', 'KeyR', 'KeyQ', 'KeyF', 'KeyE', 'Digit1', 'Digit2', 'Digit3']);
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' || e.code === 'Tab' || e.code === 'KeyI') { e.preventDefault(); if (!$('intel').hidden) closeIntel(); else openIntel(); return; }
    if (!playing()) { if (e.code === 'Enter' && !$('brief').hidden) startMission(); return; }
    if (!GAME_KEYS.has(e.code)) return;
    // in a mission the keyboard always drives the rifle, even if a HUD button has focus
    e.preventDefault(); INPUT.keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'Space') requestFire();
    if (e.code === 'KeyZ') cycleZoom();
    if (e.code === 'KeyR') startReload();
    if (e.code === 'KeyQ') cycleAmmo();
    if (e.code === 'KeyE') toggleSurvey();
    if (e.code === 'KeyF') G.ff = !G.ff;
    if (e.code === 'Digit1') selectAmmo('std');
    if (e.code === 'Digit2') selectAmmo('fizz');
    if (e.code === 'Digit3') selectAmmo('bomb');
  });
  window.addEventListener('keyup', e => { INPUT.keys.delete(e.code); if (e.code === 'Space' && playing()) e.preventDefault(); });
  window.addEventListener('blur', () => { INPUT.keys.clear(); pointers.clear(); gesture = null; press = null; INPUT.holdBreath = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing()) openIntel(); });

  // HUD buttons act on press, not release, and never steal keyboard focus
  const tapBtn = (id: string, fn: () => void) => {
    const b = $(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('pressed'); initAudio(); fn(); });
    b.addEventListener('pointerup', () => b.classList.remove('pressed'));
    b.addEventListener('pointerleave', () => b.classList.remove('pressed'));
    b.addEventListener('click', e => e.preventDefault());
  };
  tapBtn('fire', requestFire);
  tapBtn('zoom', cycleZoom);
  tapBtn('ammo', cycleAmmo);
  tapBtn('surveyBtn', toggleSurvey);
  tapBtn('ff', () => { G.ff = !G.ff; hudTick(); });
  tapBtn('intelBtn', openIntel);
  tapBtn('reloadBtn', startReload);
  tapBtn('sound', () => { setMuted(!isMuted()); $('sound').classList.toggle('off', isMuted()); });
  const br = $('breath');
  br.addEventListener('pointerdown', e => { e.preventDefault(); br.setPointerCapture(e.pointerId); INPUT.holdBreath = true; br.classList.add('pressed'); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) br.addEventListener(t, () => { INPUT.holdBreath = false; br.classList.remove('pressed'); });
  $('start').addEventListener('click', startMission);
  $('again').addEventListener('click', startMission);
  $('menu').addEventListener('click', showBrief);
  $('resume').addEventListener('click', closeIntel);
  $('restart').addEventListener('click', () => { $('intel').hidden = true; startMission(); });
  $('abort').addEventListener('click', () => {
    $('intel').hidden = true; G.paused = false;
    for (const id of TARGET_IDS) { const n = G.byId[id]; if (n.alive) { n.alive = false; n.escaped = true; } }
    endMission();
  });
  $('extract').addEventListener('click', () => endMission());
  $('showCh').addEventListener('click', () => $('chwrap').classList.toggle('open'));
  $('proToggle').addEventListener('click', () => { SAVE.pro = !SAVE.pro; persist(); showBrief(); });
  document.querySelectorAll<HTMLButtonElement>('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll<HTMLElement>('.tabpane').forEach(p => { p.hidden = p.id !== b.dataset.tab; });
  }));
}

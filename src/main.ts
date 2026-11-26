/* =====================================================================
   JELLYSHOT — boot, frame loop, resize.
   ===================================================================== */
import "./style.css";
import { WORLD } from "./data";
import { setCtx } from "./draw";
import { bindInput } from "./input";
import { makeProps } from "./props";
import { drawMini, render, scopeGeom } from "./render";
import { setMissionOver, update, updateParticles } from "./rules";
import { G, VIEW } from "./state";
import { $, endMission, setOnResume, setOnStart, showBrief, tickToast } from "./ui";
import { clamp } from "./util";
import { buildDecor } from "./world";

const canvas = $<HTMLCanvasElement>('world');
const ctx = canvas.getContext('2d', { alpha: false });
const mini = $<HTMLCanvasElement>('minimap'), mg = mini.getContext('2d');
if (!ctx || !mg) throw new Error('2D canvas unavailable');
setCtx(ctx);

function resize(): void {
  const r = canvas.getBoundingClientRect();
  VIEW.W = r.width; VIEW.H = r.height; VIEW.D = Math.min(devicePixelRatio || 1, 2.5);
  canvas.width = Math.max(1, Math.round(VIEW.W * VIEW.D)); canvas.height = Math.max(1, Math.round(VIEW.H * VIEW.D));
  VIEW.base = clamp(Math.min(VIEW.W, VIEW.H) / 420, .8, 1.6);
  const md = Math.min(2, devicePixelRatio || 1), mw = VIEW.W < 500 ? 112 : 150, mh = Math.round(mw * WORLD.h / WORLD.w);
  mini.style.width = mw + 'px'; mini.style.height = mh + 'px';
  mini.width = mw * md; mini.height = mh * md;
  const sg = scopeGeom();
  document.documentElement.style.setProperty('--scopeBottom', Math.round(sg.cy + sg.R) + 'px');
}

let last = 0, miniT = 0;
function step(now: number): void {
  const raw = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
  if (G.started && !G.paused && !G.ended) {
    let dt = raw;
    if (G.hitstop > 0) { G.hitstop -= raw; dt = 0; }
    if (G.slow > 0) { G.slow -= raw; dt *= .3; }
    update(dt * (G.ff ? 3 : 1), raw);
    miniT -= raw; if (miniT <= 0 && mg) { miniT = .1; drawMini(mini, mg); }
  } else if (G.started && G.ended) { G.clock += raw * .3; updateParticles(raw * .3); }
  render();
  tickToast(raw);
  requestAnimationFrame(step);
}

setMissionOver(endMission);
setOnStart(() => { (document.activeElement as HTMLElement | null)?.blur?.(); canvas.focus({ preventScroll: true }); resize(); });
setOnResume(() => { last = 0; canvas.focus({ preventScroll: true }); });
bindInput(canvas, mini);
buildDecor();
G.props = makeProps();
new ResizeObserver(resize).observe(canvas);
resize();
showBrief();
requestAnimationFrame(step);

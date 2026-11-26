/* Canvas drawing primitives. `g` is the live 2D context everything draws into;
   swap it with withCtx() to draw a sprite into another canvas (portraits). */
import { TAU } from "./util";

export let g: CanvasRenderingContext2D = null as unknown as CanvasRenderingContext2D;
export function setCtx(ctx: CanvasRenderingContext2D): void { g = ctx; }
export function withCtx(ctx: CanvasRenderingContext2D, fn: () => void): void {
  const old = g; g = ctx;
  try { fn(); } finally { g = old; }
}

type Fill = string | CanvasGradient;

export function ell(x: number, y: number, rx: number, ry: number, c: Fill): void { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); g.fillStyle = c; g.fill(); }
export function circ(x: number, y: number, r: number, c: Fill): void { ell(x, y, r, r, c); }
export function ln(x: number, y: number, a: number, b: number, c: Fill, w = 1): void { g.beginPath(); g.moveTo(x, y); g.lineTo(a, b); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); }
export function rrect(x: number, y: number, w: number, h: number, r: number, c: Fill): void { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = c; g.fill(); }
export function ringS(x: number, y: number, r: number, c: Fill, w = 1): void { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); g.strokeStyle = c; g.lineWidth = w; g.stroke(); }
export function ellS(x: number, y: number, rx: number, ry: number, c: Fill, w = 1): void { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); g.strokeStyle = c; g.lineWidth = w; g.stroke(); }
export function txt(t: string, x: number, y: number, s: number, c: Fill, align: CanvasTextAlign = 'center', weight = 900): void {
  g.font = `${weight} ${s}px ui-rounded, "Avenir Next", system-ui, sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = c; g.fillText(t, x, y);
}
export function poly(pts: number[], c: Fill): void {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath(); g.fillStyle = c; g.fill();
}

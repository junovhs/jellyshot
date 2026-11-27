/* =====================================================================
   RENDER — the world, the scope, and the naked-eye view around it.

   Like looking down a real rifle scope with both eyes open, the frame is
   never black: the glass shows the magnified world, and around it you see
   the same scene un-magnified, out of focus and in the tube's shadow, with
   sunlight leaking past the rim. Lowering the rifle (survey) pulls focus
   to that wide view so you can scan the whole festival.
   ===================================================================== */
import { TARGET_IDS, TARGET_INFO, WATER, WORLD } from "./data";
import { circ, ell, ellS, g, ln, poly, ringS, txt, withCtx } from "./draw";
import { drawBubble, drawNPC } from "./npc";
import { scale, surveyScale, sway } from "./rules";
import { G, REDUCE, VIEW } from "./state";
import { TAU, clamp, rand, smooth } from "./util";
import { DECOR, drawGround, drawOverhead } from "./world";

const BG = '#1b1228';
const BROKEN = ['smashed', 'broken', 'blown', 'down', 'fallen', 'crashed', 'deflated', 'gone', 'collapse', 'boom'];

/** Where the glass sits. Fills the short side of the screen with a small margin, like a real scope. */
export function scopeGeom(): { cx: number; cy: number; R: number } {
  const { W, H } = VIEW;
  if (W < H) return { cx: W / 2, cy: H * .47, R: Math.min(W * .47, H * .36) };
  return { cx: W / 2, cy: H * .52, R: Math.min(H * .455, W * .47) };
}

/* ---------- one pass over the world ---------- */
interface Pass { S: number; camX: number; camY: number; halfW: number; halfH: number; detail: boolean; quiet?: boolean }
function drawWorld({ S, camX, camY, halfW, halfH, detail, quiet }: Pass): void {
  const V = G.view = { x0: camX - halfW / S - 40, x1: camX + halfW / S + 40, y0: camY - halfH / S - 40, y1: camY + halfH / S + 140 };
  const inV = (x: number, y: number) => x > V.x0 - 80 && x < V.x1 + 80 && y > V.y0 - 40 && y < V.y1 + 140;
  drawGround(detail);
  const list: { y: number; draw(): void }[] = [];
  for (const d of DECOR.sorted) list.push(d);
  for (const p of G.props) if (!p.ground) list.push(p);
  for (const n of G.npcs) if (n.alive && !n.inBalloon && inV(n.x, n.y)) list.push({ y: n.y, draw: () => drawNPC(n) });
  list.sort((a, b) => a.y - b.y);
  for (const o of list) o.draw();
  // particles
  for (const p of G.parts) {
    g.globalAlpha = clamp(p.life * 2.5, 0, 1);
    if (p.type === 'blob') { circ(p.x, p.y, p.r, p.c); circ(p.x - p.r * .3, p.y - p.r * .3, p.r * .3, p.hl || '#fff'); }
    else if (p.type === 'puff' || p.type === 'spark') circ(p.x, p.y, p.r, p.c);
    else if (p.type === 'ring') circ(p.x, p.y, p.r * p.life * 3, p.c);
    else if (p.type === 'ripple') ellS(p.x, p.y, 30 * (1 - p.life) + 4, 12 * (1 - p.life) + 2, '#ffffff', 2);
    else if (p.type === 'balloon') { g.globalAlpha = 1; ln(p.x, p.y + 8, p.x + Math.sin(p.life * 4) * 3, p.y + 22, '#ffffff99', 1); ell(p.x, p.y, 7, 8.5, p.c); }
  }
  g.globalAlpha = 1;
  drawOverhead();
  for (const p of G.props) p.drawSky?.();
  if (detail) {
    // sparkles on discovered opportunities
    for (const p of G.props) if (p.opp && G.disc.has(p.opp) && p.dx != null && p.dy != null && !BROKEN.includes(p.state ?? '')) {
      g.globalAlpha = .6 + Math.sin(G.clock * 4 + p.dx) * .4;
      txt('✦', p.dx + 18 / S, p.dy - (p.id === 'balloon' ? p.h ?? 0 : 0) - 14 / S, 14 / S, '#ffd36b');
      g.globalAlpha = 1;
    }
    for (const m of G.marks) { g.globalAlpha = clamp(m.life, 0, 1) * .7; circ(m.x, m.y, 3 / S, '#50334f'); g.globalAlpha = 1; }
    // speech bubbles & floaters at constant screen size
    // the wide view only carries the chatter that matters: targets and anyone freaking out
    const loud = (n: typeof G.npcs[number]) => !quiet || n.kind === 'target' || ['panic', 'mourn', 'guard', 'flee', 'bees'].includes(n.react?.type ?? '');
    for (const n of G.npcs) if (n.bubble && n.alive && inV(n.x, n.y) && loud(n)) drawBubble(n, S);
    for (const f of G.floaters) {
      g.globalAlpha = clamp(f.life * 2, 0, 1);
      g.font = `950 ${17 * f.s / S}px ui-rounded, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.strokeStyle = '#813c82'; g.lineWidth = 4 / S; g.strokeText(f.t, f.x, f.y); g.fillStyle = f.c; g.fillText(f.t, f.x, f.y);
    }
    g.globalAlpha = 1;
  }
  if (G.lockdown) { g.fillStyle = `rgba(255,60,100,${.06 + Math.sin(G.clock * 5) * .03})`; g.fillRect(V.x0 - 100, V.y0 - 100, V.x1 - V.x0 + 200, V.y1 - V.y0 + 200); }
}

/* ---------- out-of-focus buffer: render tiny, stretch big = cheap blur that works on iOS ---------- */
const BLUR_DIV = 7;
let blurCv: HTMLCanvasElement | null = null, blurCtx: CanvasRenderingContext2D | null = null;
function blurBuffer(W: number, H: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (!blurCv) { blurCv = document.createElement('canvas'); blurCtx = blurCv.getContext('2d', { alpha: false }); }
  if (!blurCtx) return null;
  const bw = Math.max(8, Math.ceil(W / BLUR_DIV)), bh = Math.max(8, Math.ceil(H / BLUR_DIV));
  if (blurCv.width !== bw || blurCv.height !== bh) { blurCv.width = bw; blurCv.height = bh; }
  return [blurCv, blurCtx];
}

/* ---------- frame ---------- */
export function render(): void {
  const { W, H, D } = VIEW;
  if (!W || !H) return;
  g.setTransform(D, 0, 0, D, 0, 0);
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  if (!G.started) return;
  const { cx, cy, R } = scopeGeom();
  const L = smooth(G.lower), S = scale(), So = surveyScale();
  const [sx, sy] = sway();
  const shx = G.shake ? rand(-G.shake, G.shake) : 0, shy = G.shake ? rand(-G.shake, G.shake) : 0;

  // 1 · the naked-eye world, centred on where the rifle points
  const wide = (detail: boolean) => () => {
    g.save();
    g.translate(W / 2 + shx * .4, H / 2 + shy * .4); g.scale(So, So); g.translate(-G.cam.x, -G.cam.y);
    drawWorld({ S: So, camX: G.cam.x, camY: G.cam.y, halfW: W / 2, halfH: H / 2, detail, quiet: true });
    g.restore();
  };
  if (L > 0) wide(true)();
  if (L < 1) {
    const buf = blurBuffer(W, H);
    if (buf) {
      const [bc, bx] = buf;
      bx.setTransform(bc.width / W, 0, 0, bc.height / H, 0, 0);
      bx.fillStyle = BG; bx.fillRect(0, 0, W, H);
      withCtx(bx, wide(false));
      g.globalAlpha = 1 - L; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(bc, 0, 0, W, H);
      g.globalAlpha = 1;
    }
  }
  peripheryLight(cx, cy, R, L);
  if (L > .02) surveyOverlay(R, S, So, L);

  // 2 · the glass. It drops out of view as the rifle lowers.
  if (L < .999) {
    const drop = L * (H - cy + R * 1.4), gy = cy + drop;
    g.save();
    g.globalAlpha = 1 - smooth((L - .55) / .45);
    tubeShadow(cx, gy, R);
    g.save();
    g.beginPath(); g.arc(cx, gy, R, 0, TAU); g.clip();
    g.fillStyle = BG; g.fillRect(cx - R, gy - R, R * 2, R * 2);
    const camX = G.cam.x + sx / S, camY = G.cam.y + sy / S;
    g.translate(cx + shx, gy + shy - G.recoil * .5); g.scale(S, S); g.translate(-camX, -camY);
    drawWorld({ S, camX, camY, halfW: R, halfH: R, detail: true });
    g.restore();
    glassEffects(cx, gy, R, sx, sy);
    if (L < .3) reticle(cx, gy, R);
    tube(cx, gy, R);
    g.restore();
  }
}

/* ---------- around the scope ---------- */
function peripheryLight(cx: number, cy: number, R: number, L: number): void {
  const { W, H } = VIEW, k = 1 - L;
  // the scope tube and your own head shade everything near the eye
  if (k > 0) {
    g.fillStyle = `rgba(27,18,40,${.5 * k})`; g.fillRect(0, 0, W, H);
    const v = g.createRadialGradient(cx, cy, R * 1.05, cx, cy, Math.hypot(W, H) * .62);
    v.addColorStop(0, 'rgba(20,12,30,0)'); v.addColorStop(1, `rgba(14,8,22,${.55 * k})`);
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  // afternoon sun from the top-left: a warm leak washing across the out-of-focus world
  g.save(); g.globalCompositeOperation = 'screen';
  const sun = g.createRadialGradient(W * .04, -H * .08, 0, W * .04, -H * .08, Math.max(W, H) * .78);
  sun.addColorStop(0, `rgba(255,214,168,${.34 * k + .08})`); sun.addColorStop(.45, `rgba(255,170,190,${.1 * k + .02})`); sun.addColorStop(1, 'rgba(255,170,190,0)');
  g.fillStyle = sun; g.fillRect(0, 0, W, H);
  g.restore();
  if (L > 0) { // a gentle vignette keeps the wide view readable under the HUD
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.hypot(W, H) * .6);
    v.addColorStop(0, 'rgba(20,12,30,0)'); v.addColorStop(1, `rgba(20,12,30,${.45 * L})`);
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
}

/** Survey mode: where the scope will come up, and arrows to targets off-screen. */
function surveyOverlay(R: number, S: number, So: number, L: number): void {
  const { W, H } = VIEW, cx = W / 2, cy = H / 2, r = R / S * So;
  g.save(); g.globalAlpha = L;
  g.setLineDash([7, 6]); ringS(cx, cy, r, '#fff0cbcc', 2); g.setLineDash([]);
  ringS(cx, cy, r + 1.5, '#1b122855', 1);
  ln(cx - 9, cy, cx + 9, cy, '#fff0cb', 1.6); ln(cx, cy - 9, cx, cy + 9, '#fff0cb', 1.6);
  if (G.reloading > 0) {
    const k = 1 - G.reloading / G.rifle.reload;
    g.beginPath(); g.arc(cx, cy, r + 9, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.strokeStyle = '#ffe066'; g.lineWidth = 4; g.lineCap = 'round'; g.stroke();
    txt('RELOADING', cx, cy + r + 24, 11, '#ffe066');
  }
  // target markers off the edge of the screen
  const pad = 26;
  for (const id of TARGET_IDS) {
    const n = G.byId[id]; if (!n?.alive) continue;
    const ny = n.inBalloon ? 262 - (G.props.find(p => p.id === 'balloon')?.h ?? 0) : n.y - n.r;
    const px = cx + (n.x - G.cam.x) * So, py = cy + (ny - G.cam.y) * So;
    if (px > pad && px < W - pad && py > pad && py < H - pad) continue;
    const a = Math.atan2(py - cy, px - cx);
    const t = Math.min((W / 2 - pad) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - pad) / Math.abs(Math.sin(a) || 1e-6));
    edgeArrow(cx + Math.cos(a) * t, cy + Math.sin(a) * t, a, id, n.react?.type === 'flee');
  }
  g.restore();
}
function edgeArrow(x: number, y: number, a: number, id: typeof TARGET_IDS[number], fleeing: boolean): void {
  g.save(); g.translate(x, y); g.rotate(a);
  g.globalAlpha *= .85 + Math.sin(G.clock * 6) * .15;
  poly([8, 0, -6, -7, -3, 0, -6, 7], fleeing ? '#ffb84c' : '#ff2d63');
  g.restore();
  txt(TARGET_INFO[id].short[0], x - Math.cos(a) * 16, y - Math.sin(a) * 16, 9, '#ffd0dc');
}

/* ---------- the scope itself ---------- */
function tubeShadow(cx: number, cy: number, R: number): void {
  const T = R * .09;
  const sh = g.createRadialGradient(cx, cy, R + T * .6, cx, cy, R + T + R * .32);
  sh.addColorStop(0, 'rgba(12,6,20,.62)'); sh.addColorStop(1, 'rgba(12,6,20,0)');
  g.beginPath(); g.arc(cx, cy, R + T + R * .32, 0, TAU); g.arc(cx, cy, R, 0, TAU, true);
  g.fillStyle = sh; g.fill();
}

/** Lens effects inside the glass: eye-relief shadow that slides with sway, fringe, and a leak of sun. */
function glassEffects(cx: number, cy: number, R: number, sx: number, sy: number): void {
  g.save();
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  // your eye is never perfectly centred: the dark crescent drifts opposite the sway
  const ox = cx - sx * 1.6, oy = cy - sy * 1.6;
  const tight = G.steady * .08;
  const ed = g.createRadialGradient(ox, oy, R * (.74 + tight), ox, oy, R * 1.06);
  ed.addColorStop(0, 'rgba(18,8,28,0)'); ed.addColorStop(.7, `rgba(18,8,28,${.34 + G.steady * .2})`); ed.addColorStop(1, 'rgba(10,4,16,.92)');
  g.fillStyle = ed; g.fillRect(cx - R, cy - R, R * 2, R * 2);
  // sunlight sneaking in past the rim, top-left, breathing with your aim
  g.globalCompositeOperation = 'screen';
  const lx = cx - R * .78 + sx * 2.2, ly = cy - R * .72 + sy * 2.2;
  const leak = g.createRadialGradient(lx, ly, 0, lx, ly, R * .62);
  leak.addColorStop(0, 'rgba(255,222,180,.34)'); leak.addColorStop(.5, 'rgba(255,150,190,.12)'); leak.addColorStop(1, 'rgba(255,150,190,0)');
  g.fillStyle = leak; g.fillRect(cx - R, cy - R, R * 2, R * 2);
  // faint glare arc on the glass
  g.beginPath(); g.arc(cx, cy, R * .9, Math.PI * 1.08, Math.PI * 1.32);
  g.strokeStyle = 'rgba(255,240,230,.08)'; g.lineWidth = R * .05; g.lineCap = 'round'; g.stroke();
  g.globalCompositeOperation = 'source-over';
  if (G.flash > 0) { g.fillStyle = `rgba(255,242,210,${G.flash * (REDUCE ? .06 : .18)})`; g.fillRect(cx - R, cy - R, R * 2, R * 2); }
  g.restore();
  // chromatic fringe right at the edge of the glass
  ringS(cx, cy, R - 1.5, 'rgba(255,77,138,.55)', 3);
  ringS(cx, cy, R - 5, 'rgba(127,217,255,.14)', 2);
}

/** The candy-lacquered tube around the glass, with a zoom drum on the left. */
function tube(cx: number, cy: number, R: number): void {
  const T = R * .09, gold = G.rifle.golden;
  const body = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  if (gold) { body.addColorStop(0, '#ffe8a0'); body.addColorStop(.35, '#c88a2a'); body.addColorStop(.7, '#6b4512'); body.addColorStop(1, '#3a250a'); }
  else { body.addColorStop(0, '#6a3f80'); body.addColorStop(.3, '#3a2350'); body.addColorStop(.75, '#1d1129'); body.addColorStop(1, '#120a1b'); }
  // zoom drum first, so the tube overlaps it
  drum(cx - R - T * .6, cy, R, T, gold);
  g.beginPath(); g.arc(cx, cy, R + T, 0, TAU); g.arc(cx, cy, R, 0, TAU, true);
  g.fillStyle = body; g.fill();
  // lacquer highlights and machined lips
  g.beginPath(); g.arc(cx, cy, R + T * .55, Math.PI * 1.05, Math.PI * 1.45);
  g.strokeStyle = gold ? 'rgba(255,250,220,.55)' : 'rgba(255,159,212,.38)'; g.lineWidth = T * .32; g.lineCap = 'round'; g.stroke();
  g.beginPath(); g.arc(cx, cy, R + T * .5, Math.PI * .1, Math.PI * .35);
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = T * .2; g.stroke();
  ringS(cx, cy, R + T, 'rgba(0,0,0,.45)', 1.5);
  ringS(cx, cy, R + .5, '#0d0714', 2.5);
}
function drum(x: number, cy: number, R: number, T: number, gold: boolean): void {
  const w = R * .14, h = R * .64, x0 = x - w;
  if (x < -2) return; // off-screen on narrow phones
  g.save();
  g.beginPath(); g.roundRect(x0, cy - h / 2, w + T, h, w * .3);
  const sh = g.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  sh.addColorStop(0, gold ? '#5a3a0c' : '#140b1d'); sh.addColorStop(.5, gold ? '#d9a443' : '#3b2450'); sh.addColorStop(1, gold ? '#5a3a0c' : '#140b1d');
  g.fillStyle = sh; g.fill(); g.clip();
  // knurling
  for (let k = 0; k < 14; k++) { const yy = cy - h / 2 + (k + .5) * h / 14; ln(x0 + 2, yy, x0 + w * .3, yy, 'rgba(0,0,0,.35)', 1.5); }
  // zoom numbers roll past as you zoom
  const sp = h * .34, mid = (G.zoom - .5) / Math.max(.5, G.rifle.maxZoom - .5) * 2 + 1;
  for (let v = 1; v <= 3; v++) {
    const yy = cy + (mid - v) * sp, a = clamp(1 - Math.abs(yy - cy) / (h * .55), 0, 1);
    g.globalAlpha = a; txt(String(v), x0 + w * .62, yy, R * .085, gold ? '#fff3c4' : '#ff9fd4');
    g.globalAlpha = a * .7; circ(x0 + w * .62, yy + sp / 2, R * .008 + 1, gold ? '#fff3c4' : '#ff9fd4');
  }
  g.globalAlpha = 1;
  poly([x0 + w + 1, cy, x0 + w - 5, cy - 4, x0 + w - 5, cy + 4], gold ? '#fff3c4' : '#ff79c1');
  g.restore();
}

function reticle(cx: number, cy: number, R: number): void {
  const a = G.aim;
  let ink = '#39274399';
  if (a?.what === 'npc') ink = a.n.kind === 'target' ? '#ff2d63' : a.n.kind === 'guard' ? '#3a5bd9' : '#a2457a';
  else if (a?.what === 'prop' || a?.what === 'item') ink = '#d98a00';
  ln(cx - R + 10, cy, cx - 14, cy, ink, 1.2); ln(cx + 14, cy, cx + R - 10, cy, ink, 1.2);
  ln(cx, cy - R + 10, cx, cy - 14, ink, 1.2); ln(cx, cy + 14, cx, cy + R - 10, ink, 1.2);
  ln(cx - R + 10, cy, cx - R * .55, cy, ink, 3.5); ln(cx + R * .55, cy, cx + R - 10, cy, ink, 3.5); ln(cx, cy + R * .55, cx, cy + R - 10, ink, 3.5);
  for (let j = -4; j <= 4; j++) if (j) { const d = j * R * .12; ln(cx + d, cy - 3, cx + d, cy + 3, ink, 1); ln(cx - 3, cy + d, cx + 3, cy + d, ink, 1); }
  ringS(cx, cy, 10, ink, 1.2); circ(cx, cy, 1.8, ink);
  if (a?.what === 'npc' && a.head) ringS(cx, cy, 5, ink, 1.4);
  // breath & reload arcs
  g.beginPath(); g.arc(cx, cy, R - 10, Math.PI * .62, Math.PI * .62 + Math.PI * .26 * G.breath);
  g.strokeStyle = G.breathLock ? '#ff4d6d' : '#c1f6ffaa'; g.lineWidth = 4; g.lineCap = 'round'; g.stroke();
  if (G.reloading > 0) {
    const k = 1 - G.reloading / G.rifle.reload;
    g.beginPath(); g.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.strokeStyle = '#ffe066'; g.lineWidth = 3; g.stroke();
    txt('RELOADING', cx, cy + 36, 10, '#ffe066');
  }
  // hit marker
  if (G.hitmark > 0) {
    const k = G.hitmark, d1 = 14 + (1 - k) * 8, d2 = d1 + 10;
    g.globalAlpha = Math.min(1, k * 2);
    for (const [ux, uy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) ln(cx + ux * d1, cy + uy * d1, cx + ux * d2, cy + uy * d2, G.hitmarkC, 3);
    g.globalAlpha = 1;
  }
  // edge arrows toward targets outside the glass
  const S = scale(), [sx0, sy0] = sway();
  for (const id of TARGET_IDS) {
    const n = G.byId[id]; if (!n?.alive) continue;
    const ny = n.inBalloon ? 262 - (G.props.find(p => p.id === 'balloon')?.h ?? 0) : n.y - n.r;
    const dx = (n.x - G.cam.x) * S - sx0, dy = (ny - G.cam.y) * S - sy0;
    if (Math.hypot(dx, dy) < R - 12) continue;
    const an = Math.atan2(dy, dx);
    edgeArrow(cx + Math.cos(an) * (R - 16), cy + Math.sin(an) * (R - 16), an, id, n.react?.type === 'flee');
  }
}

/* ---------- minimap ---------- */
export function drawMini(mini: HTMLCanvasElement, mg: CanvasRenderingContext2D): void {
  const w = mini.width, h = mini.height, k = w / WORLD.w;
  mg.setTransform(1, 0, 0, 1, 0, 0);
  mg.clearRect(0, 0, w, h);
  mg.fillStyle = '#2bb5c8cc'; mg.fillRect(0, 0, w, h); mg.fillStyle = '#f3d6a0'; mg.beginPath(); mg.roundRect(3, 3, w - 6, h - 6, 10); mg.fill();
  mg.scale(k, k);
  mg.fillStyle = '#dcb488'; mg.beginPath(); mg.ellipse(1000, 648, 298, 180, 0, 0, TAU); mg.fill();
  mg.fillStyle = '#2fc4a8'; mg.fillRect(826, 222, 348, 100);
  for (const wt of WATER) { mg.fillStyle = wt.id === 'choc' ? '#7a4630' : '#2bb5c8'; mg.beginPath(); mg.ellipse(wt.x, wt.y, wt.rx, wt.ry, 0, 0, TAU); mg.fill(); }
  for (const p of G.puddles) if (p.found && !p.concealed) { mg.fillStyle = '#ff4d6d'; mg.beginPath(); mg.arc(p.x, p.y, 24, 0, TAU); mg.fill(); }
  for (const n of G.npcs) {
    if (!n.alive) continue;
    const big = n.kind === 'target';
    mg.fillStyle = big ? '#ff2d63' : n.kind === 'guard' ? '#3a4fae' : '#ffffffcc';
    mg.beginPath(); mg.arc(n.x, n.inBalloon ? 280 : n.y, big ? 34 : n.kind === 'guard' ? 18 : 12, 0, TAU); mg.fill();
    if (big) { mg.strokeStyle = '#fff'; mg.lineWidth = 8; mg.stroke(); }
  }
  mg.strokeStyle = '#50334f'; mg.lineWidth = 10; mg.beginPath();
  if (G.survey) { const So = surveyScale(); mg.rect(G.cam.x - VIEW.W / 2 / So, G.cam.y - VIEW.H / 2 / So, VIEW.W / So, VIEW.H / So); }
  else mg.arc(G.cam.x, G.cam.y, scopeGeom().R / scale(), 0, TAU);
  mg.stroke();
  mg.strokeStyle = '#fff'; mg.lineWidth = 4; mg.stroke();
}

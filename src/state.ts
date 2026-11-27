/* =====================================================================
   Shared game state and the shapes everything else agrees on.
   ===================================================================== */
import { rifleFor, type Hat, type HotKey, type ItemKind, type LineKey, type OppId, type PalKey, type Rifle } from "./data";
import type { Ellipse, Pt } from "./util";

/* ---------- people ---------- */
export type Kind = 'target' | 'guard' | 'civ' | 'kid' | 'portrait';
/** The targets' signature outfits, drawn over the body. */
export type Look = 'crypto' | 'influencer' | 'tycoon';
export type Dyn<T> = T | (() => T);

export interface Step {
  t: number;
  act: string;
  label: Dyn<string>;
  at?: Dyn<Pt>;
  hot?: HotKey | Ellipse;
  lines?: Dyn<LineKey>;
  follow?: string;
  off?: Pt;
  patrol?: Pt[];
  circle?: boolean;
  exit?: boolean;
  item?: ItemKind;
}

export type ReactType = 'investigate' | 'panic' | 'mourn' | 'guard' | 'argue' | 'sad' | 'look' | 'cower' | 'dazed'
  | 'chase' | 'lost' | 'bees' | 'flee' | 'fall';

export interface Reaction {
  type: ReactType;
  time: number;
  at: number;
  x?: number; y?: number;
  ox?: number; oy?: number;
  g?: Pt | null;
  who?: string;
  p?: Puddle;
  balloon?: boolean;
}

export interface Bubble { t: string; life: number; max: number }

export interface NPC {
  id: string; kind: Kind; name: string; role: string;
  col: PalKey; r: number; hat?: Hat; look?: Look;
  item?: ItemKind; carry?: ItemKind; lines?: LineKey;
  speed: number; plan: Step[];
  protects?: string; partner?: string; parent?: string; kids?: string[];
  alive: boolean; escaped?: boolean; gone?: boolean;
  x: number; y: number; vx: number; vy: number; face: number; phase: number;
  react: Reaction | null;
  stepI: number; step: Step | null; wander: Pt | null; pause: number; pauseLen?: number; pi: number;
  acting: string; moving: number; startled: number; hopNow?: number;
  sayT: number; bubble: Bubble | null; replyT: number; replyPool?: 'couple' | 'chat';
  hasCone: boolean; balloons: number; inBalloon: boolean;
  dying: number; sink?: number; fallCause?: string;
  kb: { vx: number; vy: number; t: number } | null; kbx?: number; kby?: number;
  lostFor?: string | null; lostG?: Pt | null; circG?: Pt; ring?: number;
  pose?: 'kneel' | null; poseT?: number;
  noticeT?: number; warn?: number;
}

/* ---------- the aftermath ---------- */
export interface Puddle {
  x: number; y: number; c: PalKey; r: number; angle: number; age: number; victim: string; t: number;
  concealed: boolean; where: 'water' | 'bush' | null; accident: boolean; found: boolean; secured?: boolean;
  seenBy: Set<string>; hat?: Hat; eyes: boolean; susp?: number;
  drops: { x: number; y: number; r: number }[];
}

export interface Particle {
  type: 'blob' | 'ring' | 'puff' | 'spark' | 'ripple' | 'balloon';
  x: number; y: number; vx: number; vy: number; r: number; c: string; hl?: string; life: number; g: number;
}

export interface KillInfo { cause?: string; accident?: boolean; head?: boolean; moving?: boolean; concealed?: boolean; ev?: number }

/* ---------- props: every shootable opportunity ---------- */
export type Ammo = 'std' | 'fizz' | 'bomb';
export interface PropHit { kind: string; precise?: boolean; d?: { x: number; y: number; alive: boolean; fly: number } }
export type ShotResult = 'prop' | 'lure' | void;

export interface Prop {
  id: string; opp?: OppId; ground?: boolean;
  x: number; y: number; state?: string; h?: number;
  dx?: number; dy?: number; dr?: number;
  hit?(px: number, py: number): PropHit | null;
  shot?(hit: PropHit, ammo: Ammo): ShotResult;
  update?(dt: number): void;
  draw(): void;
  drawSky?(): void;
  show?(): void;
}

/* ---------- aim ---------- */
export type Aim =
  | { what: 'npc'; n: NPC; head: boolean }
  | { what: 'item'; kind: 'cone' | 'banjo' | 'bunch' | 'bobber'; n: NPC; i?: number }
  | { what: 'prop'; p: Prop; h: PropHit };

export interface Job { text: string; test(n: NPC, info: KillInfo, p: Puddle): boolean; done: boolean }
export interface Shot { x: number; y: number; t: number; ammo: Ammo }
export interface Floater { x: number; y: number; t: string; c: string; s: number; life: number }

export interface KillRecord { id: string; kind: Kind; cause: string; accident: boolean; head: boolean; concealed: boolean; t: number }
export interface Stats {
  kills: KillRecord[]; found: number; ducks: number; gnomes: number; concealed: number; heads: number;
  accidents: number; collateral: number; guards: number; escaped: number; fizzDunk: boolean;
}

export const freshStats = (): Stats => ({ kills: [], found: 0, ducks: 0, gnomes: 0, concealed: 0, heads: 0, accidents: 0, collateral: 0, guards: 0, escaped: 0, fizzDunk: false });

export interface Flags {
  cakeDown?: boolean; cakeEarly?: boolean; ovenBoom?: boolean; dockGone?: boolean; maypoleDown?: boolean;
  balloonGone?: boolean; shedGone?: boolean; meetBench?: boolean; chocFlood?: boolean; gateBlocked?: boolean;
  banjoBroken?: boolean; fishCaught?: boolean; proposing?: boolean;
}

function freshGame() {
  return {
    /** festival time (seconds since gates opened) */
    T: 0,
    /** animation clock: advances with sim time, keeps ticking slowly on the results screen */
    clock: 0,
    flags: {} as Flags,
    npcs: [] as NPC[], byId: {} as Record<string, NPC>, props: [] as Prop[],
    puddles: [] as Puddle[], parts: [] as Particle[], floaters: [] as Floater[],
    marks: [] as { x: number; y: number; life: number }[], pending: [] as Shot[],
    stats: freshStats(), score: 0, susp: 0, calmT: 0, lockdown: false,
    ended: true, started: false, paused: false,
    view: { x0: 0, y0: 0, x1: 0, y1: 0 },
    cam: { x: 1000, y: 560 }, zoom: 1, ammo: 'std' as Ammo, mag: 4, reloading: 0,
    breath: 1, breathLock: false, steady: 0, kick: 0, shake: 0, recoil: 0, flash: 0, beatT: 0,
    hitmark: 0, hitmarkC: '#fff',
    ff: false, slow: 0, hitstop: 0, phaseI: -1, eventId: 0, evKills: {} as Record<number, string[]>,
    aim: null as Aim | null, aimT: 0, aimKey: null as string | null,
    run: { done: new Set<string>() }, disc: new Set<OppId>(), combo: 0, lastKill: -9,
    rifle: rifleFor(1) as Rifle, special: { fizz: 0, bomb: 0 },
    handlerQ: [] as string[], handlerT: 0, quietT: 0, cues: new Set<string>(),
    jobs: [] as Job[], pro: false, shots: 0, hits: 0,
    /** real-time (ms) of the last shot, so slow-mo never stretches the cooldown */
    lastShotAt: -1e9,
    /** real-time (ms) a fire press is waiting to go off; 0 = none. Presses are never dropped. */
    fireQueuedAt: 0,
    /** survey: rifle lowered for the naked-eye overview. `lower` animates 0 (scoped) → 1 (lowered). */
    survey: false, surveyByReload: false, lower: 0,
  };
}
export type Game = ReturnType<typeof freshGame>;
export const G: Game = freshGame();
export function resetGame(over: Partial<Game>): void { Object.assign(G, freshGame(), over); }

/* ---------- screen / input ---------- */
export const VIEW = { W: 0, H: 0, D: 1, base: 1 };
export const INPUT = { keys: new Set<string>(), holdBreath: false };
export const REDUCE = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

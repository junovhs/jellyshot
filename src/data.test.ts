/* The contract data is hand-written and cross-referenced by id all over the
   game. These schemas catch a typo'd palette key or a dangling partner id
   before it turns into a silent runtime `undefined`. */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CAST_CIVS, CAST_GUARDS, CHALLENGES, LINES, OPP_IDS, PAL_KEYS, PHASES, TARGET_IDS, TARGET_INFO, UNLOCKS, rifleFor, xpForLevel } from "./data";
import { makeProps } from "./props";

const civIds = CAST_CIVS.map(c => c.id);
const allIds = [...TARGET_IDS, ...civIds, ...CAST_GUARDS.map(g => g.id)];
const ref = (ids: readonly string[]) => z.string().refine(v => ids.includes(v), 'unknown id');
const pt = z.tuple([z.number(), z.number()]);

const CivSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  col: z.enum(PAL_KEYS as [string, ...string[]]),
  lines: z.enum(Object.keys(LINES) as [string, ...string[]]).optional(),
  partner: ref(allIds).optional(),
  parent: ref(civIds).optional(),
  who: ref(allIds).optional(),
  at: pt.optional(),
  off: pt.optional(),
});
const GuardSchema = z.object({ id: z.string(), follow: z.enum(TARGET_IDS).optional(), patrol: z.array(pt).min(2).optional() })
  .refine(g => !!g.follow !== !!g.patrol, 'a guard either follows a target or walks a patrol');

describe('contract data', () => {
  it('every civilian references real palette keys, lines and people', () => {
    for (const c of CAST_CIVS) expect(CivSchema.safeParse(c).error?.issues ?? [], c.id).toEqual([]);
  });
  it('every guard has exactly one job', () => {
    for (const g of CAST_GUARDS) expect(GuardSchema.safeParse(g).success, g.id).toBe(true);
  });
  it('ids are unique across the whole cast', () => {
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(new Set(CHALLENGES.map(c => c.id)).size).toBe(CHALLENGES.length);
  });
  it('sweethearts point at each other', () => {
    for (const c of CAST_CIVS) if (c.partner) expect(CAST_CIVS.find(o => o.id === c.partner)?.partner, c.id).toBe(c.id);
  });
  it('phases run in order and every target has one schedule line per phase', () => {
    expect(PHASES.map(p => p.t)).toEqual([...PHASES.map(p => p.t)].sort((a, b) => a - b));
    for (const id of TARGET_IDS) expect(TARGET_INFO[id].sched).toHaveLength(PHASES.length);
  });
  it('every opportunity prop points at a known opportunity', () => {
    for (const p of makeProps()) if (p.opp) expect(OPP_IDS).toContain(p.opp);
  });
  it('progression only ever gets better', () => {
    for (let l = 1; l < 12; l++) {
      expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
      const a = rifleFor(l), b = rifleFor(l + 1);
      expect(b.maxZoom).toBeGreaterThanOrEqual(a.maxZoom);
      expect(b.mag).toBeGreaterThanOrEqual(a.mag);
      expect(b.reload).toBeLessThanOrEqual(a.reload);
    }
    expect(UNLOCKS.map(u => u.lvl)).toEqual([...UNLOCKS.map(u => u.lvl)].sort((a, b) => a - b));
  });
});

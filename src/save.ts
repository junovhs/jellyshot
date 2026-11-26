/* Persistent progression. localStorage is untrusted input (old versions, hand
   edits, other tabs), so it is parsed through a zod schema and falls back
   field-by-field to defaults instead of crashing or poisoning the run. */
import * as z from "zod/mini";
import { CHALLENGES, xpForLevel } from "./data";

const SAVE_KEY = 'jellyshot.save.v1';

// zod/mini keeps the runtime cost to a few KB in the shipped bundle
const count = () => z.catch(z.int().check(z.nonnegative()), 0);
export const SaveSchema = z.object({
  xp: count(),
  done: z.pipe(z.catch(z.array(z.string()), []), z.transform((ids: string[]) => [...new Set(ids)].filter(id => CHALLENGES.some(c => c.id === id)))),
  best: z.catch(z.number().check(z.nonnegative()), 0),
  runs: count(),
  wins: count(),
  pro: z.catch(z.optional(z.boolean()), undefined),
});
export type Save = z.infer<typeof SaveSchema>;

export function parseSave(raw: unknown): Save {
  const r = SaveSchema.safeParse(raw && typeof raw === 'object' ? raw : {});
  return r.success ? r.data : SaveSchema.parse({});
}

function load(): Save {
  try { return parseSave(JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')); } catch { return parseSave({}); }
}
export const SAVE: Save = typeof localStorage === 'undefined' ? parseSave({}) : load();
export function persist(): void { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch { /* private mode */ } }

export const levelOf = (xp: number): number => { let l = 1; while (xp >= xpForLevel(l + 1)) l++; return l; };
export const multOf = (): number => Math.min(3, 1 + SAVE.done.length * .08);

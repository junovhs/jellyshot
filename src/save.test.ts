import { describe, expect, it } from "vitest";
import { levelOf, parseSave } from "./save";

describe('save file', () => {
  it('falls back to a fresh save for garbage', () => {
    for (const raw of [null, 42, 'hi', [], { xp: 'lots' }]) expect(parseSave(raw).xp).toBe(0);
  });
  it('keeps good fields when others are corrupt', () => {
    const s = parseSave({ xp: 12000, best: -5, runs: 3.5, done: 'nope', pro: true });
    expect(s).toMatchObject({ xp: 12000, best: 0, runs: 0, done: [], pro: true });
  });
  it('drops unknown and duplicate challenge ids', () => {
    expect(parseSave({ done: ['cake', 'cake', 'not-a-challenge', 'ghost'] }).done).toEqual(['cake', 'ghost']);
  });
  it('levels follow the XP curve', () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(4999)).toBe(1);
    expect(levelOf(5000)).toBe(2);
    expect(levelOf(15000)).toBe(3);
  });
});

import { describe, it, expect } from 'vitest';
import {
  validateParts,
  packGuillotine,
  type Board,
  type Part,
} from '../src/core/format';

describe('validateParts', () => {
  const board: Board = { L: 200, W: 100, kerf: 2, hasGrain: false };

  it('returns ok:true when parts fit within board', () => {
    const parts: Part[] = [{ w: 50, h: 80, name: 'A' }];
    const res = validateParts(board, parts);
    expect(res.ok).toBe(true);
    expect(res.sheets).toBe(1);
  });

  it('returns ok:false when any part exceeds board dimensions', () => {
    const parts: Part[] = [{ w: 120, h: 110, name: 'B' }];
    const res = validateParts(board, parts);
    expect(res.ok).toBe(false);
  });
});

describe('packGuillotine', () => {
  it('keeps item on same sheet when it exactly fills a free rectangle', () => {
    const board: Board = { L: 100, W: 100, kerf: 0, hasGrain: false };
    const parts: Part[] = [
      { w: 100, h: 50, name: 'A' },
      { w: 100, h: 50, name: 'B' },
    ];
    const sheets = packGuillotine(board, parts);
    // pierwsza karta jest pusta, druga powinna zawierać obie formatki
    expect(sheets.length).toBe(2);
    expect(sheets[1].placed).toHaveLength(2);
    expect(sheets[1].placed[0]).toMatchObject({ x: 0, y: 0, _w: 100, _h: 50 });
    expect(sheets[1].placed[1]).toMatchObject({ x: 0, y: 50, _w: 100, _h: 50 });
  });
});

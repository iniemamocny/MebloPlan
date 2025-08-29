import { describe, it, expect } from 'vitest';
import { validateParts, type Board, type Part } from '../src/core/format';

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

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

describe('validateParts with grain awareness', () => {
  const board: Board = { L: 200, W: 100, kerf: 2, hasGrain: true };

  it('rejects rotation when requireGrain is true', () => {
    const parts: Part[] = [{ w: 120, h: 90, name: 'G', requireGrain: true }];
    const res = validateParts(board, parts);
    expect(res.ok).toBe(false);
  });

  it('accepts part with requireGrain when it fits without rotation', () => {
    const parts: Part[] = [{ w: 90, h: 180, name: 'H', requireGrain: true }];
    const res = validateParts(board, parts);
    expect(res.ok).toBe(true);
  });

  it('allows rotation when requireGrain is false', () => {
    const parts: Part[] = [{ w: 120, h: 90, name: 'I' }];
    const res = validateParts(board, parts);
    expect(res.ok).toBe(true);
  });
});

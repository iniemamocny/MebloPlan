import { describe, it, expect } from 'vitest';
import { validateParts, packGuillotine, type Board, type Part } from '../src/core/format';

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

  it('avoids rotating grain-required parts on boards with grain', () => {
    const board: Board = { L: 100, W: 100, kerf: 0, hasGrain: true };
    const parts: Part[] = [
      { w: 60, h: 40, name: 'A', requireGrain: true },
      { w: 40, h: 30, name: 'B', requireGrain: true },
    ];
    const sheets = packGuillotine(board, parts);
    expect(sheets.length).toBe(2);
    const placed = sheets[1].placed;
    expect(placed).toHaveLength(2);
    const pA = placed.find(p => p.name === 'A');
    const pB = placed.find(p => p.name === 'B');
    expect(pA).toMatchObject({ x: 0, y: 0, _w: 60, _h: 40 });
    expect(pB).toMatchObject({ x: 60, y: 0, _w: 40, _h: 30 });
  });

  it('marks sheet as overflow when part does not fit any sheet', () => {
    const board: Board = { L: 100, W: 100, kerf: 0, hasGrain: true };
    const parts: Part[] = [{ w: 200, h: 150, name: 'X', requireGrain: true }];
    const sheets = packGuillotine(board, parts);
    const overflowSheet = sheets.find(s => s.overflow);
    expect(overflowSheet).toBeDefined();
    expect(overflowSheet?.placed).toHaveLength(0);
  });
});

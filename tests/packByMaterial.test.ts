import { describe, it, expect } from 'vitest';
import { packByMaterial, type Board, type Part } from '../src/core/format';

describe('packByMaterial', () => {
  it('groups parts by material and packs each group separately', () => {
    const board: Board = { L: 100, W: 100, kerf: 0, hasGrain: false };
    const items: (Part & { material?: string })[] = [
      { w: 100, h: 100, name: 'a', material: 'MDF' },
      { w: 100, h: 100, name: 'b', material: 'MDF' },
      { w: 100, h: 100, name: 'c', material: 'Plywood' },
      { w: 50, h: 100, name: 'd' },
      { w: 50, h: 100, name: 'e' },
    ];

    const result = packByMaterial(board, items);

    expect(result).toHaveLength(3);
    const mdf = result.find((r) => r.material === 'MDF');
    const ply = result.find((r) => r.material === 'Plywood');
    const none = result.find((r) => r.material === 'Materiał: brak');

    // packGuillotine always includes an initial empty sheet
    expect(mdf?.sheets).toHaveLength(3);
    expect(ply?.sheets).toHaveLength(2);
    expect(none?.sheets).toHaveLength(2);

    expect(mdf?.sheets).not.toBe(ply?.sheets);
    expect(mdf?.sheets).not.toBe(none?.sheets);
    expect(ply?.sheets).not.toBe(none?.sheets);
  });
});

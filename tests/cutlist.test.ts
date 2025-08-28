import { describe, it, expect } from 'vitest';
import { aggregateCutlist, type CutItem } from '../src/core/cutlist';

describe('aggregateCutlist', () => {
  it('aggregates items regardless of rotation', () => {
    const items: CutItem[] = [
      { moduleId: 'm1', moduleLabel: 'M1', material: 'Mat', part: 'Panel', qty: 1, w: 100, h: 50 },
      { moduleId: 'm1', moduleLabel: 'M1', material: 'Mat', part: 'Panel', qty: 2, w: 50, h: 100 },
    ];
    const result = aggregateCutlist(items);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ material: 'Mat', part: 'Panel', w: 50, h: 100, qty: 3 });
  });
});

import { describe, it, expect } from 'vitest';
import {
  aggregateCutlist,
  aggregateEdgebanding,
  type CutItem,
  type EdgeItem,
} from '../src/core/cutlist';

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

  it('groups by material and part and sums quantities', () => {
    const items: CutItem[] = [
      { moduleId: 'm1', moduleLabel: 'M1', material: 'Mat1', part: 'Panel', qty: 2, w: 100, h: 50 },
      { moduleId: 'm2', moduleLabel: 'M2', material: 'Mat1', part: 'Panel', qty: 3, w: 50, h: 100 },
      { moduleId: 'm3', moduleLabel: 'M3', material: 'Mat1', part: 'Drzwi', qty: 1, w: 100, h: 50 },
      { moduleId: 'm4', moduleLabel: 'M4', material: 'Mat2', part: 'Panel', qty: 1, w: 100, h: 50 },
    ];
    const result = aggregateCutlist(items);
    expect(result).toHaveLength(3);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ material: 'Mat1', part: 'Panel', w: 50, h: 100, qty: 5 }),
        expect.objectContaining({ material: 'Mat1', part: 'Drzwi', w: 50, h: 100, qty: 1 }),
        expect.objectContaining({ material: 'Mat2', part: 'Panel', w: 50, h: 100, qty: 1 }),
      ])
    );
  });
});

describe('aggregateEdgebanding', () => {
  it('sums lengths for the same material and rounds totals', () => {
    const edges: EdgeItem[] = [
      { material: 'ABS 1mm', length: 100.4, part: 'A' },
      { material: 'ABS 1mm', length: 100.4, part: 'B' },
      { material: 'ABS 2mm', length: 50.2, part: 'C' },
      { material: 'ABS 2mm', length: 25.7, part: 'D' },
    ];
    const result = aggregateEdgebanding(edges);
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ material: 'ABS 1mm', length: 201 }),
        expect.objectContaining({ material: 'ABS 2mm', length: 76 }),
      ]),
    );
  });
});

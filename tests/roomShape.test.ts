import { describe, it, expect, vi } from 'vitest';
import { addSegmentToShape } from '../src/utils/roomShape';
import type { RoomShape } from '../src/types';

vi.mock('../src/utils/uuid', () => ({
  default: () => 'test-uuid',
  uuid: () => 'test-uuid',
}));

describe('addSegmentToShape', () => {
  it('avoids storing duplicate points when segments share endpoints', () => {
    let shape: RoomShape = { points: [], segments: [] };
    shape = addSegmentToShape(shape, { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } });
    shape = addSegmentToShape(shape, { start: { x: 1, y: 0 }, end: { x: 1, y: 1 } });
    shape = addSegmentToShape(shape, { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } });

    expect(shape.points.length).toBe(3);
    const coords = shape.points.map((p) => `${p.x},${p.y}`);
    expect(new Set(coords).size).toBe(3);
    const ids = shape.points.map((p) => p.id);
    expect(ids.every((id) => typeof id === 'string')).toBe(true);
  });

  it('rejects segments that intersect existing ones', () => {
    let shape: RoomShape = { points: [], segments: [] };
    shape = addSegmentToShape(shape, { start: { x: 0, y: 0 }, end: { x: 2, y: 0 } });
    const result = addSegmentToShape(shape, {
      start: { x: 1, y: -1 },
      end: { x: 1, y: 1 },
    });

    expect(result).toBe(shape);
    expect(shape.segments.length).toBe(1);
  });

  it('allows segments that only meet at endpoints', () => {
    let shape: RoomShape = { points: [], segments: [] };
    shape = addSegmentToShape(shape, { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } });
    const result = addSegmentToShape(shape, {
      start: { x: 1, y: 0 },
      end: { x: 1, y: 1 },
    });

    expect(result.segments.length).toBe(2);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addSegmentToShape } from '../src/utils/roomShape';
import { usePlannerStore } from '../src/state/store';
import type { ShapePoint } from '../src/types';

// Mock uuid to keep deterministic ids if needed
vi.mock('../src/utils/uuid', () => ({
  default: () => 'test-uuid',
  uuid: () => 'test-uuid',
}));

// helper that simulates pointer clicks when drawing walls
const createClickSimulator = () => {
  let start: ShapePoint | null = null;
  return (point: ShapePoint) => {
    if (!start) {
      start = point;
      return;
    }
    const shape = usePlannerStore.getState().roomShape;
    const newShape = addSegmentToShape(shape, { start, end: point });
    if (newShape) {
      usePlannerStore.getState().setRoomShape(newShape);
    }
    start = point;
  };
};

describe('wall drawing', () => {
  beforeEach(() => {
    usePlannerStore.setState({ roomShape: { points: [], segments: [] } });
  });

  it('adds segments without duplicating points on successive clicks', () => {
    const click = createClickSimulator();
    click({ x: 0, y: 0 });
    click({ x: 1, y: 0 });
    click({ x: 1, y: 1 });
    click({ x: 0, y: 0 });
    const shape = usePlannerStore.getState().roomShape;
    expect(shape.segments.length).toBe(3);
    expect(shape.points.length).toBe(3);
    const coords = shape.points.map((p) => `${p.x},${p.y}`);
    expect(new Set(coords).size).toBe(3);
  });

  it('rejects segments that intersect existing ones', () => {
    const click = createClickSimulator();
    click({ x: 0, y: 0 });
    click({ x: 2, y: 0 });
    click({ x: 1, y: -1 });
    click({ x: 1, y: 1 });
    const shape = usePlannerStore.getState().roomShape;
    expect(shape.segments.length).toBe(2);
  });
});

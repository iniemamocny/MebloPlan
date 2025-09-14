import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addSegmentToShape } from '../src/utils/roomShape';
import { worldToPlanner } from '../src/utils/coordinateSystem';
import { usePlannerStore } from '../src/state/store';
import type { ShapePoint } from '../src/types';

// Mock uuid to keep deterministic ids
vi.mock('../src/utils/uuid', () => ({
  default: () => 'test-uuid',
  uuid: () => 'test-uuid',
}));

// Simulates clicking in world coordinates when drawing walls
const createWorldClickSimulator = () => {
  let start: ShapePoint | null = null;
  return (x: number, z: number) => {
    const point: ShapePoint = {
      x: worldToPlanner(x, 'x'),
      y: worldToPlanner(z, 'z'),
    };
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

describe('wall placement from world coordinates', () => {
  beforeEach(() => {
    usePlannerStore.setState({ roomShape: { points: [], segments: [] } });
  });

  it('converts world coords to planner coords when storing points', () => {
    const click = createWorldClickSimulator();
    click(0, 0); // start
    click(1, 0); // first segment along X
    click(1, 1); // second segment with Z -> planner Y inversion
    const shape = usePlannerStore.getState().roomShape;
    const coords = shape.points.map(({ x, y }) => ({ x, y }));
    expect(coords).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: -1 },
    ]);
  });
});


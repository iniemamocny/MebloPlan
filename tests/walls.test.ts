import { describe, it, beforeEach, expect } from 'vitest';
import { getWallSegments } from '../src/utils/walls';
import { usePlannerStore } from '../src/state/store';

beforeEach(() => {
  usePlannerStore.setState({
    room: { walls: [], openings: [], height: 2700, origin: { x: 0, y: 0 } },
  });
});

describe('getWallSegments', () => {
  it('uses room origin when no start provided', () => {
    usePlannerStore.setState({
      room: {
        walls: [{ length: 1000, angle: 0, thickness: 100 }],
        openings: [],
        height: 2700,
        origin: { x: 1000, y: 2000 },
      },
    });
    const segs = getWallSegments();
    expect(segs[0].a.x).toBe(1000);
    expect(segs[0].a.y).toBe(2000);
  });

  it('accepts custom starting point', () => {
    usePlannerStore.setState({
      room: {
        walls: [{ length: 1000, angle: 0, thickness: 100 }],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
    });
    const segs = getWallSegments(50, 60);
    expect(segs[0].a.x).toBe(50);
    expect(segs[0].a.y).toBe(60);
  });

  it('adds closing segment when requested', () => {
    usePlannerStore.setState({
      room: {
        walls: [
          { length: 1000, angle: 0, thickness: 100 },
          { length: 1000, angle: 90, thickness: 100 },
          { length: 1000, angle: 180, thickness: 100 },
        ],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
    });
    const segs = getWallSegments(undefined, undefined, true);
    expect(segs.length).toBe(4);
    const last = segs[3];
    expect(last.b.x).toBeCloseTo(segs[0].a.x, 3);
    expect(last.b.y).toBeCloseTo(segs[0].a.y, 3);
  });
});

describe('updateWall', () => {
  it('updates thickness for selected wall', () => {
    usePlannerStore.setState({
      room: {
        walls: [
          { length: 1000, angle: 0, thickness: 100 },
          { length: 1000, angle: 90, thickness: 100 },
        ],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
    });
    const store = usePlannerStore.getState();
    store.updateWall(1, { thickness: 80 });
    const walls = usePlannerStore.getState().room.walls;
    expect(walls[1].thickness).toBe(80);
    expect(walls[0].thickness).toBe(100);
  });
});

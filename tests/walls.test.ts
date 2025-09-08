import { describe, it, beforeEach, expect } from 'vitest';
import {
  getWallSegments,
  getAreaAndPerimeter,
  Segment,
  projectPointToSegment,
} from '../src/utils/walls';
import { usePlannerStore, wallRanges } from '../src/state/store';
import WallDrawer from '../src/viewer/WallDrawer';
import * as THREE from 'three';
import { webcrypto } from 'node:crypto';

if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto as any;
}

beforeEach(() => {
  usePlannerStore.setState({
    room: { walls: [], openings: [], height: 2700, origin: { x: 0, y: 0 } },
  });
});

describe('getWallSegments', () => {
  it('uses room origin when no start provided', () => {
    usePlannerStore.setState({
      room: {
        walls: [{ id: 'a', length: 1000, angle: 0, thickness: 100 }],
        openings: [],
        height: 2700,
        origin: { x: 1000, y: 2000 },
      },
    });
    const segs = getWallSegments(usePlannerStore.getState().room);
    expect(segs[0].a.x).toBe(1000);
    expect(segs[0].a.y).toBe(2000);
  });

  it('accepts custom starting point', () => {
    usePlannerStore.setState({
      room: {
        walls: [{ id: 'a', length: 1000, angle: 0, thickness: 100 }],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
    });
    const segs = getWallSegments(usePlannerStore.getState().room, 50, 60);
    expect(segs[0].a.x).toBe(50);
    expect(segs[0].a.y).toBe(60);
  });

  it('adds closing segment when requested', () => {
    usePlannerStore.setState({
      room: {
        walls: [
          { id: 'a', length: 1000, angle: 0, thickness: 100 },
          { id: 'b', length: 1000, angle: 90, thickness: 100 },
          { id: 'c', length: 1000, angle: 180, thickness: 100 },
        ],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
    });
    const segs = getWallSegments(usePlannerStore.getState().room, undefined, undefined, true);
    expect(segs.length).toBe(4);
    const last = segs[3];
    expect(last.b.x).toBeCloseTo(segs[0].a.x, 3);
    expect(last.b.y).toBeCloseTo(segs[0].a.y, 3);
  });

  it('skips closing segment for negligible gap', () => {
    usePlannerStore.setState({
      room: {
        walls: [
          { id: 'a', length: 10, angle: 0, thickness: 100 },
          { id: 'b', length: 10, angle: 120, thickness: 100 },
          { id: 'c', length: 10, angle: 240, thickness: 100 },
        ],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
    });
    const segs = getWallSegments(usePlannerStore.getState().room, undefined, undefined, true);
    expect(segs.length).toBe(3);
    const last = segs[2];
    expect(last.b.x).toBeCloseTo(segs[0].a.x, 3);
    expect(last.b.y).toBeCloseTo(segs[0].a.y, 3);
  });

  it('handles arc segments', () => {
    usePlannerStore.setState({
      room: { walls: [], openings: [], height: 2700, origin: { x: 0, y: 0 } },
    });
    const store = usePlannerStore.getState();
    store.addWall({
      length: Math.PI * 1000 * 0.5,
      angle: 0,
      thickness: 100,
      arc: { radius: 1000, angle: 90 },
    });
    const segs = getWallSegments(usePlannerStore.getState().room);
    expect(segs[0].arc?.radius).toBe(1000);
    expect(segs[0].b.x).toBeCloseTo(1000, 3);
    expect(segs[0].b.y).toBeCloseTo(1000, 3);
  });
});

describe('getAreaAndPerimeter', () => {
  it('computes area and perimeter for square', () => {
    const segs: Segment[] = [
      { a: { x: 0, y: 0 }, b: { x: 10, y: 0 }, angle: 0, length: 10 },
      { a: { x: 10, y: 0 }, b: { x: 10, y: 10 }, angle: Math.PI / 2, length: 10 },
      { a: { x: 10, y: 10 }, b: { x: 0, y: 10 }, angle: Math.PI, length: 10 },
      { a: { x: 0, y: 10 }, b: { x: 0, y: 0 }, angle: -Math.PI / 2, length: 10 },
    ];
    const { area, perimeter } = getAreaAndPerimeter(segs);
    expect(area).toBeCloseTo(100, 3);
    expect(perimeter).toBeCloseTo(40, 3);
  });

  it('computes area for room with curved wall', () => {
    const room = {
      walls: [
        { id: 'a', angle: 90, thickness: 100, arc: { radius: 1, angle: -180 } },
        { id: 'b', angle: 180, thickness: 100, length: 2 },
      ],
      openings: [],
      height: 2700,
      origin: { x: -1, y: 0 },
    } as any;
    const segs = getWallSegments(room);
    const { area, perimeter } = getAreaAndPerimeter(segs);
    expect(area).toBeCloseTo(Math.PI / 4, 3);
    expect(perimeter).toBeCloseTo(Math.PI + 2, 3);
  });

  it('computes area for quarter-circle sector', () => {
    const room = {
      walls: [
        { id: 'a', length: 1, angle: 0, thickness: 100 },
        { id: 'b', angle: 90, thickness: 100, arc: { radius: 1, angle: 90 } },
        { id: 'c', length: 1, angle: -90, thickness: 100 },
      ],
      openings: [],
      height: 2700,
      origin: { x: 0, y: 0 },
    } as any;
    const segs = getWallSegments(room);
    const { area, perimeter } = getAreaAndPerimeter(segs);
    expect(area).toBeCloseTo((Math.PI + 2) / 8, 3);
    expect(perimeter).toBeCloseTo(Math.PI / 2 + 2, 3);
  });
});

describe('projectPointToSegment', () => {
  const seg: Segment = {
    a: { x: 1, y: 0 },
    b: { x: 0, y: 1 },
    angle: 0,
    length: Math.PI / 2,
    arc: { cx: 0, cy: 0, radius: 1, startAngle: 0, sweep: Math.PI / 2 },
  };

  it('projects point near middle of arc', () => {
    const res = projectPointToSegment(0.7, 0.7, seg);
    expect(res.x).toBeCloseTo(Math.SQRT1_2, 3);
    expect(res.y).toBeCloseTo(Math.SQRT1_2, 3);
    expect(res.t).toBeCloseTo(0.5, 3);
    const expected = Math.hypot(0.7 - Math.SQRT1_2, 0.7 - Math.SQRT1_2);
    expect(res.dist).toBeCloseTo(expected, 3);
  });

  it('clamps point outside arc sweep', () => {
    const res = projectPointToSegment(1.2, 0, seg);
    expect(res.x).toBeCloseTo(1, 3);
    expect(res.y).toBeCloseTo(0, 3);
    expect(res.t).toBeCloseTo(0, 3);
    expect(res.dist).toBeCloseTo(0.2, 3);
  });
});

describe('updateWall', () => {
  it('updates thickness for selected wall', () => {
    usePlannerStore.setState({
      room: {
        walls: [
          { id: 'a', length: 1000, angle: 0, thickness: 100 },
          { id: 'b', length: 1000, angle: 90, thickness: 100 },
        ],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
    });
    const store = usePlannerStore.getState();
    store.updateWall('b', { thickness: 80 });
    const walls = usePlannerStore.getState().room.walls;
    expect(walls[1].thickness).toBe(80);
    expect(walls[0].thickness).toBe(100);
  });

  it('rejects non-positive values', () => {
    usePlannerStore.setState({
      room: {
        walls: [{ id: 'a', length: 1000, angle: 0, thickness: 100 }],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
    });
    const store = usePlannerStore.getState();
    expect(() => store.updateWall('a', { length: 0 })).toThrow();
    expect(() => store.updateWall('a', { thickness: -5 })).toThrow();
    const wall = usePlannerStore.getState().room.walls[0];
    expect(wall.length).toBe(1000);
    expect(wall.thickness).toBe(100);
  });

  it('clamps and normalizes wall values', () => {
    usePlannerStore.setState({
      wallType: 'dzialowa',
      room: {
        walls: [{ id: 'a', length: 1000, angle: 0, thickness: 100 }],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
    });
    const store = usePlannerStore.getState();
    store.updateWall('a', { length: 500, thickness: 200, angle: 450 });
    const { max } = wallRanges['dzialowa'];
    const wall = usePlannerStore.getState().room.walls[0];
    expect(wall.length).toBe(max);
    expect(wall.thickness).toBe(max);
    expect(wall.angle).toBe(90);
  });

  it('updates arc radius and angle', () => {
    usePlannerStore.setState({
      room: { walls: [], openings: [], height: 2700, origin: { x: 0, y: 0 } },
    });
    const store = usePlannerStore.getState();
    const id = store.addWall({
      length: Math.PI * 1000 * 0.5,
      angle: 0,
      thickness: 100,
      arc: { radius: 1000, angle: 90 },
    });
    store.updateWall(id, { arc: { radius: 500 } });
    let wall = usePlannerStore.getState().room.walls[0];
    expect(wall.arc?.radius).toBe(500);
    expect(wall.arc?.angle).toBe(90);
    store.updateWall(id, { arc: { angle: 450 } });
    wall = usePlannerStore.getState().room.walls[0];
    expect(wall.arc?.angle).toBe(90);
  });

  it('recalculates length when arc radius changes', () => {
    usePlannerStore.setState({
      room: { walls: [], openings: [], height: 2700, origin: { x: 0, y: 0 } },
    });
    const store = usePlannerStore.getState();
    const id = store.addWall({
      length: Math.PI * 1000 * 0.5,
      angle: 0,
      thickness: 100,
      arc: { radius: 1000, angle: 90 },
    });
    store.updateWall(id, { arc: { radius: 500 } });
    const wall = usePlannerStore.getState().room.walls[0];
    expect(wall.length).toBeCloseTo(
      Math.abs(500 * THREE.MathUtils.degToRad(90)),
      3,
    );
  });

  it('recalculates length when arc angle changes', () => {
    usePlannerStore.setState({
      room: { walls: [], openings: [], height: 2700, origin: { x: 0, y: 0 } },
    });
    const store = usePlannerStore.getState();
    const id = store.addWall({
      length: Math.PI * 1000 * 0.5,
      angle: 0,
      thickness: 100,
      arc: { radius: 1000, angle: 90 },
    });
    store.updateWall(id, { arc: { angle: 180 } });
    const wall = usePlannerStore.getState().room.walls[0];
    expect(wall.length).toBeCloseTo(
      Math.abs(1000 * THREE.MathUtils.degToRad(180)),
      3,
    );
  });

  it('rejects invalid arc parameters', () => {
    usePlannerStore.setState({
      room: { walls: [], openings: [], height: 2700, origin: { x: 0, y: 0 } },
    });
    const store = usePlannerStore.getState();
    const id = store.addWall({
      length: Math.PI * 1000 * 0.5,
      angle: 0,
      thickness: 100,
      arc: { radius: 1000, angle: 90 },
    });
    expect(() => store.updateWall(id, { arc: { radius: -5 } })).toThrow();
    expect(() => store.updateWall(id, { arc: { angle: 0 } })).toThrow();
    const wall = usePlannerStore.getState().room.walls[0];
    expect(wall.arc?.radius).toBe(1000);
    expect(wall.arc?.angle).toBe(90);
  });
});

describe('addWall', () => {
  it('rejects non-positive values', () => {
    const store = usePlannerStore.getState();
    expect(() =>
      store.addWall({ length: 0, angle: 0, thickness: 100 }),
    ).toThrow();
    expect(() =>
      store.addWall({ length: 100, angle: 0, thickness: -5 }),
    ).toThrow();
    expect(usePlannerStore.getState().room.walls).toHaveLength(0);
  });

  it('clamps and normalizes wall values', () => {
    const store = usePlannerStore.getState();
    store.addWall({ length: 500, angle: 450, thickness: 200 });
    const { max } = wallRanges['dzialowa'];
    const wall = usePlannerStore.getState().room.walls[0];
    expect(wall.length).toBe(max);
    expect(wall.thickness).toBe(max);
    expect(wall.angle).toBe(90);
  });

  it('rejects invalid arc parameters', () => {
    const store = usePlannerStore.getState();
    expect(() =>
      store.addWall({
        length: 100,
        angle: 0,
        thickness: 100,
        arc: { radius: -5, angle: 90 },
      }),
    ).toThrow();
    expect(() =>
      store.addWall({
        length: 100,
        angle: 0,
        thickness: 100,
        arc: { radius: 5, angle: 0 },
      }),
    ).toThrow();
    expect(usePlannerStore.getState().room.walls).toHaveLength(0);
  });

  it('normalizes arc angle', () => {
    const store = usePlannerStore.getState();
    store.addWall({
      length: 100,
      angle: 0,
      thickness: 100,
      arc: { radius: 1000, angle: 450 },
    });
    const wall = usePlannerStore.getState().room.walls[0];
    expect(wall.arc?.angle).toBe(90);
  });
});

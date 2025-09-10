import { describe, it, expect, beforeEach } from 'vitest';
import { shapeToWalls } from '../src/utils/roomShape';
import { usePlannerStore } from '../src/state/store';
import type { Wall, RoomShape, ShapePoint } from '../src/types';

beforeEach(() => {
  usePlannerStore.setState({
    room: { height: 2700, origin: { x: 0, y: 0 }, walls: [], windows: [], doors: [] },
    roomShape: { points: [], segments: [] },
    selectedWall: null,
    past: [],
    future: [],
  });
});

describe('room shape conversions', () => {
  it('wallsToShape deduplicates points and assigns IDs', () => {
    const { setRoom } = usePlannerStore.getState();
    const walls: Wall[] = [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, height: 2.7, thickness: 0.1 },
      { id: 'w2', start: { x: 1, y: 0 }, end: { x: 1, y: 1 }, height: 2.7, thickness: 0.1 },
      { id: 'w3', start: { x: 1, y: 1 }, end: { x: 0, y: 0 }, height: 2.7, thickness: 0.1 },
    ];
    setRoom({ walls });
    const shape = usePlannerStore.getState().roomShape;
    expect(shape.points).toHaveLength(3);
    const coords = shape.points.map((p) => `${p.x},${p.y}`);
    expect(new Set(coords).size).toBe(3);
    expect(shape.points.every((p) => typeof p.id === 'string')).toBe(true);
  });

  it('shapeToWalls strips point IDs', () => {
    const p1: ShapePoint = { id: 'p1', x: 0, y: 0 };
    const p2: ShapePoint = { id: 'p2', x: 1, y: 0 };
    const shape: RoomShape = {
      points: [p1, p2],
      segments: [{ start: p1, end: p2 }],
    };
    const walls = shapeToWalls(shape, { height: 3, thickness: 0.2 });
    expect(walls).toHaveLength(1);
    const wall = walls[0];
    expect(wall.start).toEqual({ x: 0, y: 0 });
    expect((wall.start as any).id).toBeUndefined();
    expect(wall.end).toEqual({ x: 1, y: 0 });
    expect((wall.end as any).id).toBeUndefined();
  });

  it('setRoom defaults and clamps wall thickness correctly', () => {
    const store = usePlannerStore;
    store.getState().setSelectedWallThickness(0.15);
    store.getState().setRoom({
      walls: [
        { id: 'w1', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, height: 2.7 },
        { id: 'w2', start: { x: 1, y: 0 }, end: { x: 1, y: 1 }, height: 2.7, thickness: 0.05 },
        { id: 'w3', start: { x: 1, y: 1 }, end: { x: 0, y: 1 }, height: 2.7, thickness: 0.3 },
      ],
    });
    let walls = store.getState().room.walls;
    expect(walls.map((w) => w.thickness)).toEqual([0.15, 0.08, 0.25]);

    store.setState({
      selectedWall: null,
      room: { ...store.getState().room, walls: [] },
      roomShape: { points: [], segments: [] },
      past: [],
      future: [],
    });
    store.getState().setRoom({
      walls: [
        { id: 'w4', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, height: 2.7 },
      ],
    });
    walls = store.getState().room.walls;
    expect(walls[0].thickness).toBe(0.1);
  });
});


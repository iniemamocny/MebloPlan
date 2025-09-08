import { describe, it, beforeEach, expect } from 'vitest';
import { getWallSegments, getAreaAndPerimeter, Segment } from '../src/utils/walls';
import { usePlannerStore } from '../src/state/store';
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
      room: {
        walls: [
          {
            id: 'a',
            angle: 0,
            thickness: 100,
            arc: { radius: 1000, angle: 90 },
            length: Math.PI * 1000 * 0.5,
          },
        ],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
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
});

describe('WallDrawer auto close', () => {
  it('closes shape automatically when last point near start', () => {
    usePlannerStore.setState({
      room: { walls: [], openings: [], height: 2700, origin: { x: 0, y: 0 } },
      autoCloseWalls: true,
    });
    const renderer = {
      domElement: {
        style: {},
        addEventListener() {},
        removeEventListener() {},
      },
    } as any;
    const wd = new WallDrawer(
      renderer as any,
      () => new THREE.PerspectiveCamera(),
      new THREE.Scene(),
      usePlannerStore,
    );
    (wd as any).disable = () => {
      wd['start'] = null;
      wd['preview'] = null;
    };
    const positions = { setXYZ: () => {}, needsUpdate: false } as any;
    const makePreview = () => ({
      geometry: { attributes: { position: positions } },
      material: {},
    });
    wd['preview'] = makePreview();
    wd['start'] = new THREE.Vector3(0, 0, 0);
    wd.finalizeSegment(new THREE.Vector3(1, 0, 0));
    wd['preview'] = makePreview();
    wd['start'] = new THREE.Vector3(1, 0, 0);
    wd.finalizeSegment(new THREE.Vector3(1, 0, 1));
    wd['preview'] = makePreview();
    wd['start'] = new THREE.Vector3(1, 0, 1);
    wd.finalizeSegment(new THREE.Vector3(0, 0, 1));
    wd['preview'] = makePreview();
    wd['start'] = new THREE.Vector3(0, 0, 1);
    wd.finalizeSegment(new THREE.Vector3(0.05, 0, 0.02));
    const segs = getWallSegments(usePlannerStore.getState().room);
    expect(segs.length).toBe(4);
    const last = segs[3];
    expect(last.b.x).toBeCloseTo(segs[0].a.x, 3);
    expect(last.b.y).toBeCloseTo(segs[0].a.y, 3);
  });
});

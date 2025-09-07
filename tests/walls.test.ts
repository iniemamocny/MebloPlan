import { describe, it, beforeEach, expect } from 'vitest';
import { getWallSegments } from '../src/utils/walls';
import { usePlannerStore } from '../src/state/store';
import WallDrawer from '../src/viewer/WallDrawer';
import * as THREE from 'three';
import { webcrypto } from 'node:crypto';

(globalThis as any).crypto = webcrypto as any;

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
    const segs = getWallSegments();
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
    const segs = getWallSegments(50, 60);
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
    wd['preview'] = {
      geometry: { attributes: { position: positions } },
      material: {},
    } as any;
    wd['start'] = new THREE.Vector3(0, 0, 0);
    wd.finalizeSegment(new THREE.Vector3(1, 0, 0));
    wd.finalizeSegment(new THREE.Vector3(1, 0, 1));
    wd.finalizeSegment(new THREE.Vector3(0, 0, 1));
    wd.finalizeSegment(new THREE.Vector3(0.05, 0, 0.02));
    const segs = getWallSegments();
    expect(segs.length).toBe(4);
    const last = segs[3];
    expect(last.b.x).toBeCloseTo(segs[0].a.x, 3);
    expect(last.b.y).toBeCloseTo(segs[0].a.y, 3);
  });
});

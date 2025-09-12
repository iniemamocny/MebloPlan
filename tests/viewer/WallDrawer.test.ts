// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import WallDrawer from '../../src/viewer/WallDrawer';

const THICKNESS = 100; // mm
const HEIGHT = 2500; // mm
const SNAP = 1000; // mm default length for single click

function createDrawer() {
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    right: 100,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON() {},
  });
  canvas.setPointerCapture = vi.fn();
  canvas.releasePointerCapture = vi.fn();
  const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
  const camera = new THREE.PerspectiveCamera();
  const group = new THREE.Group();
  const history: string[] = [];
  const addWallWithHistory = vi.fn((start: any, end: any) => {
    history.push(`Added wall from (${start.x}, ${start.y}) to (${end.x}, ${end.y})`);
  });
  const state = {
    snapToGrid: false,
    snapLength: SNAP,
    wallDefaults: { height: HEIGHT, thickness: THICKNESS },
    addWallWithHistory,
  };
  const store = { getState: () => state } as any;
  const drawer = new WallDrawer(renderer, () => camera, group, store);
  drawer.enable(state.wallDefaults.thickness);
  const point = new THREE.Vector3();
  (drawer as any).getPoint = vi.fn(() => point.clone());
  return { drawer, point, addWallWithHistory, history };
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(0));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('WallDrawer', () => {
  it('creates square cursor based on wall thickness', () => {
    const { drawer } = createDrawer();
    const cursor = (drawer as any).cursor as THREE.Mesh;
    const geom = cursor.geometry as THREE.PlaneGeometry;
    expect((geom.parameters as any).width).toBeCloseTo(THICKNESS / 1000);
    expect((geom.parameters as any).height).toBeCloseTo(THICKNESS / 1000);
    drawer.disable();
  });

  it('single click adds fixed-length wall', () => {
    const { drawer, point, addWallWithHistory } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1 } as PointerEvent);
    point.set(SNAP / 1000, 0, 0);
    (drawer as any).onUp({ pointerId: 1 } as PointerEvent);
    expect(addWallWithHistory).toHaveBeenCalledWith(
      { x: 0, y: 0 },
      { x: SNAP / 1000, y: 0 },
    );
    drawer.disable();
  });

  it('dragging extends wall toward cursor', () => {
    const { drawer, point } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1 } as PointerEvent);
    point.set(2, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    const preview = (drawer as any).preview as THREE.Mesh;
    expect(preview.scale.x).toBeCloseTo(2);
    expect(preview.position.x).toBeCloseTo(1);
    drawer.disable();
  });

  it('Escape cancels drag without adding wall', () => {
    const { drawer, point, addWallWithHistory } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1 } as PointerEvent);
    point.set(1, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onKeyDown({ key: 'Escape' } as KeyboardEvent);
    expect((drawer as any).preview).toBeNull();
    point.set(1, 0, 0);
    (drawer as any).onUp({ pointerId: 1 } as PointerEvent);
    expect(addWallWithHistory).not.toHaveBeenCalled();
    drawer.disable();
  });

  it('finalized wall pushes history entry', () => {
    const { drawer, point, history } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1 } as PointerEvent);
    point.set(1, 0, 0);
    (drawer as any).onUp({ pointerId: 1 } as PointerEvent);
    expect(history.length).toBe(1);
    expect(history[0]).toBe('Added wall from (0, 0) to (1, 0)');
    drawer.disable();
  });

  it('enable no-ops when already active', () => {
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON() {},
    });
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const group = new THREE.Group();
    const state = {
      snapToGrid: false,
      snapLength: SNAP,
      wallDefaults: { height: HEIGHT, thickness: THICKNESS },
      addWallWithHistory: vi.fn(),
    };
    const store = { getState: () => state } as any;
    const drawer = new WallDrawer(renderer, () => camera, group, store);
    const addDom = vi.spyOn(canvas, 'addEventListener');
    const addWin = vi.spyOn(window, 'addEventListener');
    const raf = globalThis.requestAnimationFrame as any;
    drawer.enable(state.wallDefaults.thickness);
    const domCalls = addDom.mock.calls.length;
    const winCalls = addWin.mock.calls.length;
    const rafCalls = raf.mock.calls.length;
    drawer.enable(state.wallDefaults.thickness);
    expect(addDom.mock.calls.length).toBe(domCalls);
    expect(addWin.mock.calls.length).toBe(winCalls);
    expect(raf.mock.calls.length).toBe(rafCalls);
    drawer.disable();
  });
});


// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import WallDrawer from '../../src/viewer/WallDrawer';

const THICKNESS = 100; // mm
const HEIGHT = 2500; // mm
const SNAP = 1000; // mm default length for single click

function createDrawer(overrides: Partial<any> = {}) {
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
    history.push(
      `Added wall from (${start.x}, ${start.y}) to (${end.x}, ${end.y})`,
    );
  });
  const state = {
    snapToGrid: false,
    gridSize: 100,
    snapLength: SNAP,
    wallDefaults: { height: HEIGHT, thickness: THICKNESS },
    addWallWithHistory,
    ...overrides,
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

  it('returns intersection coordinates', () => {
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
      gridSize: 100,
      snapLength: SNAP,
      wallDefaults: { height: HEIGHT, thickness: THICKNESS },
      addWallWithHistory: vi.fn(),
    };
    const store = { getState: () => state } as any;
    const drawer = new WallDrawer(renderer, () => camera, group, store);
    drawer.enable(state.wallDefaults.thickness);

    const intersection = new THREE.Vector3(1.2345, 0, 2.3456);
    (drawer as any).raycaster.ray.intersectPlane = vi.fn(
      (_plane: THREE.Plane, point: THREE.Vector3) => {
        point.copy(intersection);
        return point;
      },
    );

    const result = (drawer as any).getPoint({
      clientX: 0,
      clientY: 0,
    } as PointerEvent);
    expect(result?.x).toBe(intersection.x);
    expect(result?.z).toBeCloseTo(-intersection.z);
    drawer.disable();
  });

  it('single click adds fixed-length wall', () => {
    const { drawer, point, addWallWithHistory } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    point.set(SNAP / 1000, 0, 0);
    (drawer as any).onUp({ pointerId: 1, button: 0 } as PointerEvent);
    expect(addWallWithHistory).toHaveBeenCalledWith(
      { x: 0, y: 0 },
      { x: SNAP / 1000, y: 0 },
    );
    drawer.disable();
  });

  it('single click after moving cursor starts in default direction', () => {
    const { drawer, point, addWallWithHistory } = createDrawer();
    point.set(0, 0, 1);
    (drawer as any).onMove({} as PointerEvent);
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    (drawer as any).onUp({ pointerId: 1, button: 0 } as PointerEvent);
    expect(addWallWithHistory).toHaveBeenCalledWith(
      { x: 0, y: 0 },
      { x: SNAP / 1000, y: 0 },
    );
    drawer.disable();
  });

  it('dragging extends wall toward cursor', () => {
    const { drawer, point } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    point.set(2, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    const preview = (drawer as any).preview as THREE.Mesh;
    expect(preview.scale.x).toBeCloseTo(2);
    expect(preview.position.x).toBeCloseTo(0);
    drawer.disable();
  });
  it('preview end matches constrained cursor position', () => {
    const { drawer, point } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    point.set(2, 0, 1);
    (drawer as any).onMove({} as PointerEvent);
    const preview = (drawer as any).preview as THREE.Mesh;
    const dist = preview.scale.x;
    const angle = preview.rotation.y;
    const endX = preview.position.x + dist * Math.cos(angle);
    const endZ = preview.position.z + dist * Math.sin(angle);
    expect(endX).toBeCloseTo(2);
    expect(endZ).toBeCloseTo(0);
    drawer.disable();
  });
  it('locks to vertical direction when dragging mostly vertically', () => {
    const { drawer, point, addWallWithHistory } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    point.set(0.1, 0, 2);
    (drawer as any).onMove({} as PointerEvent);
    const preview = (drawer as any).preview as THREE.Mesh;
    const dist = preview.scale.x;
    const angle = preview.rotation.y;
    const endX = preview.position.x + dist * Math.cos(angle);
    const endZ = preview.position.z + dist * Math.sin(angle);
    expect(endX).toBeCloseTo(0);
    expect(endZ).toBeCloseTo(2);
    (drawer as any).onUp({ pointerId: 1, button: 0 } as PointerEvent);
    expect(addWallWithHistory).toHaveBeenCalledWith(
      { x: 0, y: 0 },
      { x: 0, y: 2 },
    );
    drawer.disable();
  });
  it('snaps points to grid when enabled', () => {
    const { drawer, point, addWallWithHistory } = createDrawer({
      snapToGrid: true,
      gridSize: 100,
    });
    point.set(0.12, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    point.set(0.26, 0, 0);
    (drawer as any).onUp({ pointerId: 1, button: 0 } as PointerEvent);
    expect(addWallWithHistory).toHaveBeenCalledTimes(1);
    const [[start, end]] = addWallWithHistory.mock.calls;
    expect(start.x).toBeCloseTo(0.1);
    expect(start.y).toBeCloseTo(0);
    expect(end.x).toBeCloseTo(0.3);
    expect(end.y).toBeCloseTo(0);
    drawer.disable();
  });

  it('Escape cancels drag without adding wall', () => {
    const { drawer, point, addWallWithHistory } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    point.set(1, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onKeyDown({ key: 'Escape' } as KeyboardEvent);
    expect((drawer as any).preview).toBeNull();
    point.set(1, 0, 0);
    (drawer as any).onUp({ pointerId: 1, button: 0 } as PointerEvent);
    expect(addWallWithHistory).not.toHaveBeenCalled();
    drawer.disable();
  });

  it('pointer cancellation ends drag without adding wall', () => {
    const { drawer, point, addWallWithHistory } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    point.set(1, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onCancel({} as PointerEvent);
    expect((drawer as any).preview).toBeNull();
    point.set(1, 0, 0);
    (drawer as any).onUp({ pointerId: 1, button: 0 } as PointerEvent);
    expect(addWallWithHistory).not.toHaveBeenCalled();
    drawer.disable();
  });

  it('finalized wall pushes history entry', () => {
    const { drawer, point, history } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    point.set(1, 0, 0);
    (drawer as any).onUp({ pointerId: 1, button: 0 } as PointerEvent);
    expect(history.length).toBe(1);
    expect(history[0]).toBe('Added wall from (0, 0) to (1, 0)');
    drawer.disable();
  });

  it('ignores right mouse button', () => {
    const { drawer, point, addWallWithHistory } = createDrawer();
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 2 } as PointerEvent);
    point.set(1, 0, 0);
    (drawer as any).onUp({ pointerId: 1, button: 2 } as PointerEvent);
    expect(addWallWithHistory).not.toHaveBeenCalled();
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
      gridSize: 100,
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

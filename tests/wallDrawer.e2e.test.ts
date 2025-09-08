// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import WallDrawer from '../src/viewer/WallDrawer';
import { usePlannerStore } from '../src/state/store';

(HTMLCanvasElement.prototype as any).getContext = () => ({
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  strokeRect() {},
});
(HTMLCanvasElement.prototype as any).toDataURL = () => '';
(HTMLCanvasElement.prototype as any).setPointerCapture = () => {};
(HTMLCanvasElement.prototype as any).releasePointerCapture = () => {};

describe('WallDrawer ignores non-left clicks', () => {
  it('does not start drawing on right or middle click', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const store = {
      getState: () => ({
        addWall: vi.fn(() => 'id'),
        wallThickness: 100,
        wallType: 'dzialowa',
        snapAngle: 0,
        snapLength: 0,
        snapRightAngles: true,
        angleToPrev: 0,
        defaultSquareAngle: 0,
        room: { walls: [] },
        setRoom: vi.fn(),
      }),
    } as any;

    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    const getPoint = vi.fn(() => new THREE.Vector3(0, 0, 0));
    (drawer as any).getPoint = getPoint;

    (drawer as any).onDown({
      clientX: 0,
      clientY: 0,
      button: 2,
    } as PointerEvent);
    expect(getPoint).toHaveBeenCalledTimes(0);
    expect((drawer as any).start).toBeNull();
    expect((drawer as any).preview).toBeNull();

    (drawer as any).onDown({
      clientX: 0,
      clientY: 0,
      button: 1,
    } as PointerEvent);
    expect(getPoint).toHaveBeenCalledTimes(0);
    expect((drawer as any).start).toBeNull();
    expect((drawer as any).preview).toBeNull();
  });
});

describe('WallDrawer click without drag', () => {
  it('creates square and adds wall to store', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const addWall = vi.fn(() => 'id');
    const store = {
      getState: () => ({
        addWall,
        wallThickness: 100,
        wallType: 'dzialowa',
        snapAngle: 0,
        snapLength: 0,
        snapRightAngles: true,
        angleToPrev: 0,
        defaultSquareAngle: 0,
        room: { walls: [] },
        setRoom: vi.fn(),
      }),
    } as any;

    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    (drawer as any).getPoint = () => new THREE.Vector3(0, 0, 0);

    const down = { clientX: 0, clientY: 0, button: 0 } as PointerEvent;
    (drawer as any).onDown(down);
    expect((drawer as any).preview).toBeNull();

    const up = { clientX: 0, clientY: 0, detail: 1, button: 0 } as PointerEvent;
    (drawer as any).onUp(up);

    expect(addWall).toHaveBeenCalledWith({
      length: 100,
      angle: 0,
      thickness: 100,
    });
    expect((drawer as any).preview).toBeNull();
    expect((drawer as any).start).toBeNull();
    expect(scene.children.length).toBe(1);
  });
});

describe('WallDrawer retains square after drawing segment', () => {
  it('keeps initial square in scene when segment is drawn', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    let wallId = 0;
    const addWall = vi.fn(() => `id${wallId++}`);
    const store = {
      getState: () => ({
        addWall,
        wallThickness: 100,
        wallType: 'dzialowa',
        snapAngle: 0,
        snapLength: 0,
        snapRightAngles: true,
        angleToPrev: 0,
        defaultSquareAngle: 0,
        room: { walls: [] },
        setRoom: vi.fn(),
      }),
    } as any;

    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );

    const points = [
      new THREE.Vector3(0, 0, 0), // onDown1
      new THREE.Vector3(0, 0, 0), // onUp1
      new THREE.Vector3(0, 0, 0), // onDown2
      new THREE.Vector3(1, 0, 0), // onMove2
      new THREE.Vector3(1, 0, 0), // onUp2
    ];
    (drawer as any).getPoint = () => points.shift()!;

    const down1 = { clientX: 0, clientY: 0, button: 0 } as PointerEvent;
    (drawer as any).onDown(down1);
    const up1 = { clientX: 0, clientY: 0, detail: 1, button: 0 } as PointerEvent;
    (drawer as any).onUp(up1);

    const down2 = { clientX: 0, clientY: 0, button: 0 } as PointerEvent;
    (drawer as any).onDown(down2);
    const move2 = { clientX: 10, clientY: 0 } as PointerEvent;
    (drawer as any).onMove(move2);
    const up2 = { clientX: 10, clientY: 0, detail: 1, button: 0 } as PointerEvent;
    (drawer as any).onUp(up2);

    expect(scene.children.length).toBe(1);
    expect((drawer as any).squareMeshes.size).toBe(1);
  });
});

describe('WallDrawer snapRightAngles', () => {
  it('snaps to 90° when enabled and allows free angle when disabled', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();

    const baseState = {
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      room: { walls: [] },
      setRoom: vi.fn(),
      addWall: vi.fn(() => 'id'),
    } as any;

    const stateSnap = { ...baseState, snapRightAngles: true };
    const storeSnap = { getState: () => stateSnap } as any;
    const drawerSnap = new WallDrawer(
      renderer,
      getCamera,
      scene,
      storeSnap,
      () => {},
      () => {},
    );
    (drawerSnap as any).getPoint = vi
      .fn()
      .mockReturnValueOnce(new THREE.Vector3(0, 0, 0))
      .mockReturnValue(new THREE.Vector3(1, 0, 1));
    (drawerSnap as any).onDown({ clientX: 0, clientY: 0, button: 0 } as PointerEvent);
    (drawerSnap as any).onMove({ clientX: 10, clientY: 10 } as PointerEvent);
    expect(
      Math.round(((drawerSnap as any).currentAngle * 180) / Math.PI),
    ).toBe(90);

    const stateFree = { ...baseState, snapRightAngles: false };
    const storeFree = { getState: () => stateFree } as any;
    const drawerFree = new WallDrawer(
      renderer,
      getCamera,
      scene,
      storeFree,
      () => {},
      () => {},
    );
    (drawerFree as any).getPoint = vi
      .fn()
      .mockReturnValueOnce(new THREE.Vector3(0, 0, 0))
      .mockReturnValue(new THREE.Vector3(1, 0, 1));
    (drawerFree as any).onDown({ clientX: 0, clientY: 0, button: 0 } as PointerEvent);
    (drawerFree as any).onMove({ clientX: 10, clientY: 10 } as PointerEvent);
    expect(
      Math.round(((drawerFree as any).currentAngle * 180) / Math.PI),
    ).toBe(45);
  });
});

describe('WallDrawer small movement treated as click', () => {
  it('does not start drawing for tiny pointer movement', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const addWall = vi.fn(() => 'id');
    const store = {
      getState: () => ({
        addWall,
        wallThickness: 100,
        wallType: 'dzialowa',
        snapAngle: 0,
        snapLength: 0,
        snapRightAngles: true,
        angleToPrev: 0,
        defaultSquareAngle: 0,
        room: { walls: [] },
        setRoom: vi.fn(),
      }),
    } as any;

    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    (drawer as any).getPoint = () => new THREE.Vector3(0, 0, 0);

    const down = { clientX: 0, clientY: 0, button: 0 } as PointerEvent;
    (drawer as any).onDown(down);

    const move = { clientX: 2, clientY: 2 } as PointerEvent;
    (drawer as any).onMove(move);

    const up = { clientX: 2, clientY: 2, detail: 1, button: 0 } as PointerEvent;
    (drawer as any).onUp(up);

    expect(addWall).toHaveBeenCalledWith({
      length: 100,
      angle: 0,
      thickness: 100,
    });
    expect((drawer as any).preview).toBeNull();
  });
});

describe('WallDrawer keeps first point fixed', () => {
  it('does not move initial point when dragging', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const store: any = {
      getState: () => ({
        addWall: vi.fn(),
        wallThickness: 100,
        wallType: 'dzialowa',
        snapAngle: 0,
        snapLength: 0,
        snapRightAngles: true,
        angleToPrev: 0,
        defaultSquareAngle: 0,
        room: { walls: [] },
        setRoom: vi.fn(),
      }),
    };

    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );

    const p = new THREE.Vector3(0, 0, 0);
    (drawer as any).getPoint = () => p;
    (drawer as any).onDown({ button: 0 } as PointerEvent);

    (drawer as any).getPoint = () => {
      p.set(1, 0, 0);
      return p;
    };
    (drawer as any).onMove({ clientX: 10, clientY: 0 } as PointerEvent);

    expect((drawer as any).start.x).toBeCloseTo(0, 3);
    expect((drawer as any).start.z).toBeCloseTo(0, 3);
  });
});

describe('WallDrawer segment selection', () => {
  it('finds correct segment for a given point', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const store = {
      getState: () => ({
        addWall: vi.fn(() => 'id'),
        wallThickness: 100,
        wallType: 'dzialowa',
        snapAngle: 0,
        snapLength: 0,
        snapRightAngles: true,
        angleToPrev: 0,
        defaultSquareAngle: 0,
        room: {
          origin: { x: 0, y: 0 },
          walls: [
            { id: 'a', length: 1000, angle: 0, thickness: 100 },
            { id: 'b', length: 1000, angle: 90, thickness: 100 },
          ],
          openings: [],
        },
        setRoom: vi.fn(),
      }),
    } as any;

    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );

    const seg1 = (drawer as any).findSegmentForPoint(500, 30);
    expect(seg1.wall.id).toBe('a');
    const seg2 = (drawer as any).findSegmentForPoint(970, 500);
    expect(seg2.wall.id).toBe('b');
  });
});

describe('WallDrawer.applyLength', () => {
  it('ignores non-positive lengths', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const addWall = vi.fn(() => 'id');
    const store = {
      getState: () => ({
        addWall,
        wallThickness: 100,
        wallType: 'dzialowa',
        snapAngle: 0,
        snapLength: 0,
        snapRightAngles: true,
        angleToPrev: 0,
        defaultSquareAngle: 0,
        room: { walls: [] },
        setRoom: vi.fn(),
      }),
    } as any;

    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    // initialise start and preview to allow applyLength to proceed
    (drawer as any).start = new THREE.Vector3();
    (drawer as any).preview = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
      new THREE.LineBasicMaterial(),
    );

    drawer.applyLength(0);
    drawer.applyLength(-50);

    expect(addWall).not.toHaveBeenCalled();
  });
});

describe('WallDrawer snapping', () => {
  it('uses actual angle and snaps to configured length', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const onLengthChange = vi.fn();
    const onAngleChange = vi.fn();
    const state = {
      addWall: vi.fn(() => 'id'),
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 30,
      snapLength: 100,
      snapRightAngles: false,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      room: { walls: [] },
      setRoom: vi.fn(),
    };
    const store = { getState: () => state } as any;
    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      onLengthChange,
      onAngleChange,
    );
    (drawer as any).getPoint = () => new THREE.Vector3(0, 0, 0);
    (drawer as any).onDown({ button: 0 } as PointerEvent);
    const rad = (20 * Math.PI) / 180;
    (drawer as any).getPoint = () =>
      new THREE.Vector3(Math.cos(rad) * 0.12, 0, Math.sin(rad) * 0.12);
    (drawer as any).onMove({} as PointerEvent);
    expect(onAngleChange.mock.calls.at(-1)?.[0]).toBeCloseTo(20);
    expect(onLengthChange).toHaveBeenLastCalledWith(100);
  });
});

describe('WallDrawer vertex snapping to existing point', () => {
  it('snaps end of wall when cursor is near existing vertex', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const addWall = vi.fn(() => 'id');
    const state = {
      addWall,
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      snapRightAngles: false,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      room: {
        origin: { x: 0, y: 0 },
        walls: [{ id: 'a', length: 1000, angle: 0, thickness: 100 }],
      },
      setRoom: vi.fn(),
      autoCloseWalls: false,
    };
    const store: any = { getState: () => state };
    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    (drawer as any).getPoint = () => new THREE.Vector3(1, 0, 0);
    (drawer as any).onDown({ button: 0 } as PointerEvent);
    (drawer as any).getPoint = () => new THREE.Vector3(0.004, 0, 0.002);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ button: 0 } as PointerEvent);
    expect(addWall).toHaveBeenCalled();
    const call = addWall.mock.calls[0][0];
    expect(call.length).toBeCloseTo(1000, 3);
    expect(call.angle).toBeCloseTo(180, 3);
  });
});

describe('WallDrawer edge snapping to existing wall', () => {
  it('snaps end of wall when cursor is near middle of existing wall', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const addWall = vi.fn(() => 'id');
    const state = {
      addWall,
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      snapRightAngles: false,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      room: {
        origin: { x: 0, y: 0 },
        walls: [{ id: 'a', length: 1000, angle: 0, thickness: 100 }],
      },
      setRoom: vi.fn(),
      autoCloseWalls: false,
    };
    const store: any = { getState: () => state };
    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    (drawer as any).getPoint = () => new THREE.Vector3(0, 0, 1);
    (drawer as any).onDown({ button: 0 } as PointerEvent);
    (drawer as any).getPoint = () => new THREE.Vector3(0.5, 0, 0.002);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ button: 0 } as PointerEvent);
    expect(addWall).toHaveBeenCalled();
    const call = addWall.mock.calls[0][0];
    expect(call.length).toBeCloseTo(1118, 0);
    expect(call.angle).toBeCloseTo(296.565, 3);
  });
});

describe('WallDrawer grid snapping', () => {
  it('snaps start and end points to grid when enabled', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const addWall = vi.fn(() => 'id');
    const setRoom = vi.fn();
    const state = {
      addWall,
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      snapRightAngles: true,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      room: { walls: [] },
      setRoom,
      autoCloseWalls: false,
      snapToGrid: true,
      gridSize: 50,
    };
    const store = { getState: () => state } as any;
    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    const points = [
      new THREE.Vector3(0.012, 0, 0.018),
      new THREE.Vector3(0.104, 0, 0.021),
    ];
    let idx = 0;
    (drawer as any).raycaster.ray.intersectPlane = (_: any, target: any) => {
      const p = points[Math.min(idx, points.length - 1)];
      target.copy(p);
      idx++;
      return target;
    };
    (drawer as any).onDown({ clientX: 0, clientY: 0, button: 0 } as PointerEvent);
    (drawer as any).onMove({ clientX: 0, clientY: 0 } as PointerEvent);
    (drawer as any).onUp({ clientX: 0, clientY: 0, button: 0 } as PointerEvent);
    expect(setRoom).toHaveBeenCalledWith({ origin: { x: 0, y: 0 } });
    expect(addWall).toHaveBeenCalledWith({
      length: 100,
      angle: 0,
      thickness: 100,
    });
  });
});

describe('WallDrawer edit mode', () => {
  it('drags endpoint to change length and angle', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const updateWall = vi.fn();
    const state = {
      updateWall,
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      snapRightAngles: false,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      room: {
        origin: { x: 0, y: 0 },
        walls: [{ id: 'a', length: 1000, angle: 0, thickness: 100 }],
      },
      setRoom: vi.fn(),
    };
    const store = { getState: () => state } as any;
    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    (drawer as any).setMode('edit');
    // select endpoint at (1,0)
    (drawer as any).getPoint = () => new THREE.Vector3(1, 0, 0);
    (drawer as any).onDown({ button: 0 } as PointerEvent);
    // drag to (0.5, 0.5)
    (drawer as any).getPoint = () => new THREE.Vector3(0.5, 0, 0.5);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ button: 0 } as PointerEvent);
    expect(updateWall).toHaveBeenCalled();
    const patch = updateWall.mock.calls[0][1];
    expect(patch.length).toBeCloseTo(707, 0);
    expect(patch.angle).toBeCloseTo(45, 0);
  });

  it('dragging midpoint moves wall without changing length', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const updateWall = vi.fn();
    const setRoom = vi.fn();
    const state = {
      updateWall,
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      snapRightAngles: false,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      room: {
        origin: { x: 0, y: 0 },
        walls: [{ id: 'a', length: 1000, angle: 0, thickness: 100 }],
      },
      setRoom,
    } as any;
    const store = { getState: () => state } as any;
    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    (drawer as any).setMode('edit');
    (drawer as any).getPoint = () => new THREE.Vector3(0.5, 0, 0);
    (drawer as any).onDown({ button: 0 } as PointerEvent);
    (drawer as any).getPoint = () => new THREE.Vector3(0.5, 0, 0.5);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ button: 0 } as PointerEvent);
    expect(updateWall).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ length: 1000, angle: 0 }),
    );
    expect(setRoom).toHaveBeenCalledWith({ origin: { x: 0, y: 500 } });
  });

  it('dragging start point updates length and origin', () => {
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const updateWall = vi.fn();
    const setRoom = vi.fn();
    const state = {
      updateWall,
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      snapRightAngles: true,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      room: {
        origin: { x: 0, y: 0 },
        walls: [{ id: 'a', length: 1000, angle: 0, thickness: 100 }],
      },
      setRoom,
    } as any;
    const store = { getState: () => state } as any;
    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    (drawer as any).setMode('edit');
    (drawer as any).getPoint = () => new THREE.Vector3(0, 0, 0);
    (drawer as any).onDown({ button: 0 } as PointerEvent);
    (drawer as any).getPoint = () => new THREE.Vector3(0.5, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ button: 0 } as PointerEvent);
    expect(updateWall).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ length: 500, angle: 0 }),
    );
    const origin = setRoom.mock.calls[0][0].origin;
    expect(origin.x).toBe(500);
    expect(origin.y).toBeCloseTo(0);
  });
});

describe('WallDrawer overlays', () => {
  it('creates overlay, accepts manual length and keeps label', () => {
    document.body.innerHTML = '';
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const addWall = vi.fn((w) => {
      const id = `w${state.room.walls.length}`;
      state.room.walls.push({ id, ...w });
      return id;
    });
    const updateWall = vi.fn();
    const state = {
      addWall,
      updateWall,
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      snapRightAngles: true,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      room: { origin: { x: 0, y: 0 }, walls: [] },
      setRoom: vi.fn(),
      autoCloseWalls: false,
    };
    const store = {
      getState: () => state,
      subscribe: () => () => {},
    } as any;
    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    (drawer as any).getPoint = () => new THREE.Vector3(0, 0, 0);
    (drawer as any).onDown({ clientX: 0, clientY: 0, button: 0 } as PointerEvent);
    let overlay = document.querySelector(
      'input.wall-overlay',
    ) as HTMLInputElement;
    expect(overlay).toBeNull();
    // move to start dragging and update overlay
    (drawer as any).getPoint = () => new THREE.Vector3(1, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    overlay = document.querySelector('input.wall-overlay') as HTMLInputElement;
    expect(overlay).not.toBeNull();
    expect(overlay!.value).toBe('1000');
    // manual entry
    overlay!.value = '500';
    (drawer as any).onKeyDown({
      key: 'Enter',
      target: overlay!,
      preventDefault() {},
    } as KeyboardEvent);
    expect(addWall).toHaveBeenCalled();
    const labelId = state.room.walls[0].id;
    const labels = (drawer as any).labels;
    expect(labels.has(labelId)).toBe(true);
    const label = document.querySelector('div.wall-label') as HTMLDivElement;
    expect(label?.textContent).toBe('500 mm×');
    // start new wall
    (drawer as any).getPoint = () => new THREE.Vector3(1, 0, 0);
    (drawer as any).onDown({ clientX: 0, clientY: 0, button: 0 } as PointerEvent);
    const persistent = document.querySelectorAll('div.wall-label');
    expect(persistent.length).toBe(1);
  });
});

describe('WallDrawer label editing', () => {
  it('clicking label allows editing wall length', () => {
    document.body.innerHTML = '';
    (HTMLCanvasElement.prototype as any).getContext = () => ({
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      strokeRect() {},
    });
    (HTMLCanvasElement.prototype as any).toDataURL = () => '';
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const subs: any[] = [];
    const state: any = {
      addWall: vi.fn((w) => {
        const id = `w${state.room.walls.length}`;
        state.room.walls.push({ id, ...w });
        subs.forEach((s: any) => s.cb(s.sel(state)));
        return id;
      }),
      updateWall: vi.fn((id: string, patch: any) => {
        state.room.walls = state.room.walls.map((w: any) =>
          w.id === id ? { ...w, ...patch } : w,
        );
        subs.forEach((s: any) => s.cb(s.sel(state)));
      }),
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      snapRightAngles: true,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      room: { origin: { x: 0, y: 0 }, walls: [] },
      setRoom: vi.fn(),
      autoCloseWalls: false,
    };
    const store = {
      getState: () => state,
      subscribe: (sel: any, cb: any) => {
        subs.push({ sel, cb });
        return () => {};
      },
    } as any;
    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    drawer.enable();
    (drawer as any).getPoint = () => new THREE.Vector3(0, 0, 0);
    (drawer as any).onDown({ clientX: 0, clientY: 0, button: 0 } as PointerEvent);
    (drawer as any).getPoint = () => new THREE.Vector3(1, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ button: 0 } as PointerEvent);
    const wallId = state.room.walls[0].id;
    let label = document.querySelector('div.wall-label') as HTMLDivElement;
    expect(label?.textContent).toBe('1000 mm×');
    label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const input = document.querySelector(
      'input.wall-label',
    ) as HTMLInputElement;
    input.value = '800';
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(state.updateWall).toHaveBeenCalledWith(wallId, { length: 800 });
    expect(state.room.walls[0].length).toBe(800);
    label = document.querySelector('div.wall-label') as HTMLDivElement;
    expect(label?.textContent).toBe('800 mm×');
  });
});

describe('WallDrawer remove button', () => {
  it('removes wall when × button clicked', () => {
    (HTMLCanvasElement.prototype as any).getContext = () => ({
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      strokeRect() {},
    });
    (HTMLCanvasElement.prototype as any).toDataURL = () => '';
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const subs: any[] = [];
    const state: any = {
      addWall: (w: any) => {
        const id = `w${state.room.walls.length}`;
        state.room.walls.push({ id, ...w });
        subs.forEach((s: any) => s.cb(s.sel(state)));
        return id;
      },
      updateWall: vi.fn(),
      removeWall: (id: string) => {
        state.room.walls = state.room.walls.filter((w: any) => w.id !== id);
        subs.forEach((s: any) => s.cb(s.sel(state)));
      },
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      snapRightAngles: true,
      angleToPrev: 0,
      room: { origin: { x: 0, y: 0 }, walls: [] },
      setRoom: vi.fn(),
      autoCloseWalls: false,
    };
    const store: any = () => state;
    store.getState = () => state;
    store.subscribe = (sel: any, cb: any) => {
      subs.push({ sel, cb });
      return () => {};
    };
    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    drawer.enable();
    (drawer as any).getPoint = () => new THREE.Vector3(0, 0, 0);
    (drawer as any).onDown({ clientX: 0, clientY: 0, button: 0 } as PointerEvent);
    (drawer as any).getPoint = () => new THREE.Vector3(1, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ button: 0 } as PointerEvent);
    const btn = document.querySelector(
      'div.wall-label button',
    ) as HTMLButtonElement;
    expect(btn).not.toBeNull();
  });
});

describe('WallDrawer opening mode', () => {
  it('adds and edits opening', () => {
    usePlannerStore.setState({
      room: {
        walls: [{ id: 'w1', length: 1000, angle: 0, thickness: 100 }],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
      openingDefaults: { width: 100, height: 200, bottom: 0, kind: 0 },
    });
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const drawer = new WallDrawer(
      renderer,
      () => camera,
      scene,
      usePlannerStore,
      () => {},
      () => {},
    );
    drawer.setMode('opening');

    (drawer as any).getPoint = () => new THREE.Vector3(0.5, 0, 0);
    (drawer as any).onDown({ button: 0 } as PointerEvent);
    expect(usePlannerStore.getState().room.openings).toHaveLength(1);
    let op = usePlannerStore.getState().room.openings[0];
    expect(op.offset).toBeCloseTo(450);

    (drawer as any).getPoint = () => new THREE.Vector3(0.5, 0, 0);
    (drawer as any).onDown({ button: 0 } as PointerEvent);
    (drawer as any).getPoint = () => new THREE.Vector3(0.6, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ button: 0 } as PointerEvent);
    op = usePlannerStore.getState().room.openings[0];
    expect(op.offset).toBeCloseTo(550);

    (drawer as any).getPoint = () => new THREE.Vector3(0.65, 0, 0);
    (drawer as any).onDown({ button: 0 } as PointerEvent);
    (drawer as any).getPoint = () => new THREE.Vector3(0.75, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ button: 0 } as PointerEvent);
    op = usePlannerStore.getState().room.openings[0];
    expect(op.width).toBeCloseTo(200);
  });
});

describe('WallDrawer edit tolerance across zoom', () => {
  function setup(height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1000;
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON() {},
    });
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, height, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const scene = new THREE.Scene();
    const state: any = {
      room: {
        origin: { x: 0, y: 0 },
        walls: [{ id: 'w1', length: 1000, angle: 0, thickness: 100 }],
        openings: [],
      },
      wallThickness: 100,
      wallType: 'dzialowa',
      snapAngle: 0,
      snapLength: 0,
      snapRightAngles: true,
      angleToPrev: 0,
      defaultSquareAngle: 0,
      addWall: vi.fn(),
      updateWall: vi.fn(),
      removeWall: vi.fn(),
      setRoom: vi.fn(),
      autoCloseWalls: false,
      gridSize: 50,
      snapToGrid: false,
      measurementUnit: 'mm',
      openingDefaults: { width: 900, height: 2100, bottom: 0, kind: 0 },
    };
    const store: any = () => state;
    store.getState = () => state;
    store.subscribe = () => () => {};
    const drawer = new WallDrawer(
      renderer,
      () => camera,
      scene,
      store,
      () => {},
      () => {},
    );
    drawer.setMode('edit');
    return { drawer };
  }

  [5, 50].forEach((h) => {
    it(`selects segment at camera height ${h}`, () => {
      const { drawer } = setup(h);
      const segEnd = new THREE.Vector3(1, 0, 0);
      const screen = (drawer as any).worldToScreen(segEnd);
      const ev = { clientX: screen.x + 4, clientY: screen.y, button: 0 } as PointerEvent;
      (drawer as any).onDown(ev);
      expect((drawer as any).editingIndex).toBe(0);
    });
  });
});

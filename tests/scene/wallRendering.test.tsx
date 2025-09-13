// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import SceneViewer from '../../src/ui/SceneViewer';
import { usePlannerStore } from '../../src/state/store';
import WallDrawer from '../../src/viewer/WallDrawer';
import {
  convertAxis,
  plannerAxes,
  worldAxes,
  plannerToWorld,
} from '../../src/utils/coordinateSystem';

vi.mock('../../src/ui/components/ItemHotbar', () => ({
  default: () => null,
  hotbarItems: [],
  furnishHotbarItems: [],
}));
vi.mock('../../src/ui/components/TouchJoystick', () => ({ default: () => null }));

vi.mock('../../src/scene/engine', () => {
  return {
    setupThree: () => {
      const dom = document.createElement('canvas');
      dom.getBoundingClientRect = () => ({
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
      const perspectiveCamera = new THREE.PerspectiveCamera();
      const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      const group: any = {
        children: [] as any[],
        add(obj: any) {
          this.children.push(obj);
        },
        remove(obj: any) {
          this.children = this.children.filter((c) => c !== obj);
        },
      };
      const three: any = {
        scene: {},
        camera: perspectiveCamera,
        renderer: { domElement: dom },
        controls: {
          enabled: true,
          target: new THREE.Vector3(),
          enableRotate: true,
          update: () => {},
          dispose: () => {},
          dollyIn: () => {},
          dollyOut: () => {},
        },
        playerControls: {
          lock: vi.fn(),
          unlock: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          isLocked: false,
        },
        group,
        cabinetDragger: { enable: vi.fn(), disable: vi.fn() },
        perspectiveCamera,
        orthographicCamera,
      };
      three.setCamera = (cam: THREE.Camera) => {
        three.camera = cam;
      };
      three.setControls = (c: any) => {
        three.controls = c;
      };
      return three;
    },
  };
});

describe('Scene wall rendering', () => {
  let container: HTMLDivElement;
  let root: ReactDOM.Root;
  const threeRef: any = { current: null };
  const setMode = vi.fn();
  const setViewMode = vi.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    usePlannerStore.setState({
      roomShape: { points: [], segments: [] },
      selectedTool: null,
    });
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    vi.clearAllMocks();
    usePlannerStore.setState({
      roomShape: { points: [], segments: [] },
      selectedTool: null,
    });
  });

  it('adds meshes for each roomShape segment and updates on change', () => {
    const shape1 = {
      points: [],
      segments: [
        { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
        { start: { x: 1, y: 0 }, end: { x: 1, y: 1 } },
      ],
    };

    act(() => {
      usePlannerStore.setState({ roomShape: shape1 });
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode={null}
          setMode={setMode}
          viewMode="3d"
          setViewMode={setViewMode}
        />,
      );
    });

    const group = threeRef.current.group;
    expect(group.children).toHaveLength(1);
    expect(group.children[0].children).toHaveLength(2);

    const [wall1, wall2] = group.children[0].children as THREE.Mesh[];
    expect(wall1.position.x).toBeCloseTo(plannerToWorld(0, 'x'));
    expect(wall1.position.z).toBeCloseTo(
      convertAxis(0, plannerAxes, 'y', worldAxes, 'z'),
    );
    expect(wall2.position.x).toBeCloseTo(plannerToWorld(1, 'x'));
    expect(wall2.position.z).toBeCloseTo(
      convertAxis(0, plannerAxes, 'y', worldAxes, 'z'),
    );

    const shape2 = {
      points: [],
      segments: [
        ...shape1.segments,
        { start: { x: 1, y: 1 }, end: { x: 0, y: 1 } },
      ],
    };

    act(() => {
      usePlannerStore.setState({ roomShape: shape2 });
    });

    expect(group.children).toHaveLength(1);
    expect(group.children[0].children).toHaveLength(3);
    const wall3 = group.children[0].children[2] as THREE.Mesh;
    expect(wall3.position.x).toBeCloseTo(plannerToWorld(1, 'x'));
    expect(wall3.position.z).toBeCloseTo(
      convertAxis(1, plannerAxes, 'y', worldAxes, 'z'),
    );
  });

  it('orients walls correctly when drawn via WallDrawer', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(0));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    usePlannerStore.setState({
      roomShape: { points: [], segments: [] },
      snapToGrid: false,
      gridSize: 100,
      snapLength: 1000,
      snapRightAngles: true,
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
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const group = new THREE.Group();
    const drawer = new WallDrawer(renderer, () => camera, group, usePlannerStore as any);
    drawer.enable(usePlannerStore.getState().wallDefaults.thickness);

    const point = new THREE.Vector3();
    (drawer as any).getPoint = vi.fn(() => point.clone());

    // Horizontal wall
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    point.set(1, 0, 0);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ pointerId: 1, button: 0 } as PointerEvent);

    // Vertical wall
    point.set(0, 0, 0);
    (drawer as any).onDown({ pointerId: 1, button: 0 } as PointerEvent);
    point.set(0, 0, -1);
    (drawer as any).onMove({} as PointerEvent);
    (drawer as any).onUp({ pointerId: 1, button: 0 } as PointerEvent);

    drawer.disable();
    vi.unstubAllGlobals();

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode={null}
          setMode={setMode}
          viewMode="3d"
          setViewMode={setViewMode}
        />,
      );
    });

    const wallGroup = threeRef.current.group.children[0];
    const [mesh1, mesh2] = wallGroup.children as THREE.Mesh[];
    expect(mesh1.rotation.x).toBeCloseTo(0);
    expect(mesh1.rotation.z).toBeCloseTo(0);
    expect(mesh2.rotation.x).toBeCloseTo(0);
    expect(mesh2.rotation.z).toBeCloseTo(0);
  });

  it('does not leak listeners when toggling wall tool', () => {
    const canvasAdd = vi.spyOn(HTMLCanvasElement.prototype, 'addEventListener');
    const canvasRemove = vi.spyOn(HTMLCanvasElement.prototype, 'removeEventListener');
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');

    const listeners = () => ({
      dom: canvasAdd.mock.calls.length - canvasRemove.mock.calls.length,
      win: winAdd.mock.calls.length - winRemove.mock.calls.length,
    });

    act(() => {
      usePlannerStore.setState({ selectedTool: 'wall' });
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode={null}
          setMode={setMode}
          viewMode="2d"
          setViewMode={setViewMode}
        />,
      );
    });

    const active = listeners();
    act(() => {
      usePlannerStore.setState({ selectedTool: null });
    });
    const inactive = listeners();
    expect(active.dom - inactive.dom).toBe(5);
    expect(active.win - inactive.win).toBe(1);

    act(() => {
      usePlannerStore.setState({ selectedTool: 'wall' });
    });
    const active2 = listeners();
    expect(active2.dom - inactive.dom).toBe(5);
    expect(active2.win - inactive.win).toBe(1);

    act(() => {
      usePlannerStore.setState({ selectedTool: null });
    });
    const inactive2 = listeners();
    expect(inactive2.dom).toBe(inactive.dom);
    expect(inactive2.win).toBe(inactive.win);

    canvasAdd.mockRestore();
    canvasRemove.mockRestore();
    winAdd.mockRestore();
    winRemove.mockRestore();
  });
});

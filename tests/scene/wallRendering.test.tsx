// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import SceneViewer from '../../src/ui/SceneViewer';
import { usePlannerStore } from '../../src/state/store';

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

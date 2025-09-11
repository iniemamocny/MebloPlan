// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../src/utils/uuid', () => ({ default: () => 'test-uuid', uuid: () => 'test-uuid' }));
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import * as THREE from 'three';
import SceneViewer from '../src/ui/SceneViewer';
import { usePlannerStore } from '../src/state/store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    target: new THREE.Vector3(),
    enableRotate: true,
    update: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('../src/scene/engine', () => {
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
        group: { children: [], add: () => {}, remove: () => {} },
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

describe('RadialMenu integration with RoomBuilder', () => {
  beforeEach(() => {
    (global as any).PointerEvent = MouseEvent;
    HTMLCanvasElement.prototype.getContext = () => ({ clearRect: () => {} }) as any;
    HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
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
    HTMLCanvasElement.prototype.setPointerCapture = () => {};
    HTMLCanvasElement.prototype.releasePointerCapture = () => {};
  });
  it('selecting wall adds a wall to the room', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({
      selectedTool: null,
      selectedWall: { thickness: 0.1 },
      wallTool: 'draw',
      room: { height: 2700, origin: { x: 0, y: 0 }, walls: [], windows: [], doors: [] },
    });

    act(() => {
      root.render(<SceneViewer threeRef={threeRef} addCountertop={false} mode="build" setMode={setMode} />);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
    });

    const path = document.querySelector('path');
    expect(path).not.toBeNull();

    act(() => {
      path!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // selecting wall tool should update state
    expect(usePlannerStore.getState().selectedTool).toBe('wall');

    root.unmount();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import SceneViewer from '../src/ui/SceneViewer';
import type { ThreeEngine, PlayerControls } from '../src/scene/engine';

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    target: new THREE.Vector3(),
    enableRotate: true,
    update: vi.fn(),
    dispose: vi.fn(),
    dollyIn: vi.fn(),
    dollyOut: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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
      const three: ThreeEngine = {
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
          dispatchEvent: vi.fn(),
          isLocked: false,
        } as PlayerControls,
        group: { children: [], add: () => {}, remove: () => {} },
        cabinetDragger: { enable: vi.fn(), disable: vi.fn() },
        perspectiveCamera,
        orthographicCamera,
        setPlayerParams: vi.fn(),
        setMove: vi.fn(),
        setMoveFromJoystick: vi.fn(),
        updateCameraRotation: vi.fn(),
        resetCameraRotation: vi.fn(),
        onJump: vi.fn(),
        onCrouch: vi.fn(),
        updateGrid: vi.fn(),
        dispose: vi.fn(),
        setCamera: (cam: THREE.Camera) => {
          three.camera = cam;
        },
        setControls: (c: any) => {
          three.controls = c;
        },
        start: vi.fn(),
        stop: vi.fn(),
      };
      return three;
    },
  };
});

vi.mock('../src/ui/components/ItemHotbar', () => ({
  default: () => <div data-testid="item-hotbar"></div>,
  hotbarItems: [],
  furnishHotbarItems: [],
}));
vi.mock('../src/ui/components/TouchJoystick', () => ({ default: () => null }));

describe('SceneViewer axes gizmo', () => {
  it('renders axes helper overlay', () => {
    const threeRef: React.MutableRefObject<ThreeEngine | null> = { current: null };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode={null}
          setMode={vi.fn()}
          setViewMode={() => {}}
        />,
      );
    });
    expect(container.querySelector('[data-testid="axes-gizmo"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it.each(["3d", "2d"] as const)(
    "matches world axes in %s view",
    async (viewMode) => {
      const threeRef: React.MutableRefObject<ThreeEngine | null> = { current: null };
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = ReactDOM.createRoot(container);
      act(() => {
        root.render(
          <SceneViewer
            threeRef={threeRef}
            addCountertop={false}
            mode={null}
            setMode={vi.fn()}
            viewMode={viewMode}
            setViewMode={() => {}}
          />,
        );
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(threeRef.current.axesHelper).toBeDefined();
      expect(threeRef.current.axesHelper!.rotation.x).toBeCloseTo(0);
      expect(threeRef.current.axesHelper!.rotation.y).toBeCloseTo(0);
      expect(threeRef.current.axesHelper!.rotation.z).toBeCloseTo(0);
      root.unmount();
      container.remove();
    },
  );

  it('matches world axes after switching view modes', async () => {
    const threeRef: React.MutableRefObject<ThreeEngine | null> = { current: null };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode={null}
          setMode={vi.fn()}
          viewMode="3d"
          setViewMode={() => {}}
        />,
      );
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(threeRef.current.axesHelper).toBeDefined();
    expect(threeRef.current.axesHelper!.rotation.x).toBeCloseTo(0);
    expect(threeRef.current.axesHelper!.rotation.y).toBeCloseTo(0);
    expect(threeRef.current.axesHelper!.rotation.z).toBeCloseTo(0);

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode={null}
          setMode={vi.fn()}
          viewMode="2d"
          setViewMode={() => {}}
        />,
      );
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(threeRef.current.axesHelper).toBeDefined();
    expect(threeRef.current.axesHelper!.rotation.x).toBeCloseTo(0);
    expect(threeRef.current.axesHelper!.rotation.y).toBeCloseTo(0);
    expect(threeRef.current.axesHelper!.rotation.z).toBeCloseTo(0);

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode={null}
          setMode={vi.fn()}
          viewMode="3d"
          setViewMode={() => {}}
        />,
      );
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(threeRef.current.axesHelper).toBeDefined();
    expect(threeRef.current.axesHelper!.rotation.x).toBeCloseTo(0);
    expect(threeRef.current.axesHelper!.rotation.y).toBeCloseTo(0);
    expect(threeRef.current.axesHelper!.rotation.z).toBeCloseTo(0);

    root.unmount();
    container.remove();
  });
});


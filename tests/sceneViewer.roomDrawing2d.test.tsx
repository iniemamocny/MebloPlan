// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import SceneViewer from '../src/ui/SceneViewer';
import { usePlannerStore } from '../src/state/store';

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    target: new THREE.Vector3(),
    enableRotate: true,
    update: vi.fn(),
    dispose: vi.fn(),
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

vi.mock('../src/ui/components/ItemHotbar', () => ({
  default: (props: any) => <div data-testid="item-hotbar" data-mode={props.mode}></div>,
  hotbarItems: [],
  buildHotbarItems: () => [],
  furnishHotbarItems: [],
}));
vi.mock('../src/ui/components/TouchJoystick', () => ({ default: () => null }));
vi.mock('../src/ui/build/RoomBuilder', () => ({ default: () => null }));
vi.mock('../src/ui/components/WallDrawToolbar', () => ({
  default: () => <div data-testid="wall-toolbar" />,
}));

describe('SceneViewer room drawing in 2D view', () => {
  it('shows wall drawing toolbar only in build mode', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const setViewMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({ isRoomDrawing: true, wallTool: 'draw' });

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode="build"
          setMode={setMode}
          viewMode="2d"
          setViewMode={setViewMode}
        />,
      );
    });

    expect(threeRef.current.camera).toBe(threeRef.current.orthographicCamera);
    expect(threeRef.current.controls.enableRotate).toBe(false);

    expect(container.querySelector('[data-testid="wall-toolbar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="item-hotbar"]')).toBeNull();
    expect(setMode).not.toHaveBeenCalled();

    root.unmount();
    container.remove();
  });

  it('returns to 3d view only after finishing drawing manually', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const setViewMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({ isRoomDrawing: true, wallTool: 'draw' });

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode="build"
          setMode={setMode}
          viewMode="2d"
          setViewMode={setViewMode}
        />,
      );
    });
    act(() => {
      usePlannerStore.getState().finishDrawing();
    });

    // view mode should not change automatically
    expect(setViewMode).not.toHaveBeenCalled();

    const finishBtn = container.querySelector('[data-testid="finish-drawing"]') as HTMLElement;
    act(() => {
      finishBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setViewMode).toHaveBeenCalledWith('3d');
    expect(setMode).not.toHaveBeenCalled();
    expect(usePlannerStore.getState().isRoomDrawing).toBe(false);

    root.unmount();
    container.remove();
  });

  it('enables drawing when wall tool was already set to draw', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const setViewMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({ wallTool: 'draw', isRoomDrawing: false });

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode="build"
          setMode={setMode}
          viewMode="2d"
          setViewMode={setViewMode}
        />, 
      );
    });

    expect(container.querySelector('[data-testid="wall-toolbar"]')).toBeNull();

    act(() => {
      usePlannerStore.getState().setIsRoomDrawing(true);
    });

    expect(container.querySelector('[data-testid="wall-toolbar"]')).not.toBeNull();

    root.unmount();
    container.remove();
    usePlannerStore.setState({ isRoomDrawing: false, wallTool: 'edit' });
  });
});


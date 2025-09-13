// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import SceneViewer from '../src/ui/SceneViewer';
import type { ThreeEngine, PlayerControls } from '../src/scene/engine';

const visibleStates: boolean[] = [];

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
  default: () => null,
  hotbarItems: [],
  furnishHotbarItems: [],
}));
vi.mock('../src/ui/components/TouchJoystick', () => ({ default: () => null }));
vi.mock('../src/ui/components/RadialMenu', () => ({
  default: (props: any) => {
    visibleStates.push(props.visible);
    return null;
  },
}));

describe('SceneViewer RadialMenu visibility', () => {
  it('shows on Q down and hides on Q up', () => {
    visibleStates.length = 0;
    const threeRef: React.MutableRefObject<ThreeEngine | null> = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode="furnish"
          setMode={setMode}
        />,
      );
    });
    expect(visibleStates[visibleStates.length - 1]).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
    });
    expect(visibleStates[visibleStates.length - 1]).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ' }));
    });
    expect(visibleStates[visibleStates.length - 1]).toBe(false);

    root.unmount();
  });

  it('is accessible in all player modes', () => {
    const modes = ['furnish', 'decorate'] as const;
    for (const m of modes) {
      visibleStates.length = 0;
      const threeRef: React.MutableRefObject<ThreeEngine | null> = { current: null };
      const setMode = vi.fn();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOM.createRoot(container);

      act(() => {
        root.render(
          <SceneViewer
            threeRef={threeRef}
            addCountertop={false}
            mode={m}
            setMode={setMode}
          />,
        );
      });
      expect(visibleStates[visibleStates.length - 1]).toBe(false);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
      });
      expect(visibleStates[visibleStates.length - 1]).toBe(true);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ' }));
      });
      expect(visibleStates[visibleStates.length - 1]).toBe(false);

      root.unmount();
      container.remove();
    }
  });
});

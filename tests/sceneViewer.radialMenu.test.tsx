// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import SceneViewer from '../src/ui/SceneViewer';

const visibleStates: boolean[] = [];

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
      return {
        scene: {},
        camera: {
          position: { y: 0 },
          getWorldPosition: () => new THREE.Vector3(),
          getWorldDirection: () => new THREE.Vector3(0, 0, -1),
        },
        renderer: { domElement: dom },
        controls: { enabled: true, dollyIn: () => {}, dollyOut: () => {}, update: () => {} },
        playerControls: {
          lock: vi.fn(),
          unlock: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          isLocked: false,
        },
        group: { children: [], add: () => {}, remove: () => {} },
        cabinetDragger: { enable: vi.fn(), disable: vi.fn() },
      };
    },
  };
});

vi.mock('../src/ui/components/ItemHotbar', () => ({
  default: () => null,
  hotbarItems: [],
  buildHotbarItems: () => [],
  furnishHotbarItems: [],
}));
vi.mock('../src/ui/components/TouchJoystick', () => ({ default: () => null }));
vi.mock('../src/ui/build/RoomBuilder', () => ({ default: () => null }));
vi.mock('../src/ui/components/RadialMenu', () => ({
  default: (props: any) => {
    visibleStates.push(props.visible);
    return null;
  },
}));

describe('SceneViewer RadialMenu visibility', () => {
  it('shows on Q down and hides on Q up', () => {
    visibleStates.length = 0;
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode="build"
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
});

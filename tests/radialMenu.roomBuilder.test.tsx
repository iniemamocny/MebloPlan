// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import * as THREE from 'three';
import SceneViewer from '../src/ui/SceneViewer';
import { usePlannerStore } from '../src/state/store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
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

describe('RadialMenu integration with RoomBuilder', () => {
  it('selecting wall adds a wall to the room', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({
      selectedTool: null,
      room: { height: 2700, origin: { x: 0, y: 0 }, walls: [], windows: [], doors: [] },
    });

    act(() => {
      root.render(<SceneViewer threeRef={threeRef} addCountertop={false} mode="build" setMode={setMode} />);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
    });

    const before = usePlannerStore.getState().room.walls.length;
    const path = document.querySelector('path');
    expect(path).not.toBeNull();

    act(() => {
      path!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    act(() => {
      window.dispatchEvent(
        new MouseEvent('pointerdown', { clientX: 10, clientY: 10 }),
      );
      window.dispatchEvent(
        new MouseEvent('pointermove', { clientX: 50, clientY: 10 }),
      );
      window.dispatchEvent(
        new MouseEvent('pointerup', { clientX: 50, clientY: 10 }),
      );
    });

    expect(usePlannerStore.getState().room.walls.length).toBe(before + 1);

    root.unmount();
  });
});

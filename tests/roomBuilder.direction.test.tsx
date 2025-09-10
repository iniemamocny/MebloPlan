// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../src/utils/uuid', () => ({
  default: () => 'test-uuid',
  uuid: () => 'test-uuid',
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import * as THREE from 'three';
import RoomBuilder from '../src/ui/build/RoomBuilder';
import { usePlannerStore } from '../src/state/store';

beforeEach(() => {
  (global as any).PointerEvent = MouseEvent;
  HTMLCanvasElement.prototype.getContext = () => ({
    clearRect: () => {},
  }) as any;
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
  usePlannerStore.setState({
    room: { height: 2700, origin: { x: 0, y: 0 }, walls: [], windows: [], doors: [] },
    selectedTool: 'wall',
    selectedWall: { thickness: 0.1 },
  });
});

describe('RoomBuilder direction handling', () => {
  it('skips dir update when initial move length is zero', () => {
    const canvas = document.createElement('canvas');
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 5, 5);
    camera.lookAt(0, 0, 0);
    const threeRef: any = {
      current: {
        renderer: { domElement: canvas },
        camera,
        group: { children: [], add: () => {}, remove: () => {} },
      },
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<RoomBuilder threeRef={threeRef} />));

    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 10, clientY: 10 }),
      );
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    const walls = usePlannerStore.getState().room.walls;
    expect(walls.length).toBe(1);
    const wall = walls[0];
    expect(Number.isFinite(wall.end.x)).toBe(true);
    expect(wall.end.x).toBeGreaterThan(wall.start.x);

    root.unmount();
    container.remove();
  });
});

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
  usePlannerStore.setState({
    room: { height: 2700, origin: { x: 0, y: 0 }, walls: [], windows: [], doors: [] },
    selectedTool: 'wall',
    selectedWall: { thickness: 0.1 },
    snapLength: 1,
    snapAngle: 90,
    snapRightAngles: true,
  });
});

describe('RoomBuilder snapping', () => {
  it('snaps new wall length and angle', () => {
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
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 50 }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 80, clientY: 60 }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, clientX: 80, clientY: 60 }),
      );
    });

    const wall = usePlannerStore.getState().room.walls[0];
    expect(wall).toBeDefined();
    const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    expect(wall.start.y).toBeCloseTo(0);
    expect(wall.end.y).toBeCloseTo(0);
    expect(wall.start.x).toBeCloseTo(0);
    expect(wall.end.x).toBeCloseTo(3);
    expect(len).toBeCloseTo(3);

    root.unmount();
    container.remove();
  });

  it('snaps wall angle relative to previous wall', () => {
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

    // first wall
    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 50 }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 80, clientY: 60 }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, clientX: 80, clientY: 60 }),
      );
    });

    act(() => usePlannerStore.setState({ selectedTool: 'wall' }));

    // second wall at roughly vertical direction
    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 80, clientY: 60 }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 90, clientY: 80 }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, clientX: 90, clientY: 80 }),
      );
    });

    const walls = usePlannerStore.getState().room.walls;
    expect(walls.length).toBe(2);
    const w1 = walls[0];
    const w2 = walls[1];
    const ang1 = Math.atan2(w1.end.y - w1.start.y, w1.end.x - w1.start.x);
    const ang2 = Math.atan2(w2.end.y - w2.start.y, w2.end.x - w2.start.x);
    expect(Math.abs(ang2 - ang1)).toBeCloseTo(Math.PI / 2);
    const len2 = Math.hypot(w2.end.x - w2.start.x, w2.end.y - w2.start.y);
    expect(len2).toBeCloseTo(Math.round(len2));

    root.unmount();
    container.remove();
  });
});

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
    measurementUnit: 'mm',
  });
});

describe('RoomBuilder measurement units', () => {
  const setup = () => {
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
    return { container, root, canvas };
  };

  it('interprets keyboard length in millimeters', () => {
    const { container, root, canvas } = setup();
    const label = container.querySelector('div')!;

    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 50 }),
      );
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
    });

    expect(label.textContent).toBe('50 mm');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    const wall = usePlannerStore.getState().room.walls[0];
    const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    expect(len).toBeCloseTo(0.05);

    root.unmount();
    container.remove();
  });

  it('interprets keyboard length in centimeters', () => {
    usePlannerStore.setState({ measurementUnit: 'cm', selectedTool: 'wall' });
    const { container, root, canvas } = setup();
    const label = container.querySelector('div')!;

    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 50 }),
      );
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
    });

    expect(label.textContent).toBe('50 cm');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    const wall = usePlannerStore.getState().room.walls[0];
    const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    expect(len).toBeCloseTo(0.5);

    root.unmount();
    container.remove();
  });
});

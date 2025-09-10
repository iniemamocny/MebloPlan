// @vitest-environment jsdom
import { describe, it, beforeEach, expect, vi } from 'vitest';
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
import RoomDrawBoard from '../src/ui/build/RoomDrawBoard';
import { usePlannerStore } from '../src/state/store';

beforeEach(() => {
  (global as any).PointerEvent = MouseEvent;
  HTMLCanvasElement.prototype.getContext = () => ({
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    setLineDash: () => {},
    arc: () => {},
    fill: () => {},
  } as any);
  HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON() {},
  });
  HTMLCanvasElement.prototype.setPointerCapture = () => {};
  HTMLCanvasElement.prototype.releasePointerCapture = () => {};
  usePlannerStore.setState({
    room: { height: 2700, origin: { x: 0, y: 0 }, walls: [], windows: [], doors: [] },
    roomShape: { points: [], segments: [] },
    snapToGrid: false,
  });
});

const drawSegment = (
  canvas: HTMLCanvasElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  act(() => {
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: x1,
        clientY: y1,
        pointerId: 1,
      }),
    );
  });
  act(() => {
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: x2,
        clientY: y2,
        pointerId: 1,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: x2,
        clientY: y2,
        pointerId: 1,
      }),
    );
  });
};

describe('View synchronization', () => {
  it('updates room walls when drawing in 2D', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<RoomDrawBoard width={200} height={100} />));
    const canvas = container.querySelector('canvas')!;

    drawSegment(canvas, 10, 10, 110, 10);

    expect(usePlannerStore.getState().room.walls.length).toBe(1);
    root.unmount();
    container.remove();
  });

  it('reflects 3D wall additions in 2D view', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<RoomDrawBoard width={200} height={100} />));

    act(() => {
      usePlannerStore
        .getState()
        .setRoom({
          walls: [
            {
              id: 'w1',
              start: { x: 0, y: 0 },
              end: { x: 1, y: 0 },
              height: 2.7,
              thickness: 0.1,
            },
          ],
        });
    });

    expect(usePlannerStore.getState().roomShape.segments.length).toBe(1);
    root.unmount();
    container.remove();
  });
});

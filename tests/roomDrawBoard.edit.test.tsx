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

describe('RoomDrawBoard editing', () => {
  it('supports undo/redo for segments', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<RoomDrawBoard width={200} height={100} />));
    const canvas = container.querySelector('canvas')!;

    drawSegment(canvas, 10, 10, 110, 10);
    drawSegment(canvas, 20, 20, 20, 80);
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(2);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
    });
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
    });
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }));
    });
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }));
    });
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(2);

    root.unmount();
    container.remove();
  });

  it('allows moving existing points with grid snapping', () => {
    usePlannerStore.setState({ snapToGrid: true, gridSize: 50, roomShape: { points: [], segments: [] } });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<RoomDrawBoard width={200} height={100} />));
    const canvas = container.querySelector('canvas')!;

    drawSegment(canvas, 0, 0, 50, 0);

    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 0,
          clientY: 0,
          pointerId: 1,
        }),
      );
    });
    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 78,
          clientY: 83,
          pointerId: 1,
        }),
      );
      canvas.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          clientX: 78,
          clientY: 83,
          pointerId: 1,
        }),
      );
    });

    const pt = usePlannerStore.getState().roomShape.points[0];
    expect(pt.x).toBe(100);
    expect(pt.y).toBe(100);

    root.unmount();
    container.remove();
  });

  it('deletes selected segment', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<RoomDrawBoard width={200} height={100} />));
    const canvas = container.querySelector('canvas')!;

    drawSegment(canvas, 10, 10, 110, 10);
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(1);

    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 60,
          clientY: 10,
          pointerId: 1,
        }),
      );
    });
    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          clientX: 60,
          clientY: 10,
          pointerId: 1,
        }),
      );
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(0);

    root.unmount();
    container.remove();
  });
});

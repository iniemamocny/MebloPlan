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
  HTMLCanvasElement.prototype.getContext = () =>
    ({
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      setLineDash: () => {},
      arc: () => {},
      fill: () => {},
    }) as any;
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
    room: {
      height: 2700,
      origin: { x: 0, y: 0 },
      walls: [],
      windows: [],
      doors: [],
    },
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
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }),
      );
    });
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(1);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }),
      );
    });
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(0);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }),
      );
    });
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(1);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }),
      );
    });
    expect(usePlannerStore.getState().roomShape.segments.length).toBe(2);

    root.unmount();
    container.remove();
  });

  it('draws segment using keyboard only', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<RoomDrawBoard width={200} height={100} />));
    const canvas = container.querySelector('canvas')!;

    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 10,
          clientY: 10,
          pointerId: 1,
        }),
      );
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '°' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    const seg = usePlannerStore.getState().roomShape.segments[0];
    expect(seg.start.x).toBe(10);
    expect(seg.start.y).toBe(10);
    expect(seg.end.x).toBeCloseTo(10);
    expect(seg.end.y).toBeCloseTo(60);

    root.unmount();
    container.remove();
  });

  it('allows moving existing points with grid snapping', () => {
    usePlannerStore.setState({
      snapToGrid: true,
      gridSize: 50,
      roomShape: { points: [], segments: [] },
    });
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

  it('snaps segment length and angle', () => {
    usePlannerStore.setState({
      snapToGrid: false,
      snapLength: 50,
      snapAngle: 90,
      snapRightAngles: true,
      roomShape: { points: [], segments: [] },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<RoomDrawBoard width={200} height={100} />));
    const canvas = container.querySelector('canvas')!;

    drawSegment(canvas, 0, 0, 80, 10);
    drawSegment(canvas, 150, 0, 160, 40);
    const segments = usePlannerStore.getState().roomShape.segments;
    const len1 = Math.hypot(
      segments[0].end.x - segments[0].start.x,
      segments[0].end.y - segments[0].start.y,
    );
    const len2 = Math.hypot(
      segments[1].end.x - segments[1].start.x,
      segments[1].end.y - segments[1].start.y,
    );
    expect(len1).toBe(100);
    expect(segments[0].start.y).toBe(segments[0].end.y);
    expect(len2).toBe(50);
    expect(segments[1].start.x).toBe(segments[1].end.x);

    root.unmount();
    container.remove();
  });

  it('snaps to angle increments without right-angle mode', () => {
    usePlannerStore.setState({
      snapToGrid: false,
      snapLength: 10,
      snapAngle: 45,
      snapRightAngles: false,
      roomShape: { points: [], segments: [] },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<RoomDrawBoard width={200} height={100} />));
    const canvas = container.querySelector('canvas')!;

    drawSegment(canvas, 0, 0, 60, 40);
    const seg = usePlannerStore.getState().roomShape.segments[0];
    const len = Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y);
    expect(len).toBeCloseTo(70);
    expect(seg.end.x).toBeCloseTo(seg.end.y);

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

  it('merges points when moved onto another', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => root.render(<RoomDrawBoard width={200} height={100} />));
    const canvas = container.querySelector('canvas')!;

    drawSegment(canvas, 0, 0, 50, 0);
    drawSegment(canvas, 100, 0, 100, 50);

    expect(usePlannerStore.getState().roomShape.points.length).toBe(4);

    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 100,
          clientY: 50,
          pointerId: 1,
        }),
      );
    });
    act(() => {
      canvas.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 0,
          clientY: 0,
          pointerId: 1,
        }),
      );
      canvas.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          clientX: 0,
          clientY: 0,
          pointerId: 1,
        }),
      );
    });

    const shape = usePlannerStore.getState().roomShape;
    expect(shape.points.length).toBe(3);
    const p0 = shape.points.find((p) => p.x === 0 && p.y === 0)!;
    const p50 = shape.points.find((p) => p.x === 50 && p.y === 0)!;
    const p100 = shape.points.find((p) => p.x === 100 && p.y === 0)!;
    expect(p0).toBeDefined();
    expect(p50).toBeDefined();
    expect(p100).toBeDefined();
    expect(shape.segments).toHaveLength(2);
    expect(shape.segments[0].start).toBe(p0);
    expect(shape.segments[0].end).toBe(p50);
    expect(shape.segments[1].start).toBe(p100);
    expect(shape.segments[1].end).toBe(p0);

    root.unmount();
    container.remove();
  });
});

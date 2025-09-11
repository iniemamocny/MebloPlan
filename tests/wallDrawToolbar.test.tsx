// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (s: string) =>
      ({ drawWall: 'Draw wall', editWall: 'Edit wall', eraseWall: 'Erase wall' }[
        s
      ] || s),
  }),
}));

vi.mock('lucide-react', () => ({
  Pencil: () => null,
  Hammer: () => null,
  Eraser: () => null,
}));

import WallDrawToolbar from '../src/ui/components/WallDrawToolbar';
import { usePlannerStore } from '../src/state/store';

beforeAll(() => {
  (global as any).PointerEvent = MouseEvent;
});

describe('WallDrawToolbar', () => {
  it('toggles tools', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({ wallTool: 'draw', isRoomDrawing: true });

    act(() => {
      root.render(<WallDrawToolbar />);
    });

    const drawBtn = container.querySelector('button[aria-label="Draw wall"]');
    const eraseBtn = container.querySelector('button[aria-label="Erase wall"]');
    const editBtn = container.querySelector('button[aria-label="Edit wall"]');

    act(() => {
      eraseBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(usePlannerStore.getState().wallTool).toBe('erase');
    expect(usePlannerStore.getState().wallTool).not.toBe('draw');

    act(() => {
      editBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(usePlannerStore.getState().wallTool).toBe('edit');
    expect(usePlannerStore.getState().wallTool).not.toBe('erase');

    act(() => {
      drawBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(usePlannerStore.getState().wallTool).toBe('draw');
    expect(usePlannerStore.getState().wallTool).not.toBe('edit');

    root.unmount();
    container.remove();
  });

  it('erases walls and edits color via store actions', () => {
    usePlannerStore.setState({
      wallTool: 'draw',
      isRoomDrawing: true,
      room: {
        height: 2700,
        origin: { x: 0, y: 0 },
        walls: [
          {
            id: 'w1',
            start: { x: 0, y: 0 },
            end: { x: 1, y: 0 },
            height: 2,
            thickness: 0.1,
            color: '#ffffff',
          },
        ],
        windows: [],
        doors: [],
      },
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(<WallDrawToolbar />);
    });

    const eraseBtn = container.querySelector('button[aria-label="Erase wall"]');
    act(() => {
      eraseBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      usePlannerStore.getState().setRoom({ walls: [] });
    });
    expect(usePlannerStore.getState().room.walls.length).toBe(0);

    const editBtn = container.querySelector('button[aria-label="Edit wall"]');
    act(() => {
      editBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      usePlannerStore.getState().setRoom({
        walls: [
          {
            id: 'w1',
            start: { x: 0, y: 0 },
            end: { x: 1, y: 0 },
            height: 2,
            thickness: 0.1,
            color: '#ff0000',
          },
        ],
      });
    });
    expect(usePlannerStore.getState().room.walls[0].color).toBe('#ff0000');

    root.unmount();
    container.remove();
  });

  it('does not trigger wall placement when clicking toolbar buttons', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({ wallTool: 'draw', isRoomDrawing: true });

    act(() => {
      root.render(<WallDrawToolbar />);
    });

    const handler = vi.fn();
    document.addEventListener('pointerdown', handler);

    const drawBtn = container.querySelector('button[aria-label="Draw wall"]');
    act(() => {
      drawBtn?.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true })
      );
    });

    expect(handler).not.toHaveBeenCalled();

    document.removeEventListener('pointerdown', handler);
    root.unmount();
    container.remove();
  });
});

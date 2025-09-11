// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (s: string) =>
      ({
        drawWall: 'Draw wall',
        eraseWall: 'Erase wall',
        editWall: 'Edit wall',
      }[s] || s),
  }),
}));

vi.mock('lucide-react', () => ({
  Pencil: vi.fn(() => null),
  Eraser: vi.fn(() => null),
  Hammer: vi.fn(() => null),
}));

import { Pencil, Eraser, Hammer } from 'lucide-react';
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

    expect(Pencil).toHaveBeenCalled();
    expect(Eraser).toHaveBeenCalled();
    expect(Hammer).toHaveBeenCalled();
    expect(Pencil.mock.calls[0][0].size).toBe(16);
    expect(Eraser.mock.calls[0][0].size).toBe(16);
    expect(Hammer.mock.calls[0][0].size).toBe(16);
    expect(container.querySelectorAll('button').length).toBe(3);

    act(() => {
      editBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(usePlannerStore.getState().wallTool).toBe('edit');
    expect(usePlannerStore.getState().wallTool).not.toBe('draw');

    act(() => {
      eraseBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(usePlannerStore.getState().wallTool).toBe('erase');
    expect(usePlannerStore.getState().wallTool).not.toBe('edit');

    act(() => {
      drawBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(usePlannerStore.getState().wallTool).toBe('draw');
    expect(usePlannerStore.getState().wallTool).not.toBe('erase');

    root.unmount();
    container.remove();
  });

  it('edits wall color via store actions', () => {
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

// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';

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

    const eraseBtn = container.querySelector('button[data-tool="erase"]');
    act(() => {
      eraseBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(usePlannerStore.getState().wallTool).toBe('erase');

    const editBtn = container.querySelector('button[data-tool="edit"]');
    act(() => {
      editBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(usePlannerStore.getState().wallTool).toBe('edit');

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

    const eraseBtn = container.querySelector('button[data-tool="erase"]');
    act(() => {
      eraseBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      usePlannerStore.getState().setRoom({ walls: [] });
    });
    expect(usePlannerStore.getState().room.walls.length).toBe(0);

    const editBtn = container.querySelector('button[data-tool="edit"]');
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
});

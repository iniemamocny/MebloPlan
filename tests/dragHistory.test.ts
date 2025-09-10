import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '../src/state/store';

beforeEach(() => {
  usePlannerStore.setState({
    modules: [],
    items: [],
    past: [],
    future: [],
    room: {
      height: 2700,
      origin: { x: 0, y: 0 },
      walls: [
        { id: 'w1', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, thickness: 0.1 },
      ],
      windows: [],
      doors: [],
    },
    roomShape: { points: [], segments: [] },
  });
});

describe('drag history', () => {
  it('creates only one undo entry for a drag', () => {
    const { setRoom, undo } = usePlannerStore.getState();

    // simulate dragging wall endpoint several times
    setRoom(
      {
        walls: [
          { id: 'w1', start: { x: 0, y: 0 }, end: { x: 2, y: 0 }, thickness: 0.1 },
        ],
      },
      { pushHistory: false },
    );
    setRoom(
      {
        walls: [
          { id: 'w1', start: { x: 0, y: 0 }, end: { x: 3, y: 0 }, thickness: 0.1 },
        ],
      },
      { pushHistory: false },
    );
    setRoom(
      {
        walls: [
          { id: 'w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thickness: 0.1 },
        ],
      },
      { pushHistory: true },
    );

    expect(usePlannerStore.getState().past).toHaveLength(1);

    undo();

    const end = usePlannerStore.getState().room.walls[0].end.x;
    expect(end).toBe(3);
  });
});

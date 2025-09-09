import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '../src/state/store';

describe('item selectors', () => {
  beforeEach(() => {
    usePlannerStore.setState({ items: [] });
  });

  it('returns items by cabinet and surface', () => {
    const store = usePlannerStore;
    store.getState().addItem({
      id: 'a',
      type: 'cup',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      cabinetId: 'cab1',
      shelfIndex: 0,
    });
    store.getState().addItem({
      id: 'b',
      type: 'plate',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      cabinetId: 'cab1',
      shelfIndex: 1,
    });
    store.getState().addItem({
      id: 'c',
      type: 'cup',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      cabinetId: 'cab2',
      shelfIndex: 0,
    });
    const cabItems = store.getState().itemsByCabinet('cab1');
    expect(cabItems.map((i) => i.id).sort()).toEqual(['a', 'b']);
    const surfaceItems = store.getState().itemsBySurface('cab1', 0);
    expect(surfaceItems.length).toBe(1);
    expect(surfaceItems[0].id).toBe('a');
  });
});

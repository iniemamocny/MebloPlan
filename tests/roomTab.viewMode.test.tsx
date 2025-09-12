// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import RoomTab from '../src/ui/panels/RoomTab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../src/state/store', () => ({
  usePlannerStore: () => ({
    drawWalls: vi.fn(),
    selectWindow: vi.fn(),
    selectDoor: vi.fn(),
    insertOpening: vi.fn(),
    placeDropCeiling: vi.fn(),
  }),
}));

describe('RoomTab view toggle', () => {
  it('invokes toggleViewMode on button click', () => {
    const toggle = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(<RoomTab viewMode="2d" toggleViewMode={toggle} />);
    });
    const btn = container.querySelector('[data-testid="room-view-toggle"]') as HTMLButtonElement;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toggle).toHaveBeenCalled();

    root.unmount();
  });
});

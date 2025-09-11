// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import App from '../src/ui/App';
import { usePlannerStore } from '../src/state/store';

let toggleHandler: () => void;

vi.mock('../src/ui/TopBar', () => ({
  default: (props: any) => {
    toggleHandler = props.toggleViewMode;
    return <button data-testid="toggle-view" onClick={() => props.toggleViewMode()} />;
  },
}));

vi.mock('../src/ui/SceneViewer', () => ({ default: () => <div data-testid="scene-viewer" /> }));
vi.mock('../src/ui/MainTabs', () => ({ default: () => null }));
vi.mock('../src/ui/useCabinetConfig', () => ({
  default: () => ({
    widthMM: 0,
    setWidthMM: vi.fn(),
    gLocal: 0,
    setAdv: vi.fn(),
    onAdd: vi.fn(),
    initBlenda: vi.fn(),
    initSidePanel: vi.fn(),
  }),
}));
vi.mock('../src/ui/i18n', () => ({
  createTranslator: () => ({ t: (k: string) => k, i18n: { language: 'en', changeLanguage: vi.fn() } }),
}));
vi.mock('../src/utils/storage', () => ({ safeSetItem: vi.fn() }));
vi.mock('../src/core/catalog', () => ({ FAMILY: { BASE: 'base' }, Kind: {}, Variant: {} }));

describe('App view mode toggle', () => {
  it('finalizes drawing when switching from 2D to 3D', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const listener = vi.fn();
    window.addEventListener('pointermove', listener);
    window.addEventListener('pointerup', listener);
    window.addEventListener('keydown', listener);

    const finishDrawing = vi.fn(() => {
      window.removeEventListener('pointermove', listener);
      window.removeEventListener('pointerup', listener);
      window.removeEventListener('keydown', listener);
      usePlannerStore.setState({ isRoomDrawing: false, wallTool: 'edit', selectedTool: null });
    });

    usePlannerStore.setState({
      finishDrawing,
      isRoomDrawing: true,
      wallTool: 'draw',
      selectedTool: 'window',
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(<App />);
    });

    // switch to 2d
    act(() => {
      toggleHandler();
    });

    // switch back to 3d, which should finalize drawing
    act(() => {
      toggleHandler();
    });

    expect(finishDrawing).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith('pointermove', listener);
    expect(removeSpy).toHaveBeenCalledWith('pointerup', listener);
    expect(removeSpy).toHaveBeenCalledWith('keydown', listener);
    expect(usePlannerStore.getState().isRoomDrawing).toBe(false);
    expect(usePlannerStore.getState().selectedTool).toBeNull();

    root.unmount();
    container.remove();
    removeSpy.mockRestore();
  });
});

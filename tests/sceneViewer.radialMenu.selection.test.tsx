// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import SceneViewer from '../src/ui/SceneViewer';
import { usePlannerStore } from '../src/state/store';

let onSelect: ((slot: number) => void) | null = null;

vi.mock('../src/scene/engine', () => ({
  setupThree: () => {
    const dom = document.createElement('canvas');
    dom.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON() {},
    });
    return {
      scene: {},
      camera: { position: { y: 0 } },
      renderer: { domElement: dom },
      controls: { enabled: true, dollyIn: () => {}, dollyOut: () => {}, update: () => {} },
      playerControls: {
        lock: vi.fn(),
        unlock: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        isLocked: false,
      },
      group: { children: [], add: () => {}, remove: () => {} },
      cabinetDragger: { enable: vi.fn(), disable: vi.fn() },
    };
  },
}));

vi.mock('../src/ui/components/TouchJoystick', () => ({ default: () => null }));
vi.mock('../src/ui/build/RoomBuilder', () => ({ default: () => null }));

vi.mock('../src/ui/components/RadialMenu', () => ({
  default: (props: any) => {
    onSelect = props.onSelect;
    return null;
  },
}));

vi.mock('../src/ui/components/ItemHotbar', () => ({
  default: () => null,
  hotbarItems: ['window', 'door', 'cup', 'plate', 'bottle', null, null, null, null],
  buildHotbarItems: () => ['wall', 'window', 'door', 'cup', 'plate', 'bottle', null, null, null],
  furnishHotbarItems: ['chair', null, null, null, null, null, null, null, null],
}));

describe('SceneViewer radial menu selection', () => {
  it('updates slot and tool in build mode', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      usePlannerStore.setState({
        selectedItemSlot: 1,
        selectedTool: null,
        selectedWall: { thickness: 0.1 },
      });
      root.render(
        <SceneViewer threeRef={threeRef} addCountertop={false} mode="build" setMode={setMode} />,
      );
    });

    act(() => {
      onSelect!(2);
    });

    const state = usePlannerStore.getState();
    expect(state.selectedItemSlot).toBe(2);
    expect(state.selectedTool).toBe('window');

    root.unmount();
  });

  it('updates slot only in furnish mode', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      usePlannerStore.setState({ selectedItemSlot: 1, selectedTool: null });
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode="furnish"
          setMode={setMode}
        />,
      );
    });

    act(() => {
      onSelect!(1);
    });

    const state = usePlannerStore.getState();
    expect(state.selectedItemSlot).toBe(1);
    expect(state.selectedTool).toBe(null);

    root.unmount();
  });
});

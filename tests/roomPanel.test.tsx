// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
vi.mock('../src/utils/uuid', () => ({ default: () => 'test-uuid', uuid: () => 'test-uuid' }));
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import * as THREE from 'three';

import MainTabs from '../src/ui/MainTabs';
import RoomPanel from '../src/ui/panels/RoomPanel';
import { FAMILY } from '../src/core/catalog';
import { usePlannerStore } from '../src/state/store';

beforeAll(() => {
  // jsdom does not implement canvas context; provide a minimal stub
  // so RoomDrawBoard can render without throwing.
  (global as any).PointerEvent = MouseEvent;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    // fields used by draw board
  } as any));
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

vi.mock('../src/scene/engine', () => {
  return {
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
      const camera = new THREE.PerspectiveCamera();
      const group: any = {
        children: [],
        add: (obj: any) => group.children.push(obj),
        remove: (obj: any) => {
          group.children = group.children.filter((o: any) => o !== obj);
        },
      };
      return {
        scene: {},
        camera,
        renderer: { domElement: dom },
        controls: { enabled: true, update: () => {}, enableRotate: true },
        playerControls: {
          lock: vi.fn(),
          unlock: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          isLocked: false,
        },
        group,
        cabinetDragger: { enable: vi.fn(), disable: vi.fn() },
      };
    },
  };
});

vi.mock('../src/ui/components/ItemHotbar', () => ({
  default: () => null,
  hotbarItems: [],
  buildHotbarItems: () => ['wall'],
  furnishHotbarItems: [],
}));

vi.mock('../src/ui/components/TouchJoystick', () => ({ default: () => null }));
vi.mock('../src/ui/build/RoomBuilder', () => ({ default: () => null }));
vi.mock('../src/ui/components/RadialMenu', () => ({ default: () => null }));
vi.mock('../src/ui/components/WallToolSelector', () => ({ default: () => null }));

describe('Room features', () => {
  it('renders Room tab in main tabs', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(
        <MainTabs
          t={(s: string) => s}
          tab={null}
          setTab={() => {}}
          family={FAMILY.BASE}
          setFamily={() => {}}
          kind={null}
          setKind={() => {}}
          variant={null}
          setVariant={() => {}}
          widthMM={0}
          setWidthMM={() => {}}
          gLocal={{}}
          setAdv={() => {}}
          onAdd={() => {}}
          initBlenda={() => {}}
          initSidePanel={() => {}}
          boardL={0}
          setBoardL={() => {}}
          boardW={0}
          setBoardW={() => {}}
          boardKerf={0}
          setBoardKerf={() => {}}
          boardHasGrain={false}
          setBoardHasGrain={() => {}}
          addCountertop={false}
          setAddCountertop={() => {}}
          threeRef={{ current: null }}
          setMode={() => {}}
          startMode="build"
          setStartMode={() => {}}
        />,
      );
    });

    expect(container.textContent).toContain('app.tabs.room');

    root.unmount();
    container.remove();
  });

  it('clamps wall thickness slider between 8 and 25 cm', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({
      room: { height: 2700, origin: { x: 0, y: 0 }, walls: [], windows: [], doors: [] },
      selectedWall: { thickness: 0.1 },
    });

    act(() => {
      root.render(<RoomPanel />);
    });

    const header = container.querySelector('.section .hd');
    act(() => {
      header?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider.min).toBe('0.08');
    expect(slider.max).toBe('0.25');

    const setThickness = usePlannerStore.getState().setSelectedWallThickness;
    act(() => setThickness(0.05));
    expect(usePlannerStore.getState().selectedWall?.thickness).toBe(0.08);

    act(() => setThickness(0.3));
    expect(usePlannerStore.getState().selectedWall?.thickness).toBe(0.25);

    act(() => setThickness(0.2));
    expect(usePlannerStore.getState().selectedWall?.thickness).toBe(0.2);

    root.unmount();
    container.remove();
  });

  it('activates 2D view after clicking draw', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({
      room: { height: 2700, origin: { x: 0, y: 0 }, walls: [], windows: [], doors: [] },
      selectedWall: { thickness: 0.1 },
      isRoomDrawing: false,
      selectedTool: null,
    });

    act(() => {
      root.render(<RoomPanel />);
    });

    const header = container.querySelector('.section .hd');
    act(() => {
      header?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'room.draw',
    );
    act(() => {
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(usePlannerStore.getState().isRoomDrawing).toBe(true);
    expect(usePlannerStore.getState().selectedTool).toBe('wall');
    expect(container.textContent).toContain('room.board2D');
    expect(container.querySelector('canvas')).toBeTruthy();

    root.unmount();
    container.remove();
  });

  it('saves room and exits drawing when closing', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({
      room: {
        height: 2700,
        origin: { x: 0, y: 0 },
        walls: [],
        windows: [],
        doors: [],
      },
      roomShape: {
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        segments: [{ start: { x: 0, y: 0 }, end: { x: 1, y: 0 } }],
      },
      selectedWall: { thickness: 0.1 },
      isRoomDrawing: true,
    });

    act(() => {
      root.render(<RoomPanel />);
    });

    const btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'room.close',
    );
    act(() => {
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const state = usePlannerStore.getState();
    expect(state.isRoomDrawing).toBe(false);
    expect(state.room.walls.length).toBe(1);
    expect(state.room.walls[0].id).toBe('test-uuid');

    root.unmount();
    container.remove();
  });

  it('draws wall and saves it for 3D scene', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    usePlannerStore.setState({
      room: { height: 2700, origin: { x: 0, y: 0 }, walls: [], windows: [], doors: [] },
      selectedWall: { thickness: 0.1 },
      roomShape: {
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        segments: [{ start: { x: 0, y: 0 }, end: { x: 1, y: 0 } }],
      },
      isRoomDrawing: true,
    });

    act(() => {
      root.render(<RoomPanel />);
    });

    const closeBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'room.close',
    );
    act(() => {
      closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const state = usePlannerStore.getState();
    expect(state.room.walls.length).toBe(1);
    expect(state.room.walls[0].id).toBe('test-uuid');

    root.unmount();
    container.remove();
  });
});


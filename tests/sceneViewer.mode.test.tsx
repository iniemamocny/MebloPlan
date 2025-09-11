// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import SceneViewer from '../src/ui/SceneViewer';
import { usePlannerStore } from '../src/state/store';
import { PlayerMode, PLAYER_MODES } from '../src/ui/types';

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    target: new THREE.Vector3(),
    enableRotate: true,
    update: vi.fn(),
    dispose: vi.fn(),
  })),
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
      const perspectiveCamera = new THREE.PerspectiveCamera();
      const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      const three: any = {
        scene: {},
        camera: perspectiveCamera,
        renderer: { domElement: dom },
        controls: {
          enabled: true,
          target: new THREE.Vector3(),
          enableRotate: true,
          update: () => {},
          dispose: () => {},
          dollyIn: () => {},
          dollyOut: () => {},
        },
        playerControls: {
          lock: vi.fn(),
          unlock: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          isLocked: false,
        },
        group: { children: [], add: () => {}, remove: () => {} },
        cabinetDragger: { enable: vi.fn(), disable: vi.fn() },
        perspectiveCamera,
        orthographicCamera,
      };
      three.setCamera = (cam: THREE.Camera) => {
        three.camera = cam;
      };
      three.setControls = (c: any) => {
        three.controls = c;
      };
      return three;
    },
  };
});

vi.mock('../src/ui/components/ItemHotbar', () => ({
  default: (props: any) => <div data-testid="item-hotbar" data-mode={props.mode}></div>,
  hotbarItems: [],
  furnishHotbarItems: [],
}));
vi.mock('../src/ui/components/TouchJoystick', () => ({ default: () => null }));

describe('SceneViewer hotbar visibility', () => {
  it('renders hotbar only when mode is not null', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode={null}
          setMode={setMode}
        />, 
      );
    });
    expect(container.querySelector('[data-testid="item-hotbar"]')).toBeNull();

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode="furnish"
          setMode={setMode}
        />,
      );
    });
    expect(container.querySelector('[data-testid="item-hotbar"]')).not.toBeNull();

    root.unmount();
  });
});

describe('SceneViewer cabinetDragger mode control', () => {
  it('enables cabinetDragger only in furnish mode', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(<SceneViewer threeRef={threeRef} addCountertop={false} mode={null} setMode={setMode} />);
    });
    const dragger = threeRef.current.cabinetDragger;
    expect(dragger.enable).not.toHaveBeenCalled();
    expect(dragger.disable).toHaveBeenCalled();

    act(() => {
      root.render(<SceneViewer threeRef={threeRef} addCountertop={false} mode="furnish" setMode={setMode} />);
    });
    expect(dragger.enable).toHaveBeenCalled();

    const before = dragger.disable.mock.calls.length;
    act(() => {
      root.render(<SceneViewer threeRef={threeRef} addCountertop={false} mode="decorate" setMode={setMode} />);
    });
    expect(dragger.disable.mock.calls.length).toBeGreaterThan(before);

    root.unmount();
  });
});

describe('SceneViewer Tab key', () => {
  it('does nothing when mode is null', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(
        <SceneViewer threeRef={threeRef} addCountertop={false} mode={null} setMode={setMode} />
      );
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    });
    expect(setMode).not.toHaveBeenCalled();

    root.unmount();
  });

  it('cycles through modes when active', () => {
    const threeRef: any = { current: null };
    let mode: PlayerMode = PLAYER_MODES[0];
    const setMode = vi.fn((updater: any) => {
      mode = typeof updater === 'function' ? updater(mode) : updater;
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(
        <SceneViewer threeRef={threeRef} addCountertop={false} mode={mode} setMode={setMode} />
      );
    });

    const expected: PlayerMode[] = PLAYER_MODES.slice(1).concat(PLAYER_MODES[0]);
    for (const exp of expected) {
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      });
      expect(mode).toBe(exp);
    }

    root.unmount();
  });
});

describe('SceneViewer hotbar keys', () => {
  it('does not change selectedItemSlot when mode is null', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      usePlannerStore.setState({ selectedItemSlot: 5 });
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode={null}
          setMode={setMode}
        />,
      );
    });

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = 0; i < keys.length; i++) {
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: keys[i] }));
      });
      expect(usePlannerStore.getState().selectedItemSlot).toBe(5);
    }

    root.unmount();
  });

  it('changes selectedItemSlot when mode is active', () => {
    const threeRef: any = { current: null };
    const setMode = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    const modes = PLAYER_MODES;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (const m of modes) {
      act(() => {
        usePlannerStore.setState({ selectedItemSlot: 5 });
        root.render(
          <SceneViewer
            threeRef={threeRef}
            addCountertop={false}
            mode={m}
            setMode={setMode}
          />,
        );
      });
      for (let i = 0; i < keys.length; i++) {
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: keys[i] }));
        });
        expect(usePlannerStore.getState().selectedItemSlot).toBe(i + 1);
      }
    }

    root.unmount();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import SceneViewer from '../src/ui/SceneViewer';
import PlayPanel from '../src/ui/panels/PlayPanel';
import { PlayerMode, PlayerSubMode } from '../src/ui/types';

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
      const events: Record<string, Array<() => void>> = {};
      const playerControls: any = {
        lock: vi.fn(),
        unlock: vi.fn(),
        addEventListener: vi.fn((e: string, cb: () => void) => {
          events[e] = events[e] || [];
          events[e].push(cb);
        }),
        removeEventListener: vi.fn((e: string, cb: () => void) => {
          events[e] = (events[e] || []).filter((fn) => fn !== cb);
        }),
        dispatch: (e: string) => {
          (events[e] || []).forEach((fn) => fn());
        },
        isLocked: false,
      };
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
        playerControls,
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

const t = (s: string) => s;

describe('pointer lock handling', () => {
  const threeRef: any = { current: null };
  let mode: PlayerMode = null;
  const setMode = vi.fn((v: any) => {
    mode = typeof v === 'function' ? v(mode) : v;
  });
  let startMode: PlayerSubMode = 'furnish';
  const setStartMode = (v: PlayerSubMode) => {
    startMode = v;
  };
  let container: HTMLDivElement;
  let root: ReactDOM.Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    vi.clearAllMocks();
    mode = null;
  });

  it('enters and exits play mode when pointer lock supported', () => {
    Object.defineProperty(document, 'pointerLockElement', { value: null, configurable: true });

    act(() => {
      root.render(
        <>
          <SceneViewer
            threeRef={threeRef}
            addCountertop={false}
            mode={mode}
            setMode={setMode}
            startMode={'furnish'}
            viewMode="3d"
            setViewMode={() => {}}
          />
          <PlayPanel
            threeRef={threeRef}
            t={t}
            setMode={setMode}
            startMode={startMode}
            setStartMode={setStartMode}
            onClose={() => {}}
          />
        </>
      );
    });

    const btn = container.querySelector('[data-testid="enter-play-mode"]') as HTMLButtonElement;
    act(() => {
      btn.click();
    });
    expect(threeRef.current.playerControls.lock).toHaveBeenCalled();
    expect(mode).toBe('furnish');

    act(() => {
      threeRef.current.playerControls.dispatch('unlock');
    });
    expect(mode).toBeNull();

    delete (document as any).pointerLockElement;
  });

  it('shows message when pointer lock unsupported', () => {
    act(() => {
      root.render(
        <>
          <SceneViewer
            threeRef={threeRef}
            addCountertop={false}
            mode={mode}
            setMode={setMode}
            startMode={'furnish'}
            viewMode="3d"
            setViewMode={() => {}}
          />
          <PlayPanel
            threeRef={threeRef}
            t={t}
            setMode={setMode}
            startMode={startMode}
            setStartMode={setStartMode}
            onClose={() => {}}
          />
        </>
      );
    });

    const btn = container.querySelector('[data-testid="enter-play-mode"]') as HTMLButtonElement;
    act(() => {
      btn.click();
    });
    expect(threeRef.current.playerControls.lock).not.toHaveBeenCalled();
    const err = container.querySelector('[data-testid="pointerlock-error"]');
    expect(err).not.toBeNull();
  });
});

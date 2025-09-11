// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import SceneViewer from '../src/ui/SceneViewer';

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    target: new THREE.Vector3(),
    enableRotate: true,
    update: vi.fn(),
    dispose: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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

describe('SceneViewer view mode', () => {
  it('uses orthographic camera in 2d mode', () => {
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
          mode="build"
          setMode={setMode}
          viewMode="2d"
        />,
      );
    });

    expect(threeRef.current.camera).toBe(threeRef.current.orthographicCamera);
    expect(threeRef.current.controls.enableRotate).toBe(false);

    act(() => {
      root.render(
        <SceneViewer
          threeRef={threeRef}
          addCountertop={false}
          mode="build"
          setMode={setMode}
          viewMode="3d"
        />,
      );
    });

    expect(threeRef.current.camera).toBe(threeRef.current.perspectiveCamera);
    expect(threeRef.current.controls.enableRotate).toBe(true);

    root.unmount();
  });
});

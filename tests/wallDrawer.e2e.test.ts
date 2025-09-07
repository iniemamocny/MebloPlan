// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import WallDrawer from '../src/viewer/WallDrawer';

describe('WallDrawer click without drag', () => {
  it('cleans up preview and resets state', () => {
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const store = {
      getState: () => ({
        addWall: vi.fn(),
        wallThickness: 100,
        wallType: 'dzialowa',
        snapAngle: 0,
        snapLength: 0,
        snapRightAngles: true,
        angleToPrev: 0,
        room: { walls: [] },
        setRoom: vi.fn(),
      }),
    } as any;

    const drawer = new WallDrawer(renderer, getCamera, scene, store, () => {}, () => {});
    (drawer as any).getPoint = () => new THREE.Vector3(0, 0, 0);

    const down = { clientX: 0, clientY: 0 } as PointerEvent;
    (drawer as any).onDown(down);
    expect((drawer as any).preview).not.toBeNull();

    const up = { clientX: 0, clientY: 0, detail: 1 } as PointerEvent;
    (drawer as any).onUp(up);

    expect((drawer as any).preview).toBeNull();
    expect((drawer as any).start).toBeNull();
  });
});

describe('WallDrawer.applyLength', () => {
  it('ignores non-positive lengths', () => {
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({
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
    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;
    const scene = new THREE.Scene();
    const addWall = vi.fn();
    const store = {
      getState: () => ({
        addWall,
        wallThickness: 100,
        wallType: 'dzialowa',
        snapAngle: 0,
        snapLength: 0,
        snapRightAngles: true,
        angleToPrev: 0,
        room: { walls: [] },
        setRoom: vi.fn(),
      }),
    } as any;

    const drawer = new WallDrawer(renderer, getCamera, scene, store, () => {}, () => {});
    // initialise start and preview to allow applyLength to proceed
    (drawer as any).start = new THREE.Vector3();
    (drawer as any).preview = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial(),
    );

    drawer.applyLength(0);
    drawer.applyLength(-50);

    expect(addWall).not.toHaveBeenCalled();
  });
});

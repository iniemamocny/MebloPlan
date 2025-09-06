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
        setDraftWall: vi.fn(),
      }),
    } as any;

    const drawer = new WallDrawer(renderer, getCamera, scene, store, () => {});
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

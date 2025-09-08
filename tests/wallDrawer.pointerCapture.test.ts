// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import WallDrawer from '../src/viewer/WallDrawer';

describe('WallDrawer pointer capture', () => {
  it('resets when pointerup happens outside the canvas', () => {
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
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();

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
        defaultSquareAngle: 0,
        room: { walls: [] },
        setRoom: vi.fn(),
      }),
    } as any;

    const drawer = new WallDrawer(
      renderer,
      getCamera,
      scene,
      store,
      () => {},
      () => {},
    );
    (drawer as any).active = true;
    (drawer as any).getPoint = vi.fn(() => new THREE.Vector3(0, 0, 0));
    const down = {
      clientX: 0,
      clientY: 0,
      pointerId: 1,
      button: 0,
    } as PointerEvent;
    (drawer as any).onDown(down);
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(1);
    expect((drawer as any).start).not.toBeNull();

    // Simulate moving outside so getPoint returns null on up
    (drawer as any).getPoint = vi.fn(() => null);
    const disableSpy = vi.spyOn(drawer as any, 'disable');

    const up = {
      clientX: 200,
      clientY: 200,
      pointerId: 1,
      button: 0,
    } as PointerEvent;
    (drawer as any).onUp(up);

    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(disableSpy).toHaveBeenCalled();
    expect((drawer as any).start).toBeNull();
  });
});


// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import CabinetDragger from '../src/viewer/CabinetDragger';
import type { Module3D } from '../src/types';

describe('CabinetDragger pointer capture', () => {
  it('releases capture and resets state when pointerup occurs outside canvas', () => {
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

    const group = new THREE.Group();
    const obj = new THREE.Object3D();
    obj.userData.kind = 'cab';
    group.add(obj);

    const module = { id: '1', position: [0, 0, 0] } as Module3D;
    const store = {
      getState: () => ({
        modules: [module],
        updateModule: vi.fn(),
      }),
    } as any;

    const dragger = new CabinetDragger(renderer, getCamera, group, store);

    // Pretend the raycaster hits our object
    (dragger as any).raycaster.intersectObjects = () => [{ object: obj }];
    (dragger as any).getPoint = () => new THREE.Vector3(0, 0, 0);

    const down = {
      clientX: 0,
      clientY: 0,
      pointerId: 1,
      button: 0,
    } as PointerEvent;
    (dragger as any).onDown(down);
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(1);
    expect((dragger as any).draggingId).toBe('1');

    const up = {
      clientX: 200,
      clientY: 200,
      pointerId: 1,
      button: 0,
    } as PointerEvent;
    (dragger as any).onUp(up);
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(1);
    expect((dragger as any).draggingId).toBeNull();
  });

  it('updates module position along XZ plane when dragging', () => {
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

    const renderer = { domElement: canvas } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    const getCamera = () => camera;

    const group = new THREE.Group();
    const obj = new THREE.Object3D();
    obj.userData.kind = 'cab';
    group.add(obj);

    const module = { id: '1', position: [0, 0, 5] } as Module3D;
    const updateModule = vi.fn();
    const store = {
      getState: () => ({
        modules: [module],
        updateModule,
      }),
    } as any;

    const dragger = new CabinetDragger(renderer, getCamera, group, store);

    (dragger as any).raycaster.intersectObjects = () => [{ object: obj }];

    (dragger as any).getPoint = () => new THREE.Vector3(0, 0, 5);
    const down = {
      clientX: 0,
      clientY: 0,
      pointerId: 1,
      button: 0,
    } as PointerEvent;
    (dragger as any).onDown(down);

    (dragger as any).getPoint = () => new THREE.Vector3(10, 0, 20);
    const move = {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    } as PointerEvent;
    (dragger as any).onMove(move);

    expect(updateModule).toHaveBeenCalledWith('1', {
      position: [10, 0, 20],
    });
  });
});


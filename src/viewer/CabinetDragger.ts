import * as THREE from 'three';
import type { WebGLRenderer, Camera } from 'three';
import type { UseBoundStore, StoreApi } from 'zustand';
import { usePlannerStore } from '../state/store';
import type { Module3D } from '../types';
import { convertAxis, screenAxes, worldAxes } from '../utils/coordinateSystem';

interface PlannerStore {
  modules: Module3D[];
  updateModule: (id: string, patch: Partial<Module3D>) => void;
}

export default class CabinetDragger {
  private renderer: WebGLRenderer;
  private getCamera: () => Camera;
  private group: THREE.Group;
  private store: UseBoundStore<StoreApi<PlannerStore>>;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private draggingId: string | null = null;
  private offset = new THREE.Vector3();

  constructor(
    renderer: WebGLRenderer,
    getCamera: () => Camera,
    group: THREE.Group,
    store: typeof usePlannerStore,
  ) {
    this.renderer = renderer;
    this.getCamera = getCamera;
    this.group = group;
    this.store = store;
  }

  enable() {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onDown);
    dom.addEventListener('pointermove', this.onMove);
    dom.addEventListener('pointerup', this.onUp);
  }

  disable() {
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onDown);
    dom.removeEventListener('pointermove', this.onMove);
    dom.removeEventListener('pointerup', this.onUp);
    this.draggingId = null;
  }

  private getPoint(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const yScreen = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const y = convertAxis(yScreen, screenAxes, 'y', worldAxes, 'z');
    const cam = this.getCamera();
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
    const point = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, point);
    return point;
  }

  private onDown = (e: PointerEvent) => {
    this.renderer.domElement.setPointerCapture(e.pointerId);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const yScreen = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const y = convertAxis(yScreen, screenAxes, 'y', worldAxes, 'z');
    const cam = this.getCamera();
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
    const intersects = this.raycaster.intersectObjects(this.group.children, true);
    if (intersects.length === 0) return;
    let obj: THREE.Object3D | null = intersects[0].object;
    while (obj && obj.parent !== this.group) {
      obj = obj.parent;
    }
    if (!obj || obj.parent !== this.group) return;
    if (obj.userData.kind !== 'cab') return;
    const cabinets = this.group.children.filter((c) => c.userData.kind === 'cab');
    const index = cabinets.indexOf(obj);
    const mods = this.store.getState().modules;
    const mod = mods[index];
    if (!mod) return;
    const point = this.getPoint(e);
    if (!point) return;
    this.draggingId = mod.id;
    const pointXZ = new THREE.Vector3(point.x, point.z, 0);
    this.offset.set(mod.position[0], mod.position[2], 0).sub(pointXZ);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.draggingId) return;
    const point = this.getPoint(e);
    if (!point) return;
    const mods = this.store.getState().modules;
    const current = mods.find((m) => m.id === this.draggingId);
    if (!current) return;
    const newX = point.x + this.offset.x;
    const newZ = point.z + this.offset.y;
    this.store.getState().updateModule(this.draggingId, {
      position: [newX, current.position[1], newZ],
    });
  };

  private onUp = (e: PointerEvent) => {
    this.renderer.domElement.releasePointerCapture(e.pointerId);
    this.draggingId = null;
  };
}


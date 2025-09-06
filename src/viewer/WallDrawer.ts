import * as THREE from 'three';
import type { WebGLRenderer, Camera } from 'three';
import type { UseBoundStore, StoreApi } from 'zustand';
import { usePlannerStore } from '../state/store';

interface PlannerStore {
  addWall: (w: { length: number; angle: number }) => void;
}

export default class WallDrawer {
  private renderer: WebGLRenderer;
  private getCamera: () => Camera;
  private store: UseBoundStore<StoreApi<PlannerStore>>;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private start: THREE.Vector3 | null = null;

  constructor(
    renderer: WebGLRenderer,
    getCamera: () => Camera,
    store: typeof usePlannerStore,
  ) {
    this.renderer = renderer;
    this.getCamera = getCamera;
    this.store = store;
  }

  enable() {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onDown);
    dom.addEventListener('pointerup', this.onUp);
  }

  disable() {
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onDown);
    dom.removeEventListener('pointerup', this.onUp);
    this.start = null;
  }

  private getPoint(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const cam = this.getCamera();
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
    const point = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, point);
    return point;
  }

  private onDown = (e: PointerEvent) => {
    this.start = this.getPoint(e);
  };

  private onUp = (e: PointerEvent) => {
    if (!this.start) return;
    const end = this.getPoint(e);
    if (!end) {
      this.start = null;
      return;
    }
    const dx = end.x - this.start.x;
    const dz = end.z - this.start.z;
    const length = Math.sqrt(dx * dx + dz * dz) * 1000; // meters to mm
    const angle = (Math.atan2(dz, dx) * 180) / Math.PI;
    this.store.getState().addWall({ length, angle });
    this.start = null;
  };
}

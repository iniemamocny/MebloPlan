import * as THREE from 'three';
import type { WebGLRenderer, Camera } from 'three';
import type { UseBoundStore, StoreApi } from 'zustand';
import { usePlannerStore } from '../state/store';
import type { ShapePoint } from '../types';

interface PlannerStore {
  snapToGrid: boolean;
  snapLength: number;
  wallDefaults: { height: number; thickness: number };
  addWallSegment: (start: ShapePoint, end: ShapePoint) => void;
}

export default class WallDrawer {
  private renderer: WebGLRenderer;
  private getCamera: () => Camera;
  private group: THREE.Group;
  private store: UseBoundStore<StoreApi<PlannerStore>>;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private cursor: THREE.Mesh | null = null;
  private start: THREE.Vector3 | null = null;
  private preview: THREE.Mesh | null = null;
  private thickness = 0.1;

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

  enable(thickness: number) {
    this.thickness = thickness / 1000;
    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this.onMove);
    dom.addEventListener('pointerdown', this.onDown);
    dom.addEventListener('pointerup', this.onUp);
    this.addCursor();
  }

  disable() {
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.onMove);
    dom.removeEventListener('pointerdown', this.onDown);
    dom.removeEventListener('pointerup', this.onUp);
    this.removeCursor();
    this.disposePreview();
    this.start = null;
  }

  private addCursor() {
    this.removeCursor();
    const geom = new THREE.PlaneGeometry(this.thickness, this.thickness);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    this.cursor = new THREE.Mesh(geom, mat);
    this.cursor.position.set(0, 0, 0.001);
    this.group.add(this.cursor);
  }

  private removeCursor() {
    if (!this.cursor) return;
    this.group.remove(this.cursor);
    this.cursor.geometry.dispose();
    (this.cursor.material as THREE.Material).dispose();
    this.cursor = null;
  }

  private disposePreview() {
    if (!this.preview) return;
    this.group.remove(this.preview);
    this.preview.geometry.dispose();
    (this.preview.material as THREE.Material).dispose();
    this.preview = null;
  }

  private getPoint(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const cam = this.getCamera();
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
    const point = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, point);
    if (!isFinite(point.x) || !isFinite(point.y)) return null;
    const state = this.store.getState();
    let px = point.x;
    let py = point.y;
    if (state.snapToGrid) {
      const step = state.snapLength / 1000;
      px = Math.round(px / step) * step;
      py = Math.round(py / step) * step;
    }
    return new THREE.Vector3(px, py, 0);
  }

  private onMove = (e: PointerEvent) => {
    const point = this.getPoint(e);
    if (!point) return;
    if (this.cursor) {
      this.cursor.position.lerp(point, 0.2);
    }
    if (this.start && this.preview) {
      const dx = point.x - this.start.x;
      const dy = point.y - this.start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.preview.scale.x = dist;
      const midX = (this.start.x + point.x) / 2;
      const midY = (this.start.y + point.y) / 2;
      this.preview.position.set(midX, midY, this.preview.position.z);
      this.preview.rotation.z = Math.atan2(dy, dx);
    }
  };

  private onDown = (e: PointerEvent) => {
    const point = this.getPoint(e);
    if (!point) return;
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.start = point.clone();
    const state = this.store.getState();
    const height = state.wallDefaults.height / 1000;
    const geom = new THREE.BoxGeometry(1, this.thickness, height);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.5,
    });
    this.preview = new THREE.Mesh(geom, mat);
    this.preview.position.set(point.x, point.y, height / 2);
    this.preview.scale.set(0.0001, 1, 1);
    this.group.add(this.preview);
  };

  private onUp = (e: PointerEvent) => {
    this.renderer.domElement.releasePointerCapture(e.pointerId);
    if (!this.start) return;
    const point = this.getPoint(e);
    if (!point) {
      this.start = null;
      this.disposePreview();
      return;
    }
    const start = { x: this.start.x, y: this.start.y };
    const end = { x: point.x, y: point.y };
    this.store.getState().addWallSegment(start, end);
    this.start = null;
    this.disposePreview();
    if (this.cursor) {
      this.cursor.position.set(point.x, point.y, this.cursor.position.z);
    }
  };
}


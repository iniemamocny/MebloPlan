import * as THREE from 'three';
import type { WebGLRenderer, Camera } from 'three';
import type { UseBoundStore, StoreApi } from 'zustand';
import { usePlannerStore } from '../state/store';
import type { ShapePoint } from '../types';

interface PlannerStore {
  snapToGrid: boolean;
  snapLength: number;
  wallDefaults: { height: number; thickness: number };
  addWallWithHistory: (start: ShapePoint, end: ShapePoint) => void;
}

export default class WallDrawer {
  private renderer: WebGLRenderer;
  private getCamera: () => Camera;
  private group: THREE.Group;
  private store: UseBoundStore<StoreApi<PlannerStore>>;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private cursor: THREE.Mesh | null = null;
  private cursorTarget: THREE.Vector3 | null = null;
  private animationId: number | null = null;
  private start: THREE.Vector3 | null = null;
  private preview: THREE.Mesh | null = null;
  private dragging = false;
  private lastPoint: THREE.Vector3 | null = null;
  private pointerId: number | null = null;
  private thickness = 0.1;
  private enabled = false;

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
    if (this.enabled) return;
    this.enabled = true;
    this.thickness = thickness / 1000;
    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this.onMove);
    dom.addEventListener('pointerdown', this.onDown);
    dom.addEventListener('pointerup', this.onUp);
    window.addEventListener('keydown', this.onKeyDown);
    this.addCursor();
    this.animationId = requestAnimationFrame(this.animateCursor);
  }

  disable() {
    if (!this.enabled) return;
    if (this.pointerId !== null) {
      this.renderer.domElement.releasePointerCapture(this.pointerId);
      this.pointerId = null;
    }
    this.enabled = false;
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.onMove);
    dom.removeEventListener('pointerdown', this.onDown);
    dom.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.removeCursor();
    this.disposePreview();
    this.start = null;
    this.lastPoint = null;
    this.dragging = false;
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
    this.cursor.rotation.x = -Math.PI / 2;
    this.cursor.position.set(0, 0.001, 0);
    this.cursorTarget = this.cursor.position.clone();
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
    const mesh = this.preview;
    // prevent any further intersections
    mesh.visible = false;
    mesh.raycast = () => null;
    this.group.remove(mesh);
    const geom = mesh.geometry;
    const mat = mesh.material as THREE.Material;
    queueMicrotask(() => {
      geom.dispose();
      mat.dispose();
    });
    this.preview = null;
  }

  private getPoint(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const cam = this.getCamera();
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
    const point = new THREE.Vector3();
    const intersection = this.raycaster.ray.intersectPlane(this.plane, point);
    if (!intersection) return null;
    if (!isFinite(intersection.x) || !isFinite(intersection.z)) return null;
    const state = this.store.getState();
    let px = intersection.x;
    let py = intersection.z;
    if (state.snapToGrid) {
      const step = state.snapLength / 1000;
      px = Math.round(px / step) * step;
      py = Math.round(py / step) * step;
    }
    return new THREE.Vector3(px, 0, py);
  }

  private onMove = (e: PointerEvent) => {
    const point = this.getPoint(e);
    if (!point) return;
    this.lastPoint = point;
    this.cursorTarget = point.clone();
    if (this.dragging && this.start && this.preview) {
      const dx = point.x - this.start.x;
      const dz = point.z - this.start.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      this.preview.scale.x = dist;
      const midX = (this.start.x + point.x) / 2;
      const midZ = (this.start.z + point.z) / 2;
      this.preview.position.set(midX, this.preview.position.y, midZ);
      this.preview.rotation.y = Math.atan2(dz, dx);
      const geometry = this.preview.geometry as THREE.BufferGeometry;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometry.computeVertexNormals();
    }
  };

  private onDown = (e: PointerEvent) => {
    const point = this.getPoint(e);
    if (!point) return;
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.pointerId = e.pointerId;
    this.dragging = true;
    this.start = point.clone();
    const state = this.store.getState();
    const height = state.wallDefaults.height / 1000;
    const geom = new THREE.BoxGeometry(1, height, this.thickness);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.5,
    });
    this.preview = new THREE.Mesh(geom, mat);
    this.preview.position.set(point.x, height / 2, point.z);
    this.preview.scale.set(0.0001, 1, 1);
    this.group.add(this.preview);
  };

  private onUp = (e: PointerEvent) => {
    this.renderer.domElement.releasePointerCapture(e.pointerId);
    this.pointerId = null;
    if (!this.dragging) return;
    this.dragging = false;
    if (!this.start) return;
    const point = this.getPoint(e);
    if (!point) {
      this.start = null;
      this.disposePreview();
      return;
    }
    const state = this.store.getState();
    let endX = point.x;
    let endZ = point.z;
    const dx = endX - this.start.x;
    const dz = endZ - this.start.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.001) {
      const step = state.snapLength / 1000;
      let dirX = dx;
      let dirZ = dz;
      if (dirX === 0 && dirZ === 0 && this.lastPoint) {
        dirX = this.lastPoint.x - this.start.x;
        dirZ = this.lastPoint.z - this.start.z;
      }
      if (dirX === 0 && dirZ === 0) {
        dirX = 1;
        dirZ = 0;
      }
      const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
      dirX /= len;
      dirZ /= len;
      endX = this.start.x + dirX * step;
      endZ = this.start.z + dirZ * step;
      point.set(endX, 0, endZ);
    }
    const start = { x: this.start.x, y: this.start.z };
    const end = { x: endX, y: endZ };
    state.addWallWithHistory(start, end);
    this.start = null;
    this.disposePreview();
    if (this.cursor) {
      this.cursor.position.set(point.x, this.cursor.position.y, point.z);
      this.cursorTarget = this.cursor.position.clone();
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (this.pointerId !== null) {
      this.renderer.domElement.releasePointerCapture(this.pointerId);
      this.pointerId = null;
    }
    this.dragging = false;
    this.start = null;
    this.disposePreview();
    if (this.cursor && this.lastPoint) {
      this.cursor.position.set(
        this.lastPoint.x,
        this.cursor.position.y,
        this.lastPoint.z,
      );
      this.cursorTarget = this.cursor.position.clone();
    }
  };

  private animateCursor = () => {
    if (this.cursor && this.cursorTarget) {
      this.cursor.position.lerp(this.cursorTarget, 0.2);
    }
    this.animationId = requestAnimationFrame(this.animateCursor);
  };
}

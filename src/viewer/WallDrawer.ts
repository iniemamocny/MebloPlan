import * as THREE from 'three';
import type { WebGLRenderer, Camera } from 'three';
import type { UseBoundStore, StoreApi } from 'zustand';
import { usePlannerStore } from '../state/store';
import type { ShapePoint } from '../types';
import {
  convertAxis,
  screenAxes,
  worldAxes,
} from '../utils/coordinateSystem';

interface PlannerStore {
  snapLength: number;
  wallDefaults: { height: number; thickness: number };
  addWallWithHistory: (start: ShapePoint, end: ShapePoint) => void;
  snapToGrid: boolean;
  gridSize: number;
  snapRightAngles: boolean;
}

export default class WallDrawer {
  private renderer: WebGLRenderer;
  private getCamera: () => Camera;
  private group: THREE.Group;
  private store: UseBoundStore<StoreApi<PlannerStore>>;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
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
    dom.addEventListener('pointercancel', this.onCancel);
    dom.addEventListener('pointerleave', this.onCancel);
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
    dom.removeEventListener('pointercancel', this.onCancel);
    dom.removeEventListener('pointerleave', this.onCancel);
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
    this.cursor.position.set(0, 0, 0.001);
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
    const dispose = () => {
      geom.dispose();
      mat.dispose();
    };
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(dispose);
    } else if (typeof Promise !== 'undefined') {
      Promise.resolve().then(dispose);
    } else {
      dispose();
    }
    this.preview = null;
  }

  private getPoint(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const y = convertAxis(ny, screenAxes, 'y', worldAxes, 'y');
    const cam = this.getCamera();
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
    const point = new THREE.Vector3();
    const intersection = this.raycaster.ray.intersectPlane(this.plane, point);
    if (!intersection) return null;
    if (!isFinite(intersection.x) || !isFinite(intersection.y)) return null;
    point.set(intersection.x, intersection.y, 0);
    const { snapToGrid, gridSize } = this.store.getState();
    if (snapToGrid && gridSize > 0) {
      const step = gridSize / 1000;
      point.x = Math.round(point.x / step) * step;
      point.y = Math.round(point.y / step) * step;
    }
    return point;
  }

  private constrainPoint(point: THREE.Vector3) {
    const { snapRightAngles } = this.store.getState();
    if (!this.start || !snapRightAngles) return point;
    const dx = Math.abs(point.x - this.start.x);
    const dy = Math.abs(point.y - this.start.y);
    if (dx > dy) {
      point.y = this.start.y;
    } else {
      point.x = this.start.x;
    }
    return point;
  }

  private onMove = (e: PointerEvent) => {
    const point = this.getPoint(e);
    if (!point) return;
    this.constrainPoint(point);
    point.z = 0.001;
    this.lastPoint = point;
    this.cursorTarget = point.clone();
    if (this.dragging && this.start && this.preview) {
      if (this.cursor) {
        this.cursor.position.copy(point).setZ(0.001);
      }
      const dx = point.x - this.start.x;
      const dy = point.y - this.start.y;
      const distX = Math.abs(dx);
      const distY = Math.abs(dy);
      const dist = Math.sqrt(distX * distX + distY * distY);
      this.preview.scale.x = dist;
      this.preview.position.set(
        this.start.x,
        this.start.y,
        this.preview.position.z,
      );
      this.preview.rotation.z = Math.atan2(dy, dx);
    }
  };

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const point = this.getPoint(e);
    if (!point) return;
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.pointerId = e.pointerId;
    this.dragging = true;
    this.start = point.clone();
    this.lastPoint = this.start.clone();
    if (this.cursor) {
      this.cursor.position.copy(point).setZ(0.001);
      this.cursorTarget = this.cursor.position.clone();
    }
    const state = this.store.getState();
    const height = state.wallDefaults.height / 1000;
    const geom = new THREE.BoxGeometry(1, this.thickness, height);
    geom.translate(0.5, 0, 0);
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
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
    if (e.button !== 0) return;
    if (this.pointerId === e.pointerId) {
      this.renderer.domElement.releasePointerCapture(e.pointerId);
      this.pointerId = null;
    }
    if (!this.dragging) return;
    this.dragging = false;
    if (!this.start) return;
    const point = this.getPoint(e);
    if (!point) {
      this.start = null;
      this.disposePreview();
      return;
    }
    this.constrainPoint(point);
    const state = this.store.getState();
    let endX = point.x;
    let endY = point.y;
    const dx = endX - this.start.x;
    const dy = endY - this.start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) {
      const snapLength = state.snapLength > 0 ? state.snapLength : 10;
      const step = snapLength / 1000;
      let dirX = dx;
      let dirY = dy;
      if (dirX === 0 && dirY === 0 && this.lastPoint) {
        dirX = this.lastPoint.x - this.start.x;
        dirY = this.lastPoint.y - this.start.y;
      }
      if (dirX === 0 && dirY === 0) {
        dirX = 1;
        dirY = 0;
      }
      const len = Math.sqrt(dirX * dirX + dirY * dirY);
      dirX /= len;
      dirY /= len;
      endX = this.start.x + dirX * step;
      endY = this.start.y + dirY * step;
      point.set(endX, endY, 0);
    }
    let startX = this.start.x;
    let startY = this.start.y;
    if (state.snapToGrid && state.gridSize > 0) {
      const stepSize = state.gridSize / 1000;
      startX = Math.round(startX / stepSize) * stepSize;
      startY = Math.round(startY / stepSize) * stepSize;
      endX = Math.round(endX / stepSize) * stepSize;
      endY = Math.round(endY / stepSize) * stepSize;
      point.set(endX, endY, 0);
    }
    const start = { x: startX, y: startY };
    const end = { x: endX, y: endY };
    state.addWallWithHistory(start, end);
    this.start = null;
    this.disposePreview();
    if (this.cursor) {
      this.cursor.position.set(point.x, point.y, 0.001);
      this.cursorTarget = this.cursor.position.clone();
    }
  };

  private onCancel = (_e: PointerEvent) => {
    this.onKeyDown({ key: 'Escape' } as KeyboardEvent);
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
      this.cursor.position.set(this.lastPoint.x, this.lastPoint.y, 0.001);
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

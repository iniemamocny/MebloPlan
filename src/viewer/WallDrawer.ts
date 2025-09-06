import * as THREE from 'three';
import type { WebGLRenderer, Camera, Scene } from 'three';
import type { UseBoundStore, StoreApi } from 'zustand';
import { usePlannerStore } from '../state/store';
import type { Room } from '../types';

interface PlannerStore {
  addWall: (w: { length: number; angle: number; thickness: number }) => void;
  wallThickness: number;
  snapAngle: number;
  snapLength: number;
  room: Room;
  setRoom: (patch: Partial<Room>) => void;
}

export default class WallDrawer {
  private renderer: WebGLRenderer;
  private getCamera: () => Camera;
  private store: UseBoundStore<StoreApi<PlannerStore>>;
  private scene: Scene;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private start: THREE.Vector3 | null = null;
  private preview: THREE.Line | null = null;
  private lengthInput: HTMLInputElement | null = null;
  private currentAngle = 0; // radians

  constructor(
    renderer: WebGLRenderer,
    getCamera: () => Camera,
    scene: Scene,
    store: typeof usePlannerStore,
  ) {
    this.renderer = renderer;
    this.getCamera = getCamera;
    this.scene = scene;
    this.store = store;
  }

  enable() {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onDown);
    dom.addEventListener('pointerup', this.onUp);
    dom.addEventListener('pointermove', this.onMove);
    window.addEventListener('keydown', this.onKeyDown);
  }

  disable() {
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onDown);
    dom.removeEventListener('pointerup', this.onUp);
    dom.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('keydown', this.onKeyDown);
    this.start = null;
    this.cleanupPreview();
  }

  private cleanupPreview() {
    if (this.lengthInput) {
      this.lengthInput.removeEventListener('keydown', this.onInputKeyDown);
      this.lengthInput.remove();
      this.lengthInput = null;
    }
    if (!this.preview) return;
    this.scene.remove(this.preview);
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
    return point;
  }

  private onDown = (e: PointerEvent) => {
    if (this.start) return;
    const point = this.getPoint(e);
    if (!point) return;
    this.start = point;
    const geom = new THREE.BufferGeometry().setFromPoints([
      point.clone(),
      point.clone(),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.preview = new THREE.Line(geom, mat);
    this.scene.add(this.preview);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.start || !this.preview) return;
    const point = this.getPoint(e);
    if (!point) return;
    const dx = point.x - this.start.x;
    const dz = point.z - this.start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const { snapAngle, snapLength } = this.store.getState();
    const angleDeg = (angle * 180) / Math.PI;
    const lengthMm = length * 1000;
    const snappedAngleDeg = snapAngle
      ? Math.round(angleDeg / snapAngle) * snapAngle
      : angleDeg;
    const snappedLengthMm = snapLength
      ? Math.round(lengthMm / snapLength) * snapLength
      : lengthMm;
    const snappedAngle = (snappedAngleDeg * Math.PI) / 180;
    const snappedLength = snappedLengthMm / 1000;
    this.currentAngle = snappedAngle;
    const positions = (this.preview.geometry as THREE.BufferGeometry).attributes
      .position as THREE.BufferAttribute;
    const endX = this.start.x + Math.cos(snappedAngle) * snappedLength;
    const endZ = this.start.z + Math.sin(snappedAngle) * snappedLength;
    positions.setXYZ(0, this.start.x, 0, this.start.z);
    positions.setXYZ(1, endX, 0, endZ);
    positions.needsUpdate = true;

    const mid = new THREE.Vector3(
      (this.start.x + endX) / 2,
      0,
      (this.start.z + endZ) / 2,
    );
    const cam = this.getCamera();
    const projected = mid.clone().project(cam);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const screenX = ((projected.x + 1) / 2) * rect.width + rect.left;
    const screenY = ((-projected.y + 1) / 2) * rect.height + rect.top;

    if (!this.lengthInput) {
      this.lengthInput = document.createElement('input');
      this.lengthInput.type = 'text';
      this.lengthInput.style.position = 'absolute';
      this.lengthInput.style.transform = 'translate(-50%, -50%)';
      this.lengthInput.addEventListener('keydown', this.onInputKeyDown);
      document.body.appendChild(this.lengthInput);
    }
    this.lengthInput.value = snappedLengthMm.toFixed(0);
    this.lengthInput.style.left = `${screenX}px`;
    this.lengthInput.style.top = `${screenY}px`;
    this.lengthInput.style.display = 'block';
    this.lengthInput.focus();
  };

  private onInputKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    if (!this.start || !this.preview || !this.lengthInput) return;
    const lengthMm = parseFloat(this.lengthInput.value);
    if (isNaN(lengthMm)) return;
    if (lengthMm <= 0) {
      this.lengthInput.setCustomValidity('Length must be greater than 0');
      this.lengthInput.reportValidity();
      return;
    }
    this.lengthInput.setCustomValidity('');
    const lengthM = lengthMm / 1000;
    const end = new THREE.Vector3(
      this.start.x + Math.cos(this.currentAngle) * lengthM,
      0,
      this.start.z + Math.sin(this.currentAngle) * lengthM,
    );
    const positions = (this.preview.geometry as THREE.BufferGeometry).attributes
      .position as THREE.BufferAttribute;
    positions.setXYZ(0, this.start.x, 0, this.start.z);
    positions.setXYZ(1, end.x, 0, end.z);
    positions.needsUpdate = true;
    this.lengthInput.style.display = 'none';
    this.finalizeSegment(end);
  };

  private finalizeSegment(end: THREE.Vector3) {
    if (!this.start || !this.preview) return;
    const dx = end.x - this.start.x;
    const dz = end.z - this.start.z;
    const lengthMm = Math.sqrt(dx * dx + dz * dz) * 1000; // meters to mm
    if (lengthMm < 1) {
      this.cleanupPreview();
      this.start = null;
      return;
    }
    const angleDeg = (Math.atan2(dz, dx) * 180) / Math.PI;
    const state = this.store.getState();
    const snappedAngle = state.snapAngle
      ? Math.round(angleDeg / state.snapAngle) * state.snapAngle
      : angleDeg;
    const snappedLength = state.snapLength
      ? Math.round(lengthMm / state.snapLength) * state.snapLength
      : lengthMm;
    if (state.room.walls.length === 0) {
      state.setRoom({ origin: { x: this.start.x * 1000, y: this.start.z * 1000 } });
    }
    const thickness = state.wallThickness;
    state.addWall({ length: snappedLength, angle: snappedAngle, thickness });
    const rad = (snappedAngle * Math.PI) / 180;
    const lenM = snappedLength / 1000;
    this.start.set(
      this.start.x + Math.cos(rad) * lenM,
      0,
      this.start.z + Math.sin(rad) * lenM,
    );
    const positions = (this.preview.geometry as THREE.BufferGeometry).attributes
      .position as THREE.BufferAttribute;
    positions.setXYZ(0, this.start.x, 0, this.start.z);
    positions.setXYZ(1, this.start.x, 0, this.start.z);
    positions.needsUpdate = true;
    if (this.lengthInput) {
      this.lengthInput.style.display = 'none';
    }
  }

  private onUp = (e: PointerEvent) => {
    if (!this.start || !this.preview) {
      this.cleanupPreview();
      return;
    }
    const end = this.getPoint(e);
    if (!end) {
      this.disable();
      return;
    }
    const dx = end.x - this.start.x;
    const dz = end.z - this.start.z;
    const lengthMm = Math.sqrt(dx * dx + dz * dz) * 1000;
    if (e.detail > 1 && lengthMm < 1) {
      this.disable();
      return;
    }
    this.finalizeSegment(end);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.target === this.lengthInput) return;
      if (!this.start || !this.preview) return;
      const positions = (this.preview.geometry as THREE.BufferGeometry)
        .attributes.position as THREE.BufferAttribute;
      const end = new THREE.Vector3(
        positions.getX(1),
        positions.getY(1),
        positions.getZ(1),
      );
      this.finalizeSegment(end);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.disable();
    }
  };
}

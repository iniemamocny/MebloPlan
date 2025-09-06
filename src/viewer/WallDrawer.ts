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
  snapRightAngles: boolean;
  angleToPrev: number;
  snappedLengthMm: number;
  snappedAngleDeg: number;
  room: Room;
  setRoom: (patch: Partial<Room>) => void;
  setDraftWall: (len: number, angle: number) => void;
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
  private currentAngle = 0; // radians
  private onLengthChange?: (len: number) => void;

  constructor(
    renderer: WebGLRenderer,
    getCamera: () => Camera,
    scene: Scene,
    store: typeof usePlannerStore,
    onLengthChange?: (len: number) => void,
  ) {
    this.renderer = renderer;
    this.getCamera = getCamera;
    this.scene = scene;
    this.store = store;
    this.onLengthChange = onLengthChange;
  }

  private unsubscribe?: () => void;

  private updateCursor(thicknessMm: number): string {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'crosshair';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    // cross
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    // square with side proportional to thickness
    const side = thicknessMm / 5; // 1px per 5mm
    const half = side / 2;
    ctx.strokeRect(size / 2 - half, size / 2 - half, side, side);

    return `url(${canvas.toDataURL()}) ${size / 2} ${size / 2}, crosshair`;
  }

  enable() {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onDown);
    dom.addEventListener('pointerup', this.onUp);
    dom.addEventListener('pointermove', this.onMove);
    window.addEventListener('keydown', this.onKeyDown);
    dom.style.cursor = this.updateCursor(this.store.getState().wallThickness);
    this.unsubscribe = this.store.subscribe(
      (s) => s.wallThickness,
      (t) => {
        dom.style.cursor = this.updateCursor(t);
      },
    );
  }

  disable() {
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onDown);
    dom.removeEventListener('pointerup', this.onUp);
    dom.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('keydown', this.onKeyDown);
    this.start = null;
    this.cleanupPreview();
    dom.style.cursor = 'default';
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private cleanupPreview() {
    this.onLengthChange?.(0);
    this.store.getState().setDraftWall(0, 0);
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
    const {
      snapAngle,
      snapLength,
      snapRightAngles,
      angleToPrev,
      room,
      setDraftWall,
    } = this.store.getState();
    let snappedAngle = 0;
    let snappedAngleDeg = 0;
    let length = 0;
    if (snapRightAngles) {
      const dx = point.x - this.start.x;
      const dz = point.z - this.start.z;
      length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const angleDeg = (angle * 180) / Math.PI;
      snappedAngleDeg = snapAngle
        ? Math.round(angleDeg / snapAngle) * snapAngle
        : angleDeg;
      snappedAngle = (snappedAngleDeg * Math.PI) / 180;
    } else {
      const prev = room.walls[room.walls.length - 1];
      snappedAngleDeg = (prev ? prev.angle : 0) + angleToPrev;
      snappedAngle = (snappedAngleDeg * Math.PI) / 180;
      const dx = point.x - this.start.x;
      const dz = point.z - this.start.z;
      length = dx * Math.cos(snappedAngle) + dz * Math.sin(snappedAngle);
      if (length < 0) length = -length;
    }
    const lengthMm = length * 1000;
    const snappedLengthMm = snapLength
      ? Math.round(lengthMm / snapLength) * snapLength
      : lengthMm;
    const snappedLength = snappedLengthMm / 1000;
    this.currentAngle = snappedAngle;
    const positions = (this.preview.geometry as THREE.BufferGeometry).attributes
      .position as THREE.BufferAttribute;
    const endX = this.start.x + Math.cos(snappedAngle) * snappedLength;
    const endZ = this.start.z + Math.sin(snappedAngle) * snappedLength;
    positions.setXYZ(0, this.start.x, 0, this.start.z);
    positions.setXYZ(1, endX, 0, endZ);
    positions.needsUpdate = true;

    setDraftWall(snappedLengthMm, snappedAngleDeg);
  };

  applyLength(lengthMm: number) {
    if (!this.start || !this.preview) return;
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
    this.finalizeSegment(end);
  }

  private finalizeSegment(end: THREE.Vector3) {
    if (!this.start || !this.preview) return;
    const state = this.store.getState();
    const dx = end.x - this.start.x;
    const dz = end.z - this.start.z;
    let lengthMm: number;
    let snappedAngleDeg: number;
    if (state.snapRightAngles) {
      lengthMm = Math.sqrt(dx * dx + dz * dz) * 1000;
      const angleDeg = (Math.atan2(dz, dx) * 180) / Math.PI;
      snappedAngleDeg = state.snapAngle
        ? Math.round(angleDeg / state.snapAngle) * state.snapAngle
        : angleDeg;
    } else {
      const prev = state.room.walls[state.room.walls.length - 1];
      snappedAngleDeg = (prev ? prev.angle : 0) + state.angleToPrev;
      const rad = (snappedAngleDeg * Math.PI) / 180;
      const lenM = dx * Math.cos(rad) + dz * Math.sin(rad);
      lengthMm = Math.abs(lenM) * 1000;
    }
    if (lengthMm < 1) {
      this.cleanupPreview();
      this.start = null;
      return;
    }
    const snappedLength = state.snapLength
      ? Math.round(lengthMm / state.snapLength) * state.snapLength
      : lengthMm;
    if (state.room.walls.length === 0) {
      state.setRoom({ origin: { x: this.start.x * 1000, y: this.start.z * 1000 } });
    }
    const thickness = state.wallThickness;
    state.addWall({ length: snappedLength, angle: snappedAngleDeg, thickness });
    const rad = (snappedAngleDeg * Math.PI) / 180;
    const lenM = snappedLength / 1000;
    this.currentAngle = rad;
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
    this.onLengthChange?.(0);
    this.store.getState().setDraftWall(0, 0);
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
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
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

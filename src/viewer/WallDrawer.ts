import * as THREE from 'three';
import type { WebGLRenderer, Camera, Scene } from 'three';
import type { UseBoundStore, StoreApi } from 'zustand';
import { usePlannerStore } from '../state/store';

interface PlannerStore {
  addWall: (w: { length: number; angle: number; thickness: number }) => void;
  wallThickness: number;
  snapAngle: number;
  snapLength: number;
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
  }

  disable() {
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onDown);
    dom.removeEventListener('pointerup', this.onUp);
    dom.removeEventListener('pointermove', this.onMove);
    this.start = null;
    this.cleanupPreview();
  }

  private cleanupPreview() {
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
    this.start = this.getPoint(e);
    if (!this.start) return;
    const geom = new THREE.BufferGeometry().setFromPoints([
      this.start.clone(),
      this.start.clone(),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.preview = new THREE.Line(geom, mat);
    this.scene.add(this.preview);
    this.renderer.domElement.addEventListener('pointermove', this.onMove);
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
    const positions = (
      this.preview.geometry as THREE.BufferGeometry
    ).attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, this.start.x, 0, this.start.z);
    positions.setXYZ(
      1,
      this.start.x + Math.cos(snappedAngle) * snappedLength,
      0,
      this.start.z + Math.sin(snappedAngle) * snappedLength,
    );
    positions.needsUpdate = true;
  };

  private onUp = (e: PointerEvent) => {
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.onMove);
    if (!this.start) {
      this.cleanupPreview();
      return;
    }
    const end = this.getPoint(e);
    if (!end) {
      this.start = null;
      this.cleanupPreview();
      return;
    }
    const dx = end.x - this.start.x;
    const dz = end.z - this.start.z;
    const lengthMm = Math.sqrt(dx * dx + dz * dz) * 1000; // meters to mm
    const angleDeg = (Math.atan2(dz, dx) * 180) / Math.PI;
    const { snapAngle, snapLength } = this.store.getState();
    const snappedAngle = snapAngle
      ? Math.round(angleDeg / snapAngle) * snapAngle
      : angleDeg;
    const snappedLength = snapLength
      ? Math.round(lengthMm / snapLength) * snapLength
      : lengthMm;
    const thickness = this.store.getState().wallThickness;
    this.store.getState().addWall({ length: snappedLength, angle: snappedAngle, thickness });
    this.start = null;
    this.cleanupPreview();
  };
}

import * as THREE from 'three';
import type { WebGLRenderer, Camera, Scene } from 'three';
import type { UseBoundStore, StoreApi } from 'zustand';
import { usePlannerStore } from '../state/store';
import type { Room } from '../types';

const pixelsPerMm = 0.2; // 1px ≈ 5mm

interface PlannerStore {
  addWall: (w: { length: number; angle: number; thickness: number }) => void;
  updateWall: (
    id: string,
    patch: Partial<{ length: number; angle: number; thickness: number }>,
  ) => void;
  wallThickness: number;
  snapAngle: number;
  snapLength: number;
  snapRightAngles: boolean;
  angleToPrev: number;
  room: Room;
  setRoom: (patch: Partial<Room>) => void;
  autoCloseWalls: boolean;
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
  private onAngleChange?: (angle: number) => void;
  private active = false;
  private mode: 'draw' | 'edit' = 'draw';
  private editingIndex: number | null = null;
  private overlay: HTMLInputElement | null = null;
  private labels = new Map<string, HTMLElement>();

  // unsubscribes for store subscriptions
  private unsubThickness?: () => void;
  private unsubLabels?: () => void;
  // handler for camera movement
  private onCameraChange = () => {
    this.updateLabels();
  };

  constructor(
    renderer: WebGLRenderer,
    getCamera: () => Camera,
    scene: Scene,
    store: typeof usePlannerStore,
    onLengthChange?: (len: number) => void,
    onAngleChange?: (angle: number) => void,
  ) {
    this.renderer = renderer;
    this.getCamera = getCamera;
    this.scene = scene;
    this.store = store;
    this.onLengthChange = onLengthChange;
    this.onAngleChange = onAngleChange;
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
    const side = Math.min(thicknessMm * pixelsPerMm, size - 2);
    const half = side / 2;
    ctx.strokeRect(size / 2 - half, size / 2 - half, side, side);

    return `url(${canvas.toDataURL()}) ${size / 2} ${size / 2}, crosshair`;
  }

  enable() {
    if (this.active) return;
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onDown);
    dom.addEventListener('pointerup', this.onUp);
    dom.addEventListener('pointermove', this.onMove);
    dom.addEventListener('pointermove', this.onCameraChange);
    dom.addEventListener('wheel', this.onCameraChange);
    window.addEventListener('keydown', this.onKeyDown);
    dom.style.cursor = this.updateCursor(this.store.getState().wallThickness);
    this.unsubThickness = this.store.subscribe(
      (s) => s.wallThickness,
      (t) => {
        dom.style.cursor = this.updateCursor(t);
      },
    );
    this.unsubLabels = this.store.subscribe(
      (s) => s.room.walls,
      (walls) => {
        this.updateLabels(walls);
      },
    );
    this.updateLabels(this.store.getState().room.walls);
    this.active = true;
  }

  setMode(mode: 'draw' | 'edit') {
    this.mode = mode;
    this.start = null;
    this.editingIndex = null;
    this.cleanupPreview();
  }

  // Allow external code/tests to focus a wall label for editing
  focusLabel(id: string) {
    this.enterLabelEdit(id);
  }

  disable() {
    if (!this.active) return;
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onDown);
    dom.removeEventListener('pointerup', this.onUp);
    dom.removeEventListener('pointermove', this.onMove);
    dom.removeEventListener('pointermove', this.onCameraChange);
    dom.removeEventListener('wheel', this.onCameraChange);
    window.removeEventListener('keydown', this.onKeyDown);
    this.start = null;
    this.cleanupPreview();
    dom.style.cursor = 'default';
    this.unsubThickness?.();
    this.unsubLabels?.();
    this.unsubThickness = undefined;
    this.unsubLabels = undefined;
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    for (const el of this.labels.values()) {
      el.remove();
    }
    this.labels.clear();
    this.active = false;
  }

  private cleanupPreview() {
    this.onLengthChange?.(0);
    this.onAngleChange?.(0);
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

  private worldToScreen(p: THREE.Vector3): { x: number; y: number } {
    const vector = p.clone().project(this.getCamera());
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((vector.x + 1) / 2) * rect.width + rect.left;
    const y = ((-vector.y + 1) / 2) * rect.height + rect.top;
    return { x, y };
  }

  private positionOverlay(point: THREE.Vector3) {
    if (!this.overlay) return;
    const { x, y } = this.worldToScreen(point);
    this.overlay.style.left = `${x}px`;
    this.overlay.style.top = `${y}px`;
  }

  private updateLabels(walls = this.store.getState().room.walls) {
    if (typeof document === 'undefined') return;
    const ids = new Set(walls.map((w) => w.id));
    for (const [id, el] of Array.from(this.labels.entries())) {
      if (!ids.has(id)) {
        el.remove();
        this.labels.delete(id);
      }
    }
    const { room } = this.store.getState();
    const origin = room.origin
      ? new THREE.Vector3(room.origin.x / 1000, 0, room.origin.y / 1000)
      : new THREE.Vector3();
    const cursor = origin.clone();
    for (const w of walls) {
      let el = this.labels.get(w.id);
      if (!el || el instanceof HTMLInputElement) {
        el?.remove();
        el = document.createElement('div');
        el.className = 'wall-label';
        el.style.position = 'absolute';
        el.style.transform = 'translate(-50%, -50%)';
        el.addEventListener('click', () => this.enterLabelEdit(w.id));
        document.body.appendChild(el);
        this.labels.set(w.id, el);
      }
      el.textContent = `${Math.round(w.length || 0)}`;
      const ang = (w.angle * Math.PI) / 180;
      const len = (w.length || 0) / 1000;
      const end = new THREE.Vector3(
        cursor.x + Math.cos(ang) * len,
        0,
        cursor.z + Math.sin(ang) * len,
      );
      const mid = new THREE.Vector3(
        (cursor.x + end.x) / 2,
        0,
        (cursor.z + end.z) / 2,
      );
      const offset = new THREE.Vector3(
        -Math.sin(ang),
        0,
        Math.cos(ang),
      ).multiplyScalar(0.05);
      mid.add(offset);
      const { x, y } = this.worldToScreen(mid);
      (el as HTMLElement).style.left = `${x}px`;
      (el as HTMLElement).style.top = `${y}px`;
      cursor.copy(end);
    }
  }

  private enterLabelEdit = (id: string) => {
    const wall = this.store.getState().room.walls.find((w) => w.id === id);
    const label = this.labels.get(id);
    if (!wall || !label) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'wall-label';
    input.style.position = 'absolute';
    input.style.transform = 'translate(-50%, -50%)';
    input.value = `${wall.length || 0}`;
    input.style.left = label.style.left;
    input.style.top = label.style.top;
    label.replaceWith(input);
    this.labels.set(id, input);
    input.focus();
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
          this.store.getState().updateWall(id, { length: val });
        }
        input.blur();
      }
    });
    input.addEventListener('blur', () => {
      this.updateLabels();
    });
  };

  private onDown = (e: PointerEvent) => {
    if (this.start) return;
    const point = this.getPoint(e);
    if (!point) return;
    if (this.mode === 'draw') {
      this.start = point;
      const geom = new THREE.BufferGeometry().setFromPoints([
        point.clone(),
        point.clone(),
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
      this.preview = new THREE.Line(geom, mat);
      this.scene.add(this.preview);
      if (this.overlay) {
        this.overlay.remove();
      }
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'wall-overlay';
      input.style.position = 'absolute';
      input.style.transform = 'translate(-50%, -50%)';
      input.value = '0';
      document.body.appendChild(input);
      this.overlay = input;
      this.positionOverlay(point.clone());
      input.focus();
    } else {
      const { room } = this.store.getState();
      const origin = room.origin
        ? new THREE.Vector3(room.origin.x / 1000, 0, room.origin.y / 1000)
        : new THREE.Vector3();
      const cursor = origin.clone();
      for (let i = 0; i < room.walls.length; i++) {
        const w = room.walls[i];
        const ang = (w.angle * Math.PI) / 180;
        const len = (w.length || 0) / 1000;
        const end = new THREE.Vector3(
          cursor.x + Math.cos(ang) * len,
          0,
          cursor.z + Math.sin(ang) * len,
        );
        if (point.distanceTo(end) < 0.2) {
          this.start = cursor.clone();
          this.editingIndex = i;
          const geom = new THREE.BufferGeometry().setFromPoints([
            this.start.clone(),
            end.clone(),
          ]);
          const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
          this.preview = new THREE.Line(geom, mat);
          this.scene.add(this.preview);
          return;
        }
        cursor.copy(end);
      }
    }
  };

  private onMove = (e: PointerEvent) => {
    if (!this.start || !this.preview) return;
    const point = this.getPoint(e);
    if (!point) return;
    if (this.mode === 'draw') {
      const { snapAngle, snapLength, snapRightAngles, angleToPrev, room } =
        this.store.getState();
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
        if (length < 0) {
          length = -length;
          snappedAngleDeg = (snappedAngleDeg + 180) % 360;
          snappedAngle = (snappedAngle + Math.PI) % (Math.PI * 2);
        }
      }
      snappedAngleDeg = (snappedAngleDeg + 360) % 360;
      const lengthMm = length * 1000;
      const snappedLengthMm = snapLength
        ? Math.round(lengthMm / snapLength) * snapLength
        : lengthMm;
      const snappedLength = snappedLengthMm / 1000;
      this.currentAngle = snappedAngle;
      const positions = (this.preview.geometry as THREE.BufferGeometry)
        .attributes.position as THREE.BufferAttribute;
      const endX = this.start.x + Math.cos(snappedAngle) * snappedLength;
      const endZ = this.start.z + Math.sin(snappedAngle) * snappedLength;
      positions.setXYZ(0, this.start.x, 0, this.start.z);
      positions.setXYZ(1, endX, 0, endZ);
      positions.needsUpdate = true;

      this.onLengthChange?.(snappedLengthMm);
      this.onAngleChange?.(snappedAngleDeg);
      if (this.overlay) {
        this.overlay.value = `${Math.round(snappedLengthMm)}`;
        const mid = new THREE.Vector3(
          (this.start.x + endX) / 2,
          0,
          (this.start.z + endZ) / 2,
        );
        const offset = new THREE.Vector3(
          -Math.sin(this.currentAngle),
          0,
          Math.cos(this.currentAngle),
        ).multiplyScalar(0.05);
        mid.add(offset);
        this.positionOverlay(mid);
      }
    } else {
      const { snapAngle, snapLength } = this.store.getState();
      const dx = point.x - this.start.x;
      const dz = point.z - this.start.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      let angle = Math.atan2(dz, dx);
      let angleDeg = (angle * 180) / Math.PI;
      if (snapAngle) {
        angleDeg = Math.round(angleDeg / snapAngle) * snapAngle;
        angle = (angleDeg * Math.PI) / 180;
      }
      const lengthMm = length * 1000;
      const snappedLengthMm = snapLength
        ? Math.round(lengthMm / snapLength) * snapLength
        : lengthMm;
      const snappedLength = snappedLengthMm / 1000;
      this.currentAngle = angle;
      const positions = (this.preview.geometry as THREE.BufferGeometry)
        .attributes.position as THREE.BufferAttribute;
      const endX = this.start.x + Math.cos(angle) * snappedLength;
      const endZ = this.start.z + Math.sin(angle) * snappedLength;
      positions.setXYZ(0, this.start.x, 0, this.start.z);
      positions.setXYZ(1, endX, 0, endZ);
      positions.needsUpdate = true;
      this.onLengthChange?.(snappedLengthMm);
      this.onAngleChange?.(angleDeg);
    }
  };

  applyLength(lengthMm?: number) {
    if (lengthMm === undefined && this.overlay) {
      const parsed = parseFloat(this.overlay.value);
      lengthMm = isNaN(parsed) ? undefined : parsed;
    }
    if (!this.start || !this.preview || !lengthMm || lengthMm <= 0) return;
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
    this.finalizeSegment(end, lengthMm);
  }

  private finalizeSegment(end: THREE.Vector3, manualLength?: number) {
    if (!this.start || !this.preview) return;
    const state = this.store.getState();
    let target = end.clone();
    const origin = state.room.origin
      ? new THREE.Vector3(
          state.room.origin.x / 1000,
          0,
          state.room.origin.y / 1000,
        )
      : this.start.clone();
    const closeThreshold = 0.1; // 10 cm
    const autoClose =
      state.autoCloseWalls &&
      state.room.walls.length > 0 &&
      state.room.origin &&
      origin.distanceTo(end) < closeThreshold;
    if (autoClose) {
      target = origin;
    }

    const segStart = this.start.clone();
    const dx = target.x - segStart.x;
    const dz = target.z - segStart.z;
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
      let rad = (snappedAngleDeg * Math.PI) / 180;
      let lenM = dx * Math.cos(rad) + dz * Math.sin(rad);
      if (lenM < 0) {
        lenM = -lenM;
        snappedAngleDeg = (snappedAngleDeg + 180) % 360;
        rad = (snappedAngleDeg * Math.PI) / 180;
      }
      lengthMm = lenM * 1000;
    }
    snappedAngleDeg = (snappedAngleDeg + 360) % 360;
    if (lengthMm < 1) {
      this.cleanupPreview();
      this.start = null;
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
      return;
    }
    let snappedLength = state.snapLength
      ? Math.round(lengthMm / state.snapLength) * state.snapLength
      : lengthMm;
    if (manualLength && manualLength > 0) {
      snappedLength = manualLength;
    }
    if (state.room.walls.length === 0) {
      state.setRoom({
        origin: { x: segStart.x * 1000, y: segStart.z * 1000 },
      });
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
    this.onAngleChange?.(0);
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.updateLabels();
    if (autoClose) {
      this.disable();
    }
  }

  private onUp = (e: PointerEvent) => {
    if (!this.start || !this.preview) {
      this.cleanupPreview();
      return;
    }
    if (this.mode === 'draw') {
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
    } else {
      if (this.editingIndex === null) {
        this.cleanupPreview();
        this.start = null;
        return;
      }
      const end = this.getPoint(e);
      if (!end) {
        this.cleanupPreview();
        this.start = null;
        this.editingIndex = null;
        return;
      }
      const { snapAngle, snapLength, room, updateWall } = this.store.getState();
      const dx = end.x - this.start.x;
      const dz = end.z - this.start.z;
      let angleDeg = (Math.atan2(dz, dx) * 180) / Math.PI;
      if (snapAngle) {
        angleDeg = Math.round(angleDeg / snapAngle) * snapAngle;
      }
      angleDeg = (angleDeg + 360) % 360;
      const lengthMmRaw = Math.sqrt(dx * dx + dz * dz) * 1000;
      const snappedLength = snapLength
        ? Math.round(lengthMmRaw / snapLength) * snapLength
        : lengthMmRaw;
      const wall = room.walls[this.editingIndex];
      updateWall(wall.id, { length: snappedLength, angle: angleDeg });
      this.start = null;
      this.editingIndex = null;
      this.cleanupPreview();
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (this.overlay && e.target === this.overlay) {
        e.preventDefault();
        const val = parseFloat(this.overlay.value);
        this.applyLength(val);
        return;
      }
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (!this.start || !this.preview) return;
      const positions = (this.preview.geometry as THREE.BufferGeometry)
        .attributes.position as THREE.BufferAttribute;
      const end = new THREE.Vector3(
        positions.getX(1),
        positions.getY(1),
        positions.getZ(1),
      );
      if (this.mode === 'draw') {
        this.finalizeSegment(end);
      } else if (this.editingIndex !== null) {
        const { snapAngle, snapLength, room, updateWall } =
          this.store.getState();
        const dx = end.x - this.start.x;
        const dz = end.z - this.start.z;
        let angleDeg = (Math.atan2(dz, dx) * 180) / Math.PI;
        if (snapAngle) {
          angleDeg = Math.round(angleDeg / snapAngle) * snapAngle;
        }
        angleDeg = (angleDeg + 360) % 360;
        const lengthMmRaw = Math.sqrt(dx * dx + dz * dz) * 1000;
        const snappedLength = snapLength
          ? Math.round(lengthMmRaw / snapLength) * snapLength
          : lengthMmRaw;
        const wall = room.walls[this.editingIndex];
        updateWall(wall.id, { length: snappedLength, angle: angleDeg });
        this.start = null;
        this.editingIndex = null;
        this.cleanupPreview();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.disable();
    }
  };
}

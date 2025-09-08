import * as THREE from 'three';
import type { WebGLRenderer, Camera, Scene } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { UseBoundStore, StoreApi } from 'zustand';
import { usePlannerStore } from '../state/store';
import type { Room, WallArc, Opening } from '../types';
import { getWallSegments, projectPointToSegment } from '../utils/walls';
import { createWallMaterial } from './wall';

const pixelsPerMm = 0.2; // 1px ≈ 5mm

interface PlannerStore {
  addWall: (w: {
    length: number;
    angle: number;
    thickness: number;
    arc?: WallArc;
  }) => void;
  updateWall: (
    id: string,
    patch: Partial<{ length: number; angle: number; thickness: number; arc?: WallArc }>,
  ) => void;
  removeWall: (id: string) => void;
  wallThickness: number;
  snapAngle: number;
  snapLength: number;
  snapRightAngles: boolean;
  angleToPrev: number;
  room: Room;
  setRoom: (patch: Partial<Room>) => void;
  autoCloseWalls: boolean;
  gridSize: number;
  snapToGrid: boolean;
  addOpening: (op: Omit<Opening, 'id'>) => void;
  updateOpening: (id: string, patch: Partial<Omit<Opening, 'id'>>) => void;
  openingDefaults: { width: number; height: number; bottom: number; kind: number };
  wallType: 'nosna' | 'dzialowa';
}

export default class WallDrawer {
  private renderer: WebGLRenderer;
  private getCamera: () => Camera;
  private store: UseBoundStore<StoreApi<PlannerStore>>;
  private scene: Scene;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private start: THREE.Vector3 | null = null;
  private preview: THREE.Line | THREE.Mesh | null = null;
  private currentAngle = 0; // radians
  private currentThickness = 0; // meters
  private dimLine1: Line2 | null = null;
  private dimLine2: Line2 | null = null;
  private dimText: THREE.Sprite | null = null;
  private dimTextTexture: THREE.CanvasTexture | null = null;
  private onLengthChange?: (len: number) => void;
  private onAngleChange?: (angle: number) => void;
  private active = false;
  private mode: 'draw' | 'edit' | 'move' | 'opening' = 'draw';
  private arcMode = false;
  private arcCenter: THREE.Vector3 | null = null;
  private editingIndex: number | null = null;
  private moving: {
    segStart: THREE.Vector3;
    segEnd: THREE.Vector3;
    prevAnchor: THREE.Vector3 | null;
    nextAnchor: THREE.Vector3 | null;
  } | null = null;
  private overlay: HTMLInputElement | null = null;
  private labels = new Map<string, HTMLElement>();
  private snapPreview: THREE.Mesh | null = null;
  private readonly snapTolerance = 0.005; // 5mm
  private grid: THREE.GridHelper | null = null;
  private openingMeshes = new Map<string, THREE.Mesh>();
  private openingEdit:
    | {
        id: string;
        type: 'move' | 'resize-left' | 'resize-right';
        grab: number;
        startOffset: number;
        startWidth: number;
        seg: {
          start: THREE.Vector3;
          end: THREE.Vector3;
          dir: THREE.Vector3;
          angle: number;
          length: number;
          wall: { id: string; thickness: number };
        };
      }
    | null = null;

  // unsubscribes for store subscriptions
  private unsubThickness?: () => void;
  private unsubLabels?: () => void;
  private unsubGrid?: () => void;
  private unsubOpenings?: () => void;
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
    this.unsubGrid = this.store.subscribe(
      (s) => ({ snapToGrid: s.snapToGrid, gridSize: s.gridSize }),
      ({ snapToGrid, gridSize }) => {
        this.updateGrid(snapToGrid, gridSize);
      },
      { fireImmediately: true },
    );
    this.unsubOpenings = this.store.subscribe(
      (s) => s.room.openings,
      (ops) => {
        this.updateOpenings(ops);
      },
      { fireImmediately: true },
    );
    this.updateLabels(this.store.getState().room.walls);
    this.active = true;
  }

  setMode(mode: 'draw' | 'edit' | 'move' | 'opening') {
    this.mode = mode;
    this.start = null;
    this.editingIndex = null;
    this.moving = null;
    this.openingEdit = null;
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
    this.moving = null;
    this.cleanupPreview();
    dom.style.cursor = 'default';
    this.unsubThickness?.();
    this.unsubLabels?.();
    this.unsubGrid?.();
    this.unsubOpenings?.();
    this.unsubThickness = undefined;
    this.unsubLabels = undefined;
    this.unsubGrid = undefined;
    this.unsubOpenings = undefined;
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    for (const el of this.labels.values()) {
      el.remove();
    }
    this.labels.clear();
    if (this.grid) {
      this.scene.remove(this.grid);
      this.grid.geometry.dispose();
      (this.grid.material as THREE.Material).dispose();
      this.grid = null;
    }
    for (const m of this.openingMeshes.values()) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.openingMeshes.clear();
    this.active = false;
  }

  setArcMode(on: boolean) {
    this.arcMode = on;
    this.arcCenter = null;
    this.start = null;
    this.cleanupPreview();
  }

  private cleanupDimensions() {
    if (this.dimLine1) {
      this.scene.remove(this.dimLine1);
      this.dimLine1.geometry.dispose();
      (this.dimLine1.material as THREE.Material).dispose();
      this.dimLine1 = null;
    }
    if (this.dimLine2) {
      this.scene.remove(this.dimLine2);
      this.dimLine2.geometry.dispose();
      (this.dimLine2.material as THREE.Material).dispose();
      this.dimLine2 = null;
    }
    if (this.dimText) {
      this.scene.remove(this.dimText);
      const mat = this.dimText.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.dimTextTexture?.dispose();
      this.dimTextTexture = null;
      this.dimText = null;
    }
  }

  private cleanupPreview() {
    this.onLengthChange?.(0);
    this.onAngleChange?.(0);
    if (this.preview) {
      this.scene.remove(this.preview);
      (this.preview as any).geometry?.dispose?.();
      const mat = (this.preview as any).material;
      if (Array.isArray(mat)) {
        mat.forEach((m: THREE.Material) => m.dispose());
      } else {
        mat?.dispose?.();
      }
      this.preview = null;
    }
    this.cleanupDimensions();
    if (this.snapPreview) {
      this.scene.remove(this.snapPreview);
      this.snapPreview.geometry.dispose();
      (this.snapPreview.material as THREE.Material).dispose();
      this.snapPreview = null;
    }
  }

  private updateGrid(snap: boolean, size: number) {
    if (snap) {
      const sizeM = 20;
      const divisions = Math.max(1, Math.round(sizeM / (size / 1000)));
      if (this.grid) {
        this.scene.remove(this.grid);
        this.grid.geometry.dispose();
        (this.grid.material as THREE.Material).dispose();
      }
      this.grid = new THREE.GridHelper(sizeM, divisions, 0xdddddd, 0xcccccc);
      (this.grid.material as THREE.Material).depthWrite = false;
      this.scene.add(this.grid);
    } else if (this.grid) {
      this.scene.remove(this.grid);
      this.grid.geometry.dispose();
      (this.grid.material as THREE.Material).dispose();
      this.grid = null;
    }
  }

  private getPoint(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const cam = this.getCamera();
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
    const point = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, point);
    const state = this.store.getState();
    if (state.snapToGrid) {
      const step = state.gridSize / 1000;
      point.x = Math.round(point.x / step) * step;
      point.z = Math.round(point.z / step) * step;
    }
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

  private getSegments() {
    const orig = usePlannerStore.getState;
    (usePlannerStore as any).getState = this.store.getState.bind(this.store);
    const segs = getWallSegments();
    (usePlannerStore as any).getState = orig;
    return segs;
  }

  private findClosestVertex(point: THREE.Vector3): THREE.Vector3 | null {
    const segs = this.getSegments();
    let closest: THREE.Vector3 | null = null;
    let min = this.snapTolerance;
    for (const s of segs) {
      const a = new THREE.Vector3(s.a.x / 1000, 0, s.a.y / 1000);
      const da = a.distanceTo(point);
      if (da < min) {
        min = da;
        closest = a;
      }
      const b = new THREE.Vector3(s.b.x / 1000, 0, s.b.y / 1000);
      const db = b.distanceTo(point);
      if (db < min) {
        min = db;
        closest = b;
      }
    }
    return closest;
  }

  private updateSnapPreview(p: THREE.Vector3 | null) {
    if (p) {
      if (!this.snapPreview) {
        const geom = new THREE.SphereGeometry(0.02, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.snapPreview = new THREE.Mesh(geom, mat);
        this.scene.add(this.snapPreview);
      }
      this.snapPreview.position.copy(p);
    } else if (this.snapPreview) {
      this.scene.remove(this.snapPreview);
      this.snapPreview.geometry.dispose();
      (this.snapPreview.material as THREE.Material).dispose();
      this.snapPreview = null;
    }
  }

  private getWallInfo(id: string) {
    const { room } = this.store.getState();
    const origin = room.origin || { x: 0, y: 0 };
    let cursor = { x: origin.x, y: origin.y };
    for (const w of room.walls) {
      const ang = ((w.angle || 0) * Math.PI) / 180;
      const dir = { x: Math.cos(ang), y: Math.sin(ang) };
      const len = w.length || 0;
      const end = { x: cursor.x + dir.x * len, y: cursor.y + dir.y * len };
      if (w.id === id) {
        return {
          start: new THREE.Vector3(cursor.x / 1000, 0, cursor.y / 1000),
          end: new THREE.Vector3(end.x / 1000, 0, end.y / 1000),
          dir: new THREE.Vector3(dir.x, 0, dir.y),
          angle: ang,
          length: len,
          wall: w,
        };
      }
      cursor = end;
    }
    return null;
  }

  private findSegmentForPoint(x: number, y: number) {
    const { room } = this.store.getState();
    const origin = room.origin || { x: 0, y: 0 };
    let cursor = { x: origin.x, y: origin.y };
    let best: any = null;
    let min = Infinity;
    for (const w of room.walls) {
      const ang = ((w.angle || 0) * Math.PI) / 180;
      const dir = { x: Math.cos(ang), y: Math.sin(ang) };
      const len = w.length || 0;
      const end = { x: cursor.x + dir.x * len, y: cursor.y + dir.y * len };
      const proj = projectPointToSegment(x, y, {
        a: { ...cursor },
        b: { ...end },
        angle: ang,
        length: len,
      });
      const tol = (w.thickness || 0) / 2 + 20;
      if (proj.dist <= tol && proj.dist < min) {
        min = proj.dist;
        best = {
          wall: w,
          start: new THREE.Vector3(cursor.x / 1000, 0, cursor.y / 1000),
          end: new THREE.Vector3(end.x / 1000, 0, end.y / 1000),
          dir: new THREE.Vector3(dir.x, 0, dir.y),
          angle: ang,
          length: len,
          offset: proj.t * len,
        };
      }
      cursor = end;
    }
    return best;
  }

  private updateOpenings(openings = this.store.getState().room.openings || []) {
    openings = openings || [];
    const ids = new Set(openings.map((o) => o.id));
    for (const [id, mesh] of Array.from(this.openingMeshes.entries())) {
      if (!ids.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.openingMeshes.delete(id);
      }
    }
    for (const op of openings) {
      const info = this.getWallInfo(op.wallId);
      if (!info) continue;
      const w = (op.width || 0) / 1000;
      const t = (info.wall.thickness || 0) / 1000;
      let mesh = this.openingMeshes.get(op.id);
      if (!mesh) {
        const geom = new THREE.BoxGeometry(w, 0.01, t);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        mesh = new THREE.Mesh(geom, mat);
        this.scene.add(mesh);
        this.openingMeshes.set(op.id, mesh);
      } else {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.BoxGeometry(w, 0.01, t);
      }
      const center = info.start
        .clone()
        .add(info.dir.clone().multiplyScalar((op.offset + op.width / 2) / 1000));
      mesh.position.set(center.x, 0.005, center.z);
      mesh.rotation.y = info.angle;
    }
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
      const remove = document.createElement('button');
      remove.textContent = '×';
      remove.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.store.getState().removeWall?.(w.id);
        this.updateLabels();
      });
      el.appendChild(remove);
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
      if (this.arcMode) {
        if (!this.arcCenter) {
          this.arcCenter = point;
          return;
        }
        this.finalizeArc(point);
        return;
      }
      this.start = point;
      this.currentThickness = this.store.getState().wallThickness / 1000;
      const geom = new THREE.PlaneGeometry(1, 1);
      geom.rotateX(-Math.PI / 2);
      let topMat: THREE.Material;
      try {
        [, topMat] = createWallMaterial(this.store.getState().wallType);
      } catch {
        topMat = new THREE.MeshBasicMaterial({ color: 0xd1d5db });
      }
      this.preview = new THREE.Mesh(geom, topMat);
      (this.preview as THREE.Mesh).scale.set(0, 1, this.currentThickness);
      this.preview.position.set(point.x, 0.001, point.z);
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
    } else if (this.mode === 'edit') {
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
    } else if (this.mode === 'move') {
      const { room } = this.store.getState();
      const origin = room.origin
        ? new THREE.Vector3(room.origin.x / 1000, 0, room.origin.y / 1000)
        : new THREE.Vector3();
      const cursor = origin.clone();
      const prevStart = origin.clone();
      for (let i = 0; i < room.walls.length; i++) {
        const w = room.walls[i];
        const ang = (w.angle * Math.PI) / 180;
        const len = (w.length || 0) / 1000;
        const end = new THREE.Vector3(
          cursor.x + Math.cos(ang) * len,
          0,
          cursor.z + Math.sin(ang) * len,
        );
        const segVec = end.clone().sub(cursor);
        const segLenSq = segVec.lengthSq();
        if (segLenSq > 0) {
          const t = point.clone().sub(cursor).dot(segVec) / segLenSq;
          if (t >= 0 && t <= 1) {
            const proj = cursor.clone().add(segVec.clone().multiplyScalar(t));
            if (proj.distanceTo(point) < 0.2) {
              const nextAnchor =
                i < room.walls.length - 1
                  ? (() => {
                      const nw = room.walls[i + 1];
                      const nang = (nw.angle * Math.PI) / 180;
                      const nlen = (nw.length || 0) / 1000;
                      return new THREE.Vector3(
                        end.x + Math.cos(nang) * nlen,
                        0,
                        end.z + Math.sin(nang) * nlen,
                      );
                    })()
                  : null;
              this.start = proj.clone();
              this.editingIndex = i;
              this.moving = {
                segStart: cursor.clone(),
                segEnd: end.clone(),
                prevAnchor: i > 0 ? prevStart.clone() : null,
                nextAnchor,
              };
              const geom = new THREE.BufferGeometry().setFromPoints([
                cursor.clone(),
                end.clone(),
              ]);
              const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
              this.preview = new THREE.Line(geom, mat);
              this.scene.add(this.preview);
              return;
            }
          }
        }
        prevStart.copy(cursor);
        cursor.copy(end);
      }
    } else if (this.mode === 'opening') {
      const pm = { x: point.x * 1000, y: point.z * 1000 };
      const { room, openingDefaults } = this.store.getState();
      for (const op of room.openings) {
        const info = this.getWallInfo(op.wallId);
        if (!info) continue;
        const proj = projectPointToSegment(pm.x, pm.y, {
          a: { x: info.start.x * 1000, y: info.start.z * 1000 },
          b: { x: info.end.x * 1000, y: info.end.z * 1000 },
          angle: info.angle,
          length: info.length,
        });
        const tol = info.wall.thickness / 2 + 20;
        if (proj.dist <= tol) {
          const offset = proj.t * info.length;
          if (offset >= op.offset && offset <= op.offset + op.width) {
            const edgeTol = 20;
            let type: 'move' | 'resize-left' | 'resize-right' = 'move';
            let grab = offset - op.offset;
            if (offset - op.offset < edgeTol) {
              type = 'resize-left';
              grab = 0;
            } else if (op.offset + op.width - offset < edgeTol) {
              type = 'resize-right';
              grab = 0;
            }
            this.openingEdit = {
              id: op.id,
              type,
              grab,
              startOffset: op.offset,
              startWidth: op.width,
              seg: info,
            };
            return;
          }
        }
      }
      const seg = this.findSegmentForPoint(pm.x, pm.y);
      if (!seg) return;
      const width = openingDefaults.width;
      let offset = seg.offset - width / 2;
      if (offset < 0) offset = 0;
      if (offset + width > seg.length) offset = Math.max(0, seg.length - width);
      this.store.getState().addOpening({
        wallId: seg.wall.id,
        offset,
        width,
        height: openingDefaults.height,
        bottom: openingDefaults.bottom,
        kind: openingDefaults.kind,
      });
    }
  };

  private onMove = (e: PointerEvent) => {
    if (this.mode === 'opening') {
      if (!this.openingEdit) return;
      const point = this.getPoint(e);
      if (!point) return;
      const pm = { x: point.x * 1000, y: point.z * 1000 };
      const info = this.openingEdit.seg;
      const proj = projectPointToSegment(pm.x, pm.y, {
        a: { x: info.start.x * 1000, y: info.start.z * 1000 },
        b: { x: info.end.x * 1000, y: info.end.z * 1000 },
        angle: info.angle,
        length: info.length,
      });
      let offset = proj.t * info.length;
      if (this.openingEdit.type === 'move') {
        offset = offset - this.openingEdit.grab;
        offset = Math.max(0, Math.min(offset, info.length - this.openingEdit.startWidth));
        this.store.getState().updateOpening(this.openingEdit.id, { offset });
      } else if (this.openingEdit.type === 'resize-left') {
        offset = Math.max(0, Math.min(offset, this.openingEdit.startOffset + this.openingEdit.startWidth - 10));
        let width = this.openingEdit.startOffset + this.openingEdit.startWidth - offset;
        if (offset + width > info.length) width = info.length - offset;
        width = Math.max(10, width);
        this.store.getState().updateOpening(this.openingEdit.id, { offset, width });
      } else if (this.openingEdit.type === 'resize-right') {
        let width = offset - this.openingEdit.startOffset;
        width = Math.max(10, Math.min(width, info.length - this.openingEdit.startOffset));
        this.store.getState().updateOpening(this.openingEdit.id, { width });
      }
      return;
    }
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
      let lengthMm = length * 1000;
      let snappedLengthMm = snapLength
        ? Math.round(lengthMm / snapLength) * snapLength
        : lengthMm;
      let snappedLength = snappedLengthMm / 1000;
      this.currentAngle = snappedAngle;
      let endX = this.start.x + Math.cos(snappedAngle) * snappedLength;
      let endZ = this.start.z + Math.sin(snappedAngle) * snappedLength;
      let end = new THREE.Vector3(endX, 0, endZ);
      const snap = this.findClosestVertex(end);
      if (snap) {
        end = snap;
        const dxs = end.x - this.start.x;
        const dzs = end.z - this.start.z;
        snappedLength = Math.sqrt(dxs * dxs + dzs * dzs);
        snappedLengthMm = snappedLength * 1000;
        this.currentAngle = Math.atan2(dzs, dxs);
        snappedAngleDeg = (this.currentAngle * 180) / Math.PI;
      }
      const mesh = this.preview as THREE.Mesh;
      const thickness = this.currentThickness;
      mesh.scale.set(snappedLength, 1, thickness);
      const mid = new THREE.Vector3(
        (this.start.x + end.x) / 2,
        0,
        (this.start.z + end.z) / 2,
      );
      mesh.position.copy(mid.clone().setY(0.001));
      mesh.rotation.y = this.currentAngle;

      const normal = new THREE.Vector3(
        -Math.sin(this.currentAngle),
        0,
        Math.cos(this.currentAngle),
      );
      const edge = normal.clone().multiplyScalar(thickness / 2);
      const s1 = this.start.clone().add(edge);
      const e1 = end.clone().add(edge);
      const s2 = this.start.clone().sub(edge);
      const e2 = end.clone().sub(edge);
      const canvasSize = this.renderer.domElement as HTMLCanvasElement;
      const res = new THREE.Vector2(canvasSize.width, canvasSize.height);
      if (!this.dimLine1) {
        const g1 = new LineGeometry();
        g1.setPositions([s1.x, s1.y, s1.z, e1.x, e1.y, e1.z]);
        const m1 = new LineMaterial({ color: 0x000000, linewidth: 0.001 });
        m1.resolution.set(res.x, res.y);
        this.dimLine1 = new Line2(g1, m1);
        this.scene.add(this.dimLine1);
      } else {
        const g1 = this.dimLine1.geometry as LineGeometry;
        g1.setPositions([s1.x, s1.y, s1.z, e1.x, e1.y, e1.z]);
        (this.dimLine1.material as LineMaterial).resolution.set(res.x, res.y);
      }
      if (!this.dimLine2) {
        const g2 = new LineGeometry();
        g2.setPositions([s2.x, s2.y, s2.z, e2.x, e2.y, e2.z]);
        const m2 = new LineMaterial({ color: 0x000000, linewidth: 0.001 });
        m2.resolution.set(res.x, res.y);
        this.dimLine2 = new Line2(g2, m2);
        this.scene.add(this.dimLine2);
      } else {
        const g2 = this.dimLine2.geometry as LineGeometry;
        g2.setPositions([s2.x, s2.y, s2.z, e2.x, e2.y, e2.z]);
        (this.dimLine2.material as LineMaterial).resolution.set(res.x, res.y);
      }

      if (!this.dimText) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        this.dimTextTexture = texture;
        this.dimText = new THREE.Sprite(material);
        this.dimText.scale.set(0.5, 0.125, 1);
        this.scene.add(this.dimText);
      }
      if (this.dimText && this.dimTextTexture) {
        const canvas = this.dimTextTexture.image as HTMLCanvasElement;
        let ctx: CanvasRenderingContext2D | null = null;
        try {
          ctx = canvas.getContext('2d');
        } catch {
          ctx = null;
        }
        if (ctx && typeof ctx.clearRect === 'function') {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#000';
          ctx.font = '48px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(snappedLengthMm)}`, canvas.width / 2, canvas.height / 2);
          this.dimTextTexture.needsUpdate = true;
        }
        const textPos = mid.clone().add(normal.clone().multiplyScalar(thickness / 2 + 0.05));
        this.dimText.position.set(textPos.x, 0.001, textPos.z);
      }

      this.updateSnapPreview(snap || null);
      this.onLengthChange?.(snappedLengthMm);
      this.onAngleChange?.(snappedAngleDeg);
      if (this.overlay) {
        this.overlay.value = `${Math.round(snappedLengthMm)}`;
        const midOff = mid
          .clone()
          .add(normal.clone().multiplyScalar(0.05));
        this.positionOverlay(midOff);
      }
    } else if (this.mode === 'edit') {
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
    } else if (this.mode === 'move' && this.moving) {
      const delta = point.clone().sub(this.start);
      const newStart = this.moving.segStart.clone().add(delta);
      const newEnd = this.moving.segEnd.clone().add(delta);
      const positions = (this.preview.geometry as THREE.BufferGeometry)
        .attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, newStart.x, 0, newStart.z);
      positions.setXYZ(1, newEnd.x, 0, newEnd.z);
      positions.needsUpdate = true;
      const wall = this.store.getState().room.walls[this.editingIndex!];
      const label = this.labels.get(wall.id);
      if (label) {
        const mid = new THREE.Vector3(
          (newStart.x + newEnd.x) / 2,
          0,
          (newStart.z + newEnd.z) / 2,
        );
        const ang = Math.atan2(newEnd.z - newStart.z, newEnd.x - newStart.x);
        const offset = new THREE.Vector3(
          -Math.sin(ang),
          0,
          Math.cos(ang),
        ).multiplyScalar(0.05);
        mid.add(offset);
        const { x, y } = this.worldToScreen(mid);
        (label as HTMLElement).style.left = `${x}px`;
        (label as HTMLElement).style.top = `${y}px`;
      }
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
    const mesh = this.preview as THREE.Mesh;
    mesh.scale.set(lengthM, 1, this.currentThickness);
    const mid = new THREE.Vector3(
      (this.start.x + end.x) / 2,
      0,
      (this.start.z + end.z) / 2,
    );
    mesh.position.set(mid.x, 0.001, mid.z);
    mesh.rotation.y = this.currentAngle;
    this.finalizeSegment(end, lengthMm);
  }

  private finalizeSegment(end: THREE.Vector3, manualLength?: number) {
    if (!this.start || !this.preview) return;
    const state = this.store.getState();
    const snap = this.findClosestVertex(end);
    let target = snap ? snap.clone() : end.clone();
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
    this.updateSnapPreview(null);

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
    this.currentThickness = thickness / 1000;
    const rad = (snappedAngleDeg * Math.PI) / 180;
    const lenM = snappedLength / 1000;
    this.currentAngle = rad;
    this.start.set(
      this.start.x + Math.cos(rad) * lenM,
      0,
      this.start.z + Math.sin(rad) * lenM,
    );
    const mesh = this.preview as any;
    mesh?.scale?.set?.(0, 1, this.currentThickness);
    mesh?.position?.set?.(this.start.x, 0.001, this.start.z);
    if (mesh?.rotation) mesh.rotation.y = this.currentAngle;
    this.cleanupDimensions();
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

  private finalizeArc(point: THREE.Vector3) {
    if (!this.arcCenter) return;
    const state = this.store.getState();
    const r = this.arcCenter.distanceTo(point) * 1000;
    if (r < 1) {
      this.arcCenter = null;
      return;
    }
    const sweep = 90; // degrees, placeholder
    const length = r * (Math.PI / 2);
    const thickness = state.wallThickness;
    state.addWall({ length, angle: 0, thickness, arc: { radius: r, angle: sweep } });
    this.arcCenter = null;
    this.updateLabels();
  }

  private onUp = (e: PointerEvent) => {
    if (this.mode === 'opening') {
      this.openingEdit = null;
      return;
    }
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
    } else if (this.mode === 'edit') {
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
    } else if (this.mode === 'move') {
      if (this.editingIndex === null || !this.moving) {
        this.cleanupPreview();
        this.start = null;
        this.moving = null;
        return;
      }
      const positions = (this.preview.geometry as THREE.BufferGeometry)
        .attributes.position as THREE.BufferAttribute;
      const newStart = new THREE.Vector3(
        positions.getX(0),
        0,
        positions.getZ(0),
      );
      const newEnd = new THREE.Vector3(
        positions.getX(1),
        0,
        positions.getZ(1),
      );
      const { room, updateWall, setRoom } = this.store.getState();
      const walls = room.walls;
      const wall = walls[this.editingIndex];
      const angDeg =
        (Math.atan2(newEnd.z - newStart.z, newEnd.x - newStart.x) * 180) /
        Math.PI;
      const lenMm = newStart.distanceTo(newEnd) * 1000;
      updateWall(wall.id, { length: lenMm, angle: (angDeg + 360) % 360 });
      if (this.moving.prevAnchor) {
        const prev = walls[this.editingIndex - 1];
        const p = this.moving.prevAnchor;
        const prevAng =
          (Math.atan2(newStart.z - p.z, newStart.x - p.x) * 180) / Math.PI;
        const prevLen = p.distanceTo(newStart) * 1000;
        updateWall(prev.id, {
          length: prevLen,
          angle: (prevAng + 360) % 360,
        });
      } else {
        setRoom({ origin: { x: newStart.x * 1000, y: newStart.z * 1000 } });
      }
      if (this.moving.nextAnchor) {
        const next = walls[this.editingIndex + 1];
        const n = this.moving.nextAnchor;
        const nextAng =
          (Math.atan2(n.z - newEnd.z, n.x - newEnd.x) * 180) / Math.PI;
        const nextLen = newEnd.distanceTo(n) * 1000;
        updateWall(next.id, {
          length: nextLen,
          angle: (nextAng + 360) % 360,
        });
      }
      this.start = null;
      this.editingIndex = null;
      this.moving = null;
      this.cleanupPreview();
      this.updateLabels();
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
      let end: THREE.Vector3;
      if (this.mode === 'draw' && this.preview instanceof THREE.Mesh) {
        const length = (this.preview as THREE.Mesh).scale.x;
        end = new THREE.Vector3(
          this.start.x + Math.cos(this.currentAngle) * length,
          0,
          this.start.z + Math.sin(this.currentAngle) * length,
        );
      } else {
        const positions = (this.preview as any).geometry
          .attributes.position as THREE.BufferAttribute;
        end = new THREE.Vector3(
          positions.getX(1),
          positions.getY(1),
          positions.getZ(1),
        );
      }
      if (this.mode === 'draw') {
        this.finalizeSegment(end);
      } else if (this.mode === 'edit' && this.editingIndex !== null) {
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
      } else if (this.mode === 'move') {
        this.onUp(new PointerEvent('pointerup'));
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.disable();
    }
  };
}

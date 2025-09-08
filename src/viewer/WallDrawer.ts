import * as THREE from 'three';
import type { WebGLRenderer, Camera, Scene } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { UseBoundStore, StoreApi } from 'zustand';
import { usePlannerStore } from '../state/store';
import type { Room, WallArc, Opening } from '../types';
import { getWallSegments, projectPointToSegment } from '../utils/walls';
import { createWallMaterial } from './wall';
import i18n from '../i18n';

const pixelsPerMm = 0.2; // 1px ≈ 5mm
const DRAG_PIXEL_THRESHOLD = 4;
const DRAG_WORLD_THRESHOLD = 0.01;
const SELECT_PIXEL_TOLERANCE = 8;

interface PlannerStore {
  addWall: (w: {
    length: number;
    angle: number;
    thickness: number;
    arc?: WallArc;
  }) => string;
  updateWall: (
    id: string,
    patch: Partial<{
      length: number;
      angle: number;
      thickness: number;
      arc: Partial<WallArc>;
    }>,
  ) => void;
  removeWall: (id: string) => void;
  wallThickness: number;
  snapAngle: number;
  snapLength: number;
  snapRightAngles: boolean;
  angleToPrev: number;
  defaultSquareAngle: number;
  room: Room;
  setRoom: (patch: Partial<Room>) => void;
  gridSize: number;
  snapToGrid: boolean;
  measurementUnit: 'mm' | 'cm';
  addOpening: (op: Omit<Opening, 'id'>) => void;
  updateOpening: (id: string, patch: Partial<Omit<Opening, 'id'>>) => void;
  openingDefaults: {
    width: number;
    height: number;
    bottom: number;
    kind: number;
  };
  wallType: 'nosna' | 'dzialowa';
}

type WallSegInfo = ReturnType<typeof getWallSegments>[number] & {
  start: THREE.Vector3;
  end: THREE.Vector3;
  dir: THREE.Vector3;
  wall: Room['walls'][number];
  index: number;
};

export default class WallDrawer {
  private renderer: WebGLRenderer;
  private getCamera: () => Camera;
  private store: UseBoundStore<StoreApi<PlannerStore>>;
  private scene: Scene;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private start: THREE.Vector3 | null = null;
  private dragStart: THREE.Vector3 | null = null;
  private dragStartClient: { x: number; y: number } | null = null;
  private preview: THREE.Line | THREE.Mesh | null = null;
  private currentAngle = 0; // radians
  private currentThickness = 0; // meters
  private isDragging = false;
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
  private startCircle: THREE.Mesh | null = null;
  private endCircle: THREE.Mesh | null = null;
  private midCircle: THREE.Mesh | null = null;
  private dragType: 'start' | 'end' | 'mid' | null = null;
  private squareMeshes = new Map<string, THREE.Mesh>();
  private guideX: THREE.Line | null = null;
  private guideZ: THREE.Line | null = null;
  private angleArc: THREE.Line | null = null;
  private angleLabel: HTMLElement | null = null;
  private readonly rightAngleTolerance = THREE.MathUtils.degToRad(5);
  private readonly snapTolerance = 0.005; // 5mm
  private grid: THREE.GridHelper | null = null;
  private openingMeshes = new Map<string, THREE.Mesh>();
  private openingEdit: {
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
  } | null = null;

  private segments: WallSegInfo[] = [];
  private segmentsByWall = new Map<string, WallSegInfo>();
  private segmentGrid = new Map<string, WallSegInfo[]>();
  private readonly segmentGridSize = 1000; // mm

  private applyAngleSnap(angle: number): number {
    const { snapRightAngles } = this.store.getState();
    if (!snapRightAngles) return angle;
    const deg = THREE.MathUtils.radToDeg(angle);
    const snapped = Math.round(deg / 90) * 90;
    return THREE.MathUtils.degToRad(snapped);
  }

  // unsubscribes for store subscriptions
  private unsubThickness?: () => void;
  private unsubLabels?: () => void;
  private unsubGrid?: () => void;
  private unsubOpenings?: () => void;
  private controls?: OrbitControls;
  private cameraChangeRaf: number | null = null;
  // handler for camera movement
  private onCameraChange = () => {
    if (this.cameraChangeRaf !== null) return;
    this.cameraChangeRaf = requestAnimationFrame(() => {
      this.cameraChangeRaf = null;
      this.updateLabels();
    });
  };

  constructor(
    renderer: WebGLRenderer,
    getCamera: () => Camera,
    scene: Scene,
    store: typeof usePlannerStore,
    onLengthChange?: (len: number) => void,
    onAngleChange?: (angle: number) => void,
    controls?: OrbitControls,
  ) {
    this.renderer = renderer;
    this.getCamera = getCamera;
    this.scene = scene;
    this.store = store;
    this.onLengthChange = onLengthChange;
    this.onAngleChange = onAngleChange;
    this.controls = controls;
  }

  private unsubscribe?: () => void;

  private updateCursor(thicknessMm: number): string {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof ctx.fillRect !== 'function') return 'crosshair';
    ctx.lineWidth = 1;

    // square with side proportional to thickness
    const side = Math.min(thicknessMm * pixelsPerMm, size - 2);
    const half = side / 2;

    // try to fill with wall top-view texture
    let pattern: CanvasPattern | null = null;
    try {
      const [, topMaterial] = createWallMaterial(
        this.store.getState().wallType,
      );
      const texture = topMaterial.map as THREE.CanvasTexture | null;
      const source = texture?.image as
        | HTMLCanvasElement
        | HTMLImageElement
        | undefined;
      pattern = source ? ctx.createPattern(source, 'repeat') : null;
    } catch {
      // ignore errors (e.g. getContext not implemented in tests)
    }
    ctx.fillStyle = pattern || '#f3f4f6';
    ctx.fillRect(size / 2 - half, size / 2 - half, side, side);

    ctx.strokeStyle = '#000';
    ctx.strokeRect(size / 2 - half, size / 2 - half, side, side);

    return `url(${canvas.toDataURL()}) ${size / 2} ${size / 2}, crosshair`;
  }

  enable() {
    if (this.active) return;
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onDown);
    dom.addEventListener('pointermove', this.onMove);
    dom.addEventListener('pointerup', this.onUp);
    if (this.controls) {
      this.controls.addEventListener('change', this.onCameraChange);
    } else {
      dom.addEventListener('pointermove', this.onCameraChange);
      dom.addEventListener('wheel', this.onCameraChange);
    }
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
      (walls, prevWalls) => {
        this.updateLabels(walls);
        const curr = new Set(walls.map((w) => w.id));
        const prev = prevWalls ? new Set(prevWalls.map((w) => w.id)) : new Set<string>();
        for (const id of prev) {
          if (!curr.has(id)) {
            const mesh = this.squareMeshes.get(id);
            if (mesh) {
              this.scene.remove(mesh);
              mesh.geometry.dispose();
              (mesh.material as THREE.Material).dispose();
              this.squareMeshes.delete(id);
            }
          }
        }
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
    this.dragType = null;
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
    dom.removeEventListener('pointermove', this.onMove);
    dom.removeEventListener('pointerup', this.onUp);
    if (this.controls) {
      this.controls.removeEventListener('change', this.onCameraChange);
    } else {
      dom.removeEventListener('pointermove', this.onCameraChange);
      dom.removeEventListener('wheel', this.onCameraChange);
    }
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.cameraChangeRaf !== null) {
      cancelAnimationFrame(this.cameraChangeRaf);
      this.cameraChangeRaf = null;
    }
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
    for (const m of this.squareMeshes.values()) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.squareMeshes.clear();
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
    if (this.startCircle) {
      this.scene.remove(this.startCircle);
      this.startCircle.geometry.dispose();
      (this.startCircle.material as THREE.Material).dispose();
      this.startCircle = null;
    }
    if (this.endCircle) {
      this.scene.remove(this.endCircle);
      this.endCircle.geometry.dispose();
      (this.endCircle.material as THREE.Material).dispose();
      this.endCircle = null;
    }
    if (this.midCircle) {
      this.scene.remove(this.midCircle);
      this.midCircle.geometry.dispose();
      (this.midCircle.material as THREE.Material).dispose();
      this.midCircle = null;
    }
    if (this.guideX) {
      this.scene.remove(this.guideX);
      this.guideX.geometry.dispose();
      (this.guideX.material as THREE.Material).dispose();
      this.guideX = null;
    }
    if (this.guideZ) {
      this.scene.remove(this.guideZ);
      this.guideZ.geometry.dispose();
      (this.guideZ.material as THREE.Material).dispose();
      this.guideZ = null;
    }
    if (this.angleArc) {
      this.scene.remove(this.angleArc);
      this.angleArc.geometry.dispose();
      (this.angleArc.material as THREE.Material).dispose();
      this.angleArc = null;
    }
    if (this.angleLabel) {
      this.angleLabel.remove();
      this.angleLabel = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private updateEditHandles(start: THREE.Vector3, end: THREE.Vector3) {
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const makeCircle = () => {
      const g = new THREE.CircleGeometry(0.02, 16);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.MeshBasicMaterial({ color: 0x000000 });
      return new THREE.Mesh(g, m);
    };
    if (!this.startCircle) {
      this.startCircle = makeCircle();
      this.scene.add(this.startCircle);
    }
    if (!this.endCircle) {
      this.endCircle = makeCircle();
      this.scene.add(this.endCircle);
    }
    if (!this.midCircle) {
      this.midCircle = makeCircle();
      this.scene.add(this.midCircle);
    }
    this.startCircle.position.set(start.x, 0.002, start.z);
    this.endCircle.position.set(end.x, 0.002, end.z);
    this.midCircle.position.set(mid.x, 0.002, mid.z);
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

  private screenToWorldDistance(px: number, point: THREE.Vector3): number {
    const { x, y } = this.worldToScreen(point);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX = ((x + px - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((y - rect.top) / rect.height) * 2 + 1;
    const cam = this.getCamera();
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);
    const p = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, p);
    return point.distanceTo(p);
  }

  private positionOverlay(point: THREE.Vector3) {
    if (!this.overlay) return;
    const { x, y } = this.worldToScreen(point);
    this.overlay.style.left = `${x}px`;
    this.overlay.style.top = `${y}px`;
  }

  private getSegments() {
    const room = this.store.getState().room;
    const segs = getWallSegments(room);
    this.segments = [];
    this.segmentsByWall.clear();
    this.segmentGrid.clear();
    segs.forEach((s, i) => {
      const wall = room.walls[i];
      const start = new THREE.Vector3(s.a.x / 1000, 0, s.a.y / 1000);
      const end = new THREE.Vector3(s.b.x / 1000, 0, s.b.y / 1000);
      const dir = end.clone().sub(start).normalize();
      const info: WallSegInfo = { ...s, start, end, dir, wall, index: i };
      this.segments.push(info);
      this.segmentsByWall.set(wall.id, info);
      const midX = (s.a.x + s.b.x) / 2;
      const midY = (s.a.y + s.b.y) / 2;
      const key = this.gridKey(midX, midY);
      if (!this.segmentGrid.has(key)) this.segmentGrid.set(key, []);
      this.segmentGrid.get(key)!.push(info);
    });
    return this.segments;
  }

  private gridKey(x: number, y: number) {
    const gx = Math.floor(x / this.segmentGridSize);
    const gy = Math.floor(y / this.segmentGridSize);
    return `${gx},${gy}`;
  }

  private findClosestPoint(point: THREE.Vector3): THREE.Vector3 | null {
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
    if (closest) return closest;
    const px = point.x * 1000;
    const py = point.z * 1000;
    for (const s of segs) {
      const proj = projectPointToSegment(px, py, s);
      const dist = proj.dist / 1000;
      if (dist < min) {
        min = dist;
        closest = new THREE.Vector3(proj.x / 1000, 0, proj.y / 1000);
      }
    }
    return closest;
  }

  private updateSnapPreview(p: THREE.Vector3 | null) {
    if (!this.endCircle) return;
    const mat = this.endCircle.material as THREE.MeshBasicMaterial;
    mat.color.set(p ? 0xff0000 : 0x000000);
  }

  private getWallInfo(id: string) {
    this.getSegments();
    return this.segmentsByWall.get(id) || null;
  }

  private findSegmentForPoint(x: number, y: number) {
    this.getSegments();
    const gx = Math.floor(x / this.segmentGridSize);
    const gy = Math.floor(y / this.segmentGridSize);
    const candidates: WallSegInfo[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = this.segmentGrid.get(`${gx + dx},${gy + dy}`);
        if (arr) candidates.push(...arr);
      }
    }
    const list = candidates.length ? candidates : this.segments;
    let best: any = null;
    let min = Infinity;
    for (const seg of list) {
      const proj = projectPointToSegment(x, y, seg);
      const tol = (seg.wall.thickness || 0) / 2 + 20;
      if (proj.dist <= tol && proj.dist < min) {
        min = proj.dist;
        best = { ...seg, offset: proj.t * seg.length };
      }
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
      let center: THREE.Vector3;
      let rot = info.angle;
      if (info.arc) {
        const tmid = (op.offset + op.width / 2) / info.length;
        const ang = info.arc.startAngle + info.arc.sweep * tmid;
        const cx = info.arc.cx / 1000;
        const cy = info.arc.cy / 1000;
        const r = info.arc.radius / 1000;
        center = new THREE.Vector3(
          cx + Math.cos(ang) * r,
          0,
          cy + Math.sin(ang) * r,
        );
        rot = ang + (info.arc.sweep >= 0 ? Math.PI / 2 : -Math.PI / 2);
      } else {
        center = info.start
          .clone()
          .add(
            info.dir.clone().multiplyScalar((op.offset + op.width / 2) / 1000),
          );
      }
      mesh.position.set(center.x, 0.005, center.z);
      mesh.rotation.y = rot;
    }
  }

  private updateLabels(walls = this.store.getState().room.walls) {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('wall-labels');
    if (!container) {
      container = document.createElement('div');
      container.id = 'wall-labels';
      container.className = 'wall-labels';
      document.body.appendChild(container);
    }
    const ids = new Set(walls.map((w) => w.id));
    for (const [id, el] of Array.from(this.labels.entries())) {
      if (!ids.has(id)) {
        el.remove();
        this.labels.delete(id);
      }
    }
    this.getSegments();
    for (const w of walls) {
      let el = this.labels.get(w.id);
      if (!el || el instanceof HTMLInputElement) {
        el?.remove();
        el = document.createElement('div');
        el.className = 'wall-label';
        el.style.position = 'absolute';
        el.style.transform = 'translate(-50%, -50%)';
        el.addEventListener('click', () => this.enterLabelEdit(w.id));
        container!.appendChild(el);
        this.labels.set(w.id, el);
      }
      const unit = this.store.getState().measurementUnit || 'mm';
      const length = w.length || 0;
      const display = unit === 'cm' ? Math.round(length / 10) : Math.round(length);
      const unitLabel = i18n.t(`units.${unit}`);
      el.textContent = `${display} ${unitLabel}`;
      const remove = document.createElement('button');
      remove.textContent = '×';
      remove.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.store.getState().removeWall?.(w.id);
        this.updateLabels();
      });
      el.appendChild(remove);
      const info = this.segmentsByWall.get(w.id);
      if (!info) continue;
      let mid: THREE.Vector3;
      let ang: number;
      if (info.arc) {
        const arc = info.arc;
        const cx = arc.cx / 1000;
        const cy = arc.cy / 1000;
        const r = arc.radius / 1000;
        const a = arc.startAngle + arc.sweep / 2;
        mid = new THREE.Vector3(
          cx + Math.cos(a) * r,
          0,
          cy + Math.sin(a) * r,
        );
        ang = a + (arc.sweep >= 0 ? Math.PI / 2 : -Math.PI / 2);
      } else {
        const start = info.start;
        const end = info.end;
        mid = new THREE.Vector3(
          (start.x + end.x) / 2,
          0,
          (start.z + end.z) / 2,
        );
        ang = Math.atan2(end.z - start.z, end.x - start.x);
      }
      const offset = new THREE.Vector3(
        -Math.sin(ang),
        0,
        Math.cos(ang),
      ).multiplyScalar(0.05);
      mid.add(offset);
      const { x, y } = this.worldToScreen(mid);
      (el as HTMLElement).style.left = `${x}px`;
      (el as HTMLElement).style.top = `${y}px`;
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
    if (e.button !== 0) return;
    if (this.start) return;

    this.renderer.domElement.setPointerCapture(e.pointerId);

    const point = this.getPoint(e);
    if (!point) return;
    this.dragStart = point.clone();
    this.dragStartClient = { x: e.clientX, y: e.clientY };
    this.isDragging = false;
    if (this.mode === 'draw') {
      if (this.arcMode) {
        if (!this.arcCenter) {
          this.arcCenter = point.clone();
          return;
        }
        this.finalizeArc(point);
        return;
      }
      this.start = point.clone();
      this.currentThickness = this.store.getState().wallThickness / 1000;
    } else if (this.mode === 'edit') {
      const segs = this.getSegments();
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        const tol = this.screenToWorldDistance(
          SELECT_PIXEL_TOLERANCE,
          s.end,
        );
        const mid = s.start.clone().add(s.end).multiplyScalar(0.5);
        const prevAnchor = i > 0 ? segs[i - 1].start.clone() : null;
        const nextAnchor = i < segs.length - 1 ? segs[i + 1].end.clone() : null;
        const dStart = point.distanceTo(s.start);
        const dEnd = point.distanceTo(s.end);
        const dMid = point.distanceTo(mid);
        const minDist = Math.min(dStart, dEnd, dMid);
        if (minDist < tol) {
          this.editingIndex = i;
          this.moving = {
            segStart: s.start.clone(),
            segEnd: s.end.clone(),
            prevAnchor,
            nextAnchor,
          };
          const geom = new THREE.BufferGeometry().setFromPoints([
            s.start.clone(),
            s.end.clone(),
          ]);
          const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
          this.preview = new THREE.Line(geom, mat);
          this.scene.add(this.preview);
          this.updateEditHandles(s.start.clone(), s.end.clone());
          if (minDist === dMid) {
            this.start = mid.clone();
            this.dragType = 'mid';
          } else if (minDist === dStart) {
            this.start = s.start.clone();
            this.dragType = 'start';
          } else {
            this.start = s.end.clone();
            this.dragType = 'end';
          }
          return;
        }
      }
    } else if (this.mode === 'move') {
      const pm = { x: point.x * 1000, y: point.z * 1000 };
      const seg = this.findSegmentForPoint(pm.x, pm.y);
      if (seg) {
        const proj = seg.start
          .clone()
          .add(seg.dir.clone().multiplyScalar(seg.offset / 1000));
        const prevAnchor = seg.index > 0 ? this.segments[seg.index - 1].start.clone() : null;
        const nextAnchor =
          seg.index < this.segments.length - 1
            ? this.segments[seg.index + 1].end.clone()
            : null;
        this.start = proj.clone();
        this.editingIndex = seg.index;
        this.moving = {
          segStart: seg.start.clone(),
          segEnd: seg.end.clone(),
          prevAnchor,
          nextAnchor,
        };
        const geom = new THREE.BufferGeometry().setFromPoints([
          seg.start.clone(),
          seg.end.clone(),
        ]);
        const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
        this.preview = new THREE.Line(geom, mat);
        this.scene.add(this.preview);
        return;
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
          arc: info.arc,
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
        arc: info.arc,
      });
      let offset = proj.t * info.length;
      if (this.openingEdit.type === 'move') {
        offset = offset - this.openingEdit.grab;
        offset = Math.max(
          0,
          Math.min(offset, info.length - this.openingEdit.startWidth),
        );
        this.store.getState().updateOpening(this.openingEdit.id, { offset });
      } else if (this.openingEdit.type === 'resize-left') {
        offset = Math.max(
          0,
          Math.min(
            offset,
            this.openingEdit.startOffset + this.openingEdit.startWidth - 10,
          ),
        );
        let width =
          this.openingEdit.startOffset + this.openingEdit.startWidth - offset;
        if (offset + width > info.length) width = info.length - offset;
        width = Math.max(10, width);
        this.store
          .getState()
          .updateOpening(this.openingEdit.id, { offset, width });
      } else if (this.openingEdit.type === 'resize-right') {
        let width = offset - this.openingEdit.startOffset;
        width = Math.max(
          10,
          Math.min(width, info.length - this.openingEdit.startOffset),
        );
        this.store.getState().updateOpening(this.openingEdit.id, { width });
      }
      return;
    }
    if (!this.start) return;
    const point = this.getPoint(e);
    if (!point) return;
    if (this.mode === 'draw') {
      if (!this.isDragging) {
        if (this.dragStart && this.dragStartClient) {
          const worldDist = this.dragStart.distanceTo(point);
          let screenDist = DRAG_PIXEL_THRESHOLD + 1;
          if (e.clientX !== undefined && e.clientY !== undefined) {
            screenDist = Math.hypot(
              e.clientX - this.dragStartClient.x,
              e.clientY - this.dragStartClient.y,
            );
          }
          if (
            worldDist < DRAG_WORLD_THRESHOLD &&
            screenDist < DRAG_PIXEL_THRESHOLD
          ) {
            return;
          }
          this.isDragging = true;
          let topMat: THREE.Material;
          try {
            [, topMat] = createWallMaterial(this.store.getState().wallType);
          } catch {
            topMat = new THREE.MeshBasicMaterial({ color: 0xd1d5db });
          }
          const startGeom = new THREE.BoxGeometry(
            this.currentThickness,
            0.01,
            this.currentThickness,
          );
          startGeom.translate(0, 0.005, 0);
          const startMat = topMat.clone();
          this.startCircle = new THREE.Mesh(startGeom, startMat);
          this.startCircle.position.set(this.start.x, 0.001, this.start.z);
          this.scene.add(this.startCircle);
          const geom = new THREE.BoxGeometry(1, 0.01, 1);
          geom.translate(0, 0.005, 0);
          this.preview = new THREE.Mesh(geom, topMat);
          (this.preview as THREE.Mesh).scale.set(0, 1, this.currentThickness);
          this.preview.position.set(this.start.x, 0.001, this.start.z);
          this.scene.add(this.preview);
          const guideMat = new THREE.LineDashedMaterial({
            color: 0x888888,
            dashSize: 0.2,
            gapSize: 0.1,
          });
          const g1 = new THREE.BufferGeometry().setFromPoints([
            this.start.clone(),
            this.start.clone(),
          ]);
          this.guideX = new THREE.Line(g1, guideMat.clone());
          this.guideX.computeLineDistances();
          this.scene.add(this.guideX);
          const g2 = new THREE.BufferGeometry().setFromPoints([
            this.start.clone(),
            this.start.clone(),
          ]);
          this.guideZ = new THREE.Line(g2, guideMat.clone());
          this.guideZ.computeLineDistances();
          this.scene.add(this.guideZ);
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
          this.positionOverlay(this.start.clone());
          input.focus();
        } else {
          return;
        }
      }
      const { snapLength, room } = this.store.getState();
      const prevWall = room.walls[room.walls.length - 1];
      const dx = point.x - this.start.x;
      const dz = point.z - this.start.z;
      if (this.guideX) {
        const pos = (this.guideX.geometry as THREE.BufferGeometry).attributes
          .position as THREE.BufferAttribute;
        pos.setXYZ(0, this.start.x, 0, this.start.z);
        pos.setXYZ(1, this.start.x + dx, 0, this.start.z);
        pos.needsUpdate = true;
        this.guideX.computeLineDistances();
        this.guideX.visible = Math.abs(dx) > 0.0001;
      }
      if (this.guideZ) {
        const pos = (this.guideZ.geometry as THREE.BufferGeometry).attributes
          .position as THREE.BufferAttribute;
        pos.setXYZ(0, this.start.x, 0, this.start.z);
        pos.setXYZ(1, this.start.x, 0, this.start.z + dz);
        pos.needsUpdate = true;
        this.guideZ.computeLineDistances();
        this.guideZ.visible = Math.abs(dz) > 0.0001;
      }
      let angle = Math.atan2(dz, dx);
      angle = this.applyAngleSnap(angle);
      let snappedAngleDeg = THREE.MathUtils.radToDeg(angle);
      const snappedAngle = angle;
      const length = Math.sqrt(dx * dx + dz * dz);
      const lengthMm = length * 1000;
      let snappedLengthMm = snapLength
        ? Math.round(lengthMm / snapLength) * snapLength
        : lengthMm;
      let snappedLength = snappedLengthMm / 1000;
      this.currentAngle = snappedAngle;
      const endX = this.start.x + Math.cos(snappedAngle) * snappedLength;
      const endZ = this.start.z + Math.sin(snappedAngle) * snappedLength;
      let end = new THREE.Vector3(endX, 0, endZ);
      const snap = this.findClosestPoint(end);
      if (snap) {
        end = snap;
        const dxs = end.x - this.start.x;
        const dzs = end.z - this.start.z;
        snappedLength = Math.sqrt(dxs * dxs + dzs * dzs);
        snappedLengthMm = snappedLength * 1000;
        this.currentAngle = this.applyAngleSnap(Math.atan2(dzs, dxs));
        snappedAngleDeg = THREE.MathUtils.radToDeg(this.currentAngle);
      }
      if (!this.endCircle) {
        const endGeom = new THREE.CircleGeometry(0.02, 16);
        endGeom.rotateX(-Math.PI / 2);
        const endMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.endCircle = new THREE.Mesh(endGeom, endMat);
        this.scene.add(this.endCircle);
      }
      this.endCircle.position.set(end.x, 0.002, end.z);
      this.updateSnapPreview(snap || null);
      const mesh = this.preview as THREE.Mesh;
      mesh.scale.x = snappedLength;
      mesh.scale.z = this.currentThickness;
      const thickness = this.currentThickness;
      const dir = new THREE.Vector3(
        Math.cos(this.currentAngle),
        0,
        Math.sin(this.currentAngle),
      );
      const mid = this.start
        .clone()
        .add(dir.clone().multiplyScalar(snappedLength / 2));
      mesh.position.set(mid.x, 0.001, mid.z);
      mesh.rotation.y = this.currentAngle;
      if (!this.midCircle) {
        const midGeom = new THREE.CircleGeometry(0.02, 16);
        midGeom.rotateX(-Math.PI / 2);
        const midMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.midCircle = new THREE.Mesh(midGeom, midMat);
        this.scene.add(this.midCircle);
      }
      this.midCircle.position.set(mid.x, 0.002, mid.z);

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
        const material = new THREE.SpriteMaterial({
          map: texture,
          depthTest: false,
        });
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
          ctx.fillText(
            `${Math.round(snappedLengthMm)}`,
            canvas.width / 2,
            canvas.height / 2,
          );
          this.dimTextTexture.needsUpdate = true;
        }
        const textPos = mid
          .clone()
          .add(normal.clone().multiplyScalar(thickness / 2 + 0.05));
        this.dimText.position.set(textPos.x, 0.001, textPos.z);
      }

      this.onLengthChange?.(snappedLengthMm);
      this.onAngleChange?.(snappedAngleDeg);
      if (this.overlay) {
        this.overlay.value = `${Math.round(snappedLengthMm)}`;
        const midOff = mid.clone().add(normal.clone().multiplyScalar(0.05));
        this.positionOverlay(midOff);
      }

      if (prevWall) {
        const prevAngle = THREE.MathUtils.degToRad(prevWall.angle);
        const diff = Math.atan2(
          Math.sin(this.currentAngle - prevAngle),
          Math.cos(this.currentAngle - prevAngle),
        );
        const absDiff = Math.abs(diff);
        const radius = 0.3;
        const curve = new THREE.ArcCurve(
          0,
          0,
          radius,
          prevAngle,
          prevAngle + diff,
          diff < 0,
        );
        const pts2 = curve.getPoints(16);
        const pts3 = pts2.map((p) => new THREE.Vector3(p.x, 0.001, p.y));
        const geo = new THREE.BufferGeometry().setFromPoints(pts3);
        if (!this.angleArc) {
          const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
          this.angleArc = new THREE.Line(geo, mat);
          this.scene.add(this.angleArc);
        } else {
          this.angleArc.geometry.dispose();
          this.angleArc.geometry = geo;
        }
        this.angleArc.position.set(this.start.x, 0, this.start.z);

        const midAngle = prevAngle + diff / 2;
        const labelPos = new THREE.Vector3(
          this.start.x + Math.cos(midAngle) * (radius + 0.1),
          0,
          this.start.z + Math.sin(midAngle) * (radius + 0.1),
        );
        if (!this.angleLabel) {
          const el = document.createElement('div');
          el.className = 'angle-label';
          el.style.position = 'absolute';
          el.style.transform = 'translate(-50%, -50%)';
          document.body.appendChild(el);
          this.angleLabel = el;
        }
        this.angleLabel.textContent = `${Math.round(
          THREE.MathUtils.radToDeg(absDiff),
        )}\u00b0`;
        const { x, y } = this.worldToScreen(labelPos);
        this.angleLabel.style.left = `${x}px`;
        this.angleLabel.style.top = `${y}px`;
        const highlight =
          Math.abs(absDiff - Math.PI / 2) > this.rightAngleTolerance;
        const color = highlight ? '#f00' : '#000';
        (this.angleArc.material as THREE.LineBasicMaterial).color.set(color);
        this.angleLabel.style.color = color;
      } else {
        if (this.angleArc) {
          this.scene.remove(this.angleArc);
          this.angleArc.geometry.dispose();
          (this.angleArc.material as THREE.Material).dispose();
          this.angleArc = null;
        }
        if (this.angleLabel) {
          this.angleLabel.remove();
          this.angleLabel = null;
        }
      }
    } else if (this.mode === 'edit') {
      if (this.dragType === 'mid' && this.moving) {
        const delta = point.clone().sub(this.start);
        const dir = this.moving.segEnd
          .clone()
          .sub(this.moving.segStart)
          .normalize();
        const perp = new THREE.Vector3(-dir.z, 0, dir.x);
        const offset = perp.multiplyScalar(delta.dot(perp));
        const newStart = this.moving.segStart.clone().add(offset);
        const newEnd = this.moving.segEnd.clone().add(offset);
        const positions = (this.preview.geometry as THREE.BufferGeometry)
          .attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, newStart.x, 0, newStart.z);
        positions.setXYZ(1, newEnd.x, 0, newEnd.z);
        positions.needsUpdate = true;
        this.updateEditHandles(newStart, newEnd);
      } else if (this.dragType === 'start' || this.dragType === 'end') {
        const { snapLength } = this.store.getState();
        const positions = (this.preview.geometry as THREE.BufferGeometry)
          .attributes.position as THREE.BufferAttribute;
        if (this.dragType === 'start' && this.moving) {
          const end = this.moving.segEnd.clone();
          const vec = end.clone().sub(point);
          const length = vec.length();
          const lengthMm = length * 1000;
          const snappedLengthMm = snapLength
            ? Math.round(lengthMm / snapLength) * snapLength
            : lengthMm;
          const snappedLength = snappedLengthMm / 1000;
          let angle = Math.atan2(vec.z, vec.x);
          angle = this.applyAngleSnap(angle);
          const dir = new THREE.Vector3(
            Math.cos(angle),
            0,
            Math.sin(angle),
          );
          const newStart = end
            .clone()
            .sub(dir.clone().multiplyScalar(snappedLength));
          const newEnd = end;
          positions.setXYZ(0, newStart.x, 0, newStart.z);
          positions.setXYZ(1, newEnd.x, 0, newEnd.z);
          positions.needsUpdate = true;
          this.currentAngle = angle;
          this.onLengthChange?.(snappedLengthMm);
          this.onAngleChange?.(THREE.MathUtils.radToDeg(angle));
          this.updateEditHandles(newStart, newEnd);
        } else if (this.dragType === 'end' && this.moving) {
          const start = this.moving.segStart.clone();
          const vec = point.clone().sub(start);
          const length = vec.length();
          const lengthMm = length * 1000;
          const snappedLengthMm = snapLength
            ? Math.round(lengthMm / snapLength) * snapLength
            : lengthMm;
          const snappedLength = snappedLengthMm / 1000;
          let angle = Math.atan2(vec.z, vec.x);
          angle = this.applyAngleSnap(angle);
          const dir = new THREE.Vector3(
            Math.cos(angle),
            0,
            Math.sin(angle),
          );
          const newStart = start;
          const newEnd = start.clone().add(dir.clone().multiplyScalar(snappedLength));
          positions.setXYZ(0, newStart.x, 0, newStart.z);
          positions.setXYZ(1, newEnd.x, 0, newEnd.z);
          positions.needsUpdate = true;
          this.currentAngle = angle;
          this.onLengthChange?.(snappedLengthMm);
          this.onAngleChange?.(THREE.MathUtils.radToDeg(angle));
          this.updateEditHandles(newStart, newEnd);
        }
      }
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
    mesh.scale.x = lengthM;
    mesh.scale.z = this.currentThickness;
    const dir = new THREE.Vector3(
      Math.cos(this.currentAngle),
      0,
      Math.sin(this.currentAngle),
    );
    const mid = this.start.clone().add(dir.clone().multiplyScalar(lengthM / 2));
    mesh.position.set(mid.x, 0.001, mid.z);
    mesh.rotation.y = this.currentAngle;
    this.finalizeSegment(end, lengthMm);
  }

  private finalizeSegment(end: THREE.Vector3, manualLength?: number) {
    if (!this.start || !this.preview) return;
    const state = this.store.getState();
    const snap = this.findClosestPoint(end);
    const target = snap ? snap.clone() : end.clone();
    this.updateSnapPreview(null);

    const segStart = this.start.clone();
    const dx = target.x - segStart.x;
    const dz = target.z - segStart.z;
    let angle = Math.atan2(dz, dx);
    angle = this.applyAngleSnap(angle);
    const angleDeg = THREE.MathUtils.radToDeg(angle);
    const lengthMm = Math.sqrt(dx * dx + dz * dz) * 1000;
    if (lengthMm < 1) {
      this.cleanupPreview();
      this.start = null;
      this.dragStart = null;
      this.dragStartClient = null;
      this.isDragging = false;
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
    state.addWall({ length: snappedLength, angle: (angleDeg + 360) % 360, thickness });
    this.currentThickness = thickness / 1000;
    this.cleanupPreview();
    this.start = null;
    this.dragStart = null;
    this.dragStartClient = null;
    this.isDragging = false;
    this.currentAngle = 0;
    this.updateLabels();
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
    state.addWall({
      length,
      angle: 0,
      thickness,
      arc: { radius: r, angle: sweep },
    });
    this.arcCenter = null;
    this.updateLabels();
  }

  private placeSquare(start: THREE.Vector3) {
    const state = this.store.getState();
    const size = this.currentThickness || state.wallThickness / 1000;
    let square: THREE.Mesh;
    if (this.startCircle) {
      square = this.startCircle;
      this.startCircle = null;
    } else {
      const geom = new THREE.BoxGeometry(size, 0.01, size);
      geom.translate(0, 0.005, 0);
      let mat: THREE.Material;
      try {
        [, mat] = createWallMaterial(state.wallType);
      } catch {
        mat = new THREE.MeshBasicMaterial({ color: 0xd1d5db });
      }
      square = new THREE.Mesh(geom, mat);
      square.position.set(start.x, 0.001, start.z);
      this.scene.add(square);
    }
    if (state.room.walls.length === 0) {
      state.setRoom({ origin: { x: start.x * 1000, y: start.z * 1000 } });
    }
    const thickness = size * 1000;
    const lastAngle = state.defaultSquareAngle ?? 0;
    const id = state.addWall({ length: thickness, angle: lastAngle, thickness });
    this.squareMeshes.set(id, square);
  }

  private onUp = (e: PointerEvent) => {
    this.renderer.domElement.releasePointerCapture(e.pointerId);
    if (e.button !== 0) return;
    try {
      if (this.mode === 'opening') {
        this.openingEdit = null;
        return;
      }
      if (this.mode === 'draw') {
        if (!this.start) {
          this.cleanupPreview();
          return;
        }
        const end = this.getPoint(e);
        if (!end) {
          this.disable();
          return;
        }
        let worldDist = 0;
        let screenDist = DRAG_PIXEL_THRESHOLD + 1;
        if (this.dragStart && this.dragStartClient) {
          worldDist = this.dragStart.distanceTo(end);
          if (e.clientX !== undefined && e.clientY !== undefined) {
            screenDist = Math.hypot(
              e.clientX - this.dragStartClient.x,
              e.clientY - this.dragStartClient.y,
            );
          }
        }
        if (
          worldDist < DRAG_WORLD_THRESHOLD &&
          screenDist < DRAG_PIXEL_THRESHOLD
        ) {
          this.placeSquare(this.start.clone());
          this.cleanupPreview();
          this.start = null;
        } else if (this.preview) {
          this.finalizeSegment(end);
        } else {
          this.cleanupPreview();
          this.start = null;
        }
      } else if (!this.start || !this.preview) {
        this.cleanupPreview();
        this.start = null;
        return;
      } else if (this.mode === 'edit') {
        if (this.editingIndex === null || !this.preview) {
          this.cleanupPreview();
          this.start = null;
          this.moving = null;
          this.dragType = null;
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
        if (this.dragType === 'start' || this.dragType === 'mid') {
          if (this.moving && this.moving.prevAnchor) {
            const prev = walls[this.editingIndex - 1];
            const p = this.moving.prevAnchor;
            const prevAng =
              (Math.atan2(newStart.z - p.z, newStart.x - p.x) * 180) /
              Math.PI;
            const prevLen = p.distanceTo(newStart) * 1000;
            updateWall(prev.id, {
              length: prevLen,
              angle: (prevAng + 360) % 360,
            });
          } else {
            setRoom({ origin: { x: newStart.x * 1000, y: newStart.z * 1000 } });
          }
        }
        if (this.dragType === 'end' || this.dragType === 'mid') {
          if (this.moving && this.moving.nextAnchor) {
            const next = walls[this.editingIndex + 1];
            const n = this.moving.nextAnchor;
            const nextAng =
              (Math.atan2(n.z - newEnd.z, n.x - newEnd.x) * 180) /
              Math.PI;
            const nextLen = newEnd.distanceTo(n) * 1000;
            updateWall(next.id, {
              length: nextLen,
              angle: (nextAng + 360) % 360,
            });
          }
        }
        this.start = null;
        this.editingIndex = null;
        this.moving = null;
        this.dragType = null;
        this.cleanupPreview();
        this.updateLabels();
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
    } finally {
      this.dragStart = null;
      this.dragStartClient = null;
      this.isDragging = false;
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && this.overlay && e.target === this.overlay) {
      e.preventDefault();
      const val = parseFloat(this.overlay.value);
      this.applyLength(val);
    }
  };
}

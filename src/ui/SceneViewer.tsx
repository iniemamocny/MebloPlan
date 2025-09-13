import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type CabinetDragger from '../viewer/CabinetDragger';
import WallDrawer from '../viewer/WallDrawer';
import { setupThree } from '../scene/engine';
import { buildCabinetMesh } from '../scene/cabinetBuilder';
import { FAMILY } from '../core/catalog';
import { usePlannerStore, legCategories } from '../state/store';
import { Module3D, ModuleAdv, Globals } from '../types';
import { loadItemModel } from '../scene/itemLoader';
import ItemHotbar, {
  hotbarItems,
  furnishHotbarItems,
} from './components/ItemHotbar';
import RoomToolBar from './components/RoomToolBar';
import TouchJoystick from './components/TouchJoystick';
import { PlayerMode, PlayerSubMode, PLAYER_MODES } from './types';
import RadialMenu from './components/RadialMenu';

interface ThreeContext {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  playerControls: PointerLockControls;
  group: THREE.Group;
  cabinetDragger: CabinetDragger;
  perspectiveCamera: THREE.PerspectiveCamera;
  orthographicCamera: THREE.OrthographicCamera;
  axesHelper?: THREE.AxesHelper;
  setCamera?: (cam: THREE.Camera) => void;
  setControls?: (c: OrbitControls) => void;
  updateGrid?: (divisions: number) => void;
  setPlayerParams?: (p: { height?: number; speed?: number }) => void;
  setMove?: (m: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  }) => void;
  setMoveFromJoystick?: (v: { x: number; y: number }) => void;
  updateCameraRotation?: (dx: number, dy: number) => void;
  resetCameraRotation?: () => void;
  onJump?: () => void;
  onCrouch?: (active: boolean) => void;
  dispose?: () => void;
  showPointerLockError?: (msg: string) => void;
}

interface Props {
  threeRef: React.MutableRefObject<ThreeContext | null>;
  addCountertop: boolean;
  mode: PlayerMode;
  setMode: React.Dispatch<React.SetStateAction<PlayerMode>>;
  viewMode: '3d' | '2d';
  setViewMode: (v: '3d' | '2d') => void;
  showRoomTools?: boolean;
}

const INTERACT_DISTANCE = 1.5;
const PLATE_HEIGHT = 0.02;
const MODE_ICONS: Record<PlayerSubMode, string> = {
  furnish: '🪑',
  decorate: '🎨',
};

export const getLegHeight = (mod: Module3D, globals: Globals): number => {
  if (mod.family !== FAMILY.BASE) return 0;
  const h =
    mod.adv?.legs?.height ?? globals[mod.family]?.legsHeight;
  if (typeof h === 'number') return h / 1000;
  return 0.1;
};

const SceneViewer: React.FC<Props> = ({
  threeRef,
  addCountertop,
  mode,
  setMode,
  viewMode = '3d',
  setViewMode,
  showRoomTools,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const axesRef = useRef<HTMLCanvasElement>(null);
  const store = usePlannerStore();
  const selectedTool = usePlannerStore((s) => s.selectedTool);
  const wallThickness = usePlannerStore((s) => s.wallDefaults.thickness);
  const wallHeight = usePlannerStore((s) => s.wallDefaults.height);
  const showEdges = store.role === 'stolarz';
  const showFronts = store.showFronts;
  const threeInitialized = useRef(false);

  const [isMobile, setIsMobile] = useState(false);
  const [showRadial, setShowRadial] = useState(false);
  const lookVec = useRef({ x: 0, y: 0 });
  const targetRef = useRef<{ cab: THREE.Object3D; index: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [targetCabinet, setTargetCabinet] = useState<THREE.Object3D | null>(null);
  const ghostRef = useRef<THREE.Object3D | null>(null);
  const savedView = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const roomRef = useRef(store.room);
  const [pointerLockError, setPointerLockError] = useState<string | null>(null);
  const wallDrawerRef = useRef<WallDrawer | null>(null);
  const wallGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const canvas = axesRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    } catch {
      // WebGL not available (e.g., in tests)
    }
    renderer?.setSize(80, 80);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    camera.position.set(0, 0, 2);
    const axes = new THREE.AxesHelper(0.5);
    scene.add(axes);
    renderer?.render(scene, camera);
    if (threeRef.current) {
      threeRef.current.axesHelper = axes;
    } else {
      setTimeout(() => {
        if (threeRef.current) threeRef.current.axesHelper = axes;
      });
    }
    return () => {
      renderer?.dispose();
      if (threeRef.current) {
        delete threeRef.current.axesHelper;
      }
    };
  }, [viewMode, threeRef]);

  useEffect(() => {
    roomRef.current = store.room;
  }, [store.room]);

  // Removed automatic switch to 3D when room drawing ends.

  const radialItems = mode === 'furnish' ? furnishHotbarItems : hotbarItems;

  const applyViewMode = React.useCallback(
    (mode: '3d' | '2d') => {
      const three = threeRef.current;
      if (!three?.renderer || !three.setCamera || !three.setControls) return;
      three.camera.up.set(0, 1, 0);
      if ((three as any).gridChangeHandler) {
        three.controls.removeEventListener('change', (three as any).gridChangeHandler);
        (three as any).gridChangeHandler = null;
      }
      if (mode === '2d') {
        savedView.current = {
          pos: three.perspectiveCamera.position.clone(),
          target: three.controls.target.clone(),
        };
        three.setCamera(three.orthographicCamera);
        three.controls.dispose();
        const c = new OrbitControls(three.camera, three.renderer.domElement);
        c.enableDamping = true;
        c.enableRotate = false;
        c.screenSpacePanning = true;
        three.setControls(c);
        const pos = savedView.current.pos;
        const height = 10;
        three.camera.position.set(pos.x, height, pos.z);
        c.target.set(pos.x, 0, pos.z);
        three.camera.lookAt(c.target);
        c.update();
        const updateGrid = () => {
          three.camera.position.y = height;
          c.target.y = 0;
          const base = Math.max(
            1,
            Math.round(16 / (usePlannerStore.getState().gridSize / 100)),
          );
          const divisions = Math.max(
            1,
            Math.round(base * three.orthographicCamera.zoom),
          );
          three.updateGrid?.(divisions);
        };
        c.addEventListener('change', updateGrid);
        (three as any).gridChangeHandler = updateGrid;
        updateGrid();
      } else {
        three.setCamera(three.perspectiveCamera);
        three.controls.dispose();
        const c = new OrbitControls(three.camera, three.renderer.domElement);
        c.enableDamping = true;
        c.enableRotate = true;
        three.setControls(c);
        if (savedView.current) {
          three.camera.position.copy(savedView.current.pos);
          c.target.copy(savedView.current.target);
        }
        c.update();
        const base = Math.max(
          1,
          Math.round(16 / (usePlannerStore.getState().gridSize / 100)),
        );
        three.updateGrid?.(base);
      }
    },
    [threeRef],
  );

  useEffect(() => {
    if (!threeInitialized.current) return;
    applyViewMode(viewMode);
  }, [viewMode, applyViewMode]);

  const updateGhost = React.useCallback(() => {
    const three = threeRef.current;
    if (!three) return;
    const group = three.group;
    if (ghostRef.current) {
      group.remove(ghostRef.current);
      ghostRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      ghostRef.current = null;
    }
    if (mode !== 'decorate') return;
    const type = hotbarItems[store.selectedItemSlot - 1];
    if (!type) return;
    const cab = targetCabinet;
    if (!cab || !cab.userData?.moduleId) return;
    const surfaces: THREE.Mesh[] = [];
    cab.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData?.placeable) {
        surfaces.push(obj);
      }
    });
    const cabId = cab.userData.moduleId;
    let chosen: THREE.Mesh | null = null;
    let pos = new THREE.Vector3();
    let baseY = 0;
    let finalY = 0;
    let surfaceIndex = -1;
    for (let i = 0; i < surfaces.length; i++) {
      const surf = surfaces[i];
      const p = surf.getWorldPosition(new THREE.Vector3());
      const params = (surf.geometry as any).parameters || {};
      const h = params.height || 0;
      const topY = p.y + h / 2;
      const base = topY + 0.05;
      const existing = store.itemsBySurface(cabId, i);
      if (existing.length > 0) {
        if (type === 'plate' && existing.every((it) => it.type === 'plate')) {
          chosen = surf;
          pos = p;
          baseY = base;
          finalY = base + PLATE_HEIGHT * existing.length;
          surfaceIndex = i;
          break;
        }
        continue;
      }
      chosen = surf;
      pos = p;
      baseY = base;
      finalY = base;
      surfaceIndex = i;
      break;
    }
    if (!chosen) return;
    const ghost = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
      }),
    );
    ghost.position.set(pos.x, finalY, pos.z);
    (ghost as any).userData.surfaceIndex = surfaceIndex;
    (ghost as any).userData.baseY = baseY;
    group.add(ghost);
    ghostRef.current = ghost;
  }, [threeRef, mode, store.selectedItemSlot, targetCabinet, store.items]);

  useEffect(() => {
    setIsMobile(
      typeof window !== 'undefined' &&
        ("ontouchstart" in window ||
          (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)),
    );
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    threeRef.current = setupThree(containerRef.current) as ThreeContext;
    wallDrawerRef.current = new WallDrawer(
      threeRef.current.renderer,
      () => threeRef.current!.camera,
      threeRef.current.group,
      usePlannerStore,
    );
    threeInitialized.current = true;
    if (viewMode === '2d') applyViewMode(viewMode);
    (threeRef.current as any).setMode = setMode;
    threeRef.current.showPointerLockError = (msg: string) => setPointerLockError(msg);
    const pc = threeRef.current.playerControls;
    const onUnlock = () => setMode(null);
    const onLock = () => {
      // pointer lock acquired
      setPointerLockError(null);
      return;
    };
    const onPointerlockError = () => {
      setMode(null);
      const supported = 'pointerLockElement' in document;
      const msg = supported
        ? 'Pointer lock failed'
        : 'Pointer lock not supported';
      setPointerLockError(msg);
    };
    pc.addEventListener('unlock', onUnlock);
    pc.addEventListener('lock', onLock);
    pc.addEventListener('pointerlockerror', onPointerlockError);
    return () => {
      pc.removeEventListener('unlock', onUnlock);
      pc.removeEventListener('lock', onLock);
      pc.removeEventListener('pointerlockerror', onPointerlockError);
      wallDrawerRef.current?.disable();
      threeRef.current?.dispose?.();
    };
  }, [threeRef]);

  useEffect(() => {
    const container = containerRef.current;
    const three = threeRef.current;
    if (!container || !three) return;
    if (typeof WebGLRenderingContext === 'undefined') return;
    const size = 80;
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.bottom = '0';
    overlay.style.right = '0';
    overlay.style.width = `${size}px`;
    overlay.style.height = `${size}px`;
    overlay.style.pointerEvents = 'none';
    container.appendChild(overlay);

    const axesRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    axesRenderer.setSize(size, size);
    axesRenderer.setClearColor(0x000000, 0);
    axesRenderer.domElement.style.pointerEvents = 'none';
    overlay.appendChild(axesRenderer.domElement);

    const axesScene = new THREE.Scene();
    const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    axesCamera.position.set(2, 2, 2);
    axesCamera.lookAt(0, 0, 0);
    const axes = new THREE.AxesHelper(1);
    axesScene.add(axes);
    if (threeRef.current) {
      threeRef.current.axesHelper = axes;
    }

    let anim: number;
    const renderGizmo = () => {
      anim = requestAnimationFrame(renderGizmo);
      if (threeRef.current?.camera) {
        axesCamera.quaternion.copy(threeRef.current.camera.quaternion);
      }
      axesRenderer.render(axesScene, axesCamera);
    };
    renderGizmo();

    return () => {
      cancelAnimationFrame(anim);
      axesRenderer.dispose();
      overlay.remove();
      if (threeRef.current) {
        delete threeRef.current.axesHelper;
      }
    };
  }, [threeRef, viewMode]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three) return;
    if (viewMode === '2d') {
      three.cabinetDragger.disable();
      three.playerControls.unlock();
      three.controls.enabled = true;
      return;
    }
    if (mode === 'furnish') {
      three.controls.enabled = false;
      three.cabinetDragger.enable();
      three.camera.position.y = store.playerHeight;
    } else {
      three.cabinetDragger.disable();
      if (mode) {
        three.controls.enabled = false;
        three.camera.position.y = store.playerHeight;
      } else {
        three.playerControls.unlock();
        three.controls.enabled = true;
      }
    }
  }, [mode, threeRef, store.playerHeight, viewMode]);

  useEffect(() => {
    const drawer = wallDrawerRef.current;
    if (!drawer) return;
    // ensure previous listeners are removed before possibly enabling again
    drawer.disable();
    if (viewMode === '2d' && selectedTool === 'wall') {
      drawer.enable(wallThickness);
    }
    return () => {
      drawer.disable();
    };
  }, [viewMode, selectedTool, wallThickness]);

  useEffect(() => {
    threeRef.current?.setPlayerParams?.({
      height: store.playerHeight,
      speed: store.playerSpeed,
    });
  }, [store.playerHeight, store.playerSpeed, threeRef]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three) return;
    const { roomShape, wallDefaults } = usePlannerStore.getState();
    const segments = roomShape.segments;
    const group = three.group;
    if (!group) return;
    if (wallGroupRef.current) {
      group.remove(wallGroupRef.current);
      wallGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose());
          else (obj.material as THREE.Material).dispose();
        }
      });
    }
    const wallGroup = new THREE.Group();
    const width = wallDefaults.thickness / 1000;
    const height = wallDefaults.height / 1000;
    segments.forEach(({ start, end }) => {
      const dx = end.x - start.x;
      const dz = -(end.y - start.y);
      const length = Math.sqrt(dx * dx + dz * dz);
      const geom = new THREE.BoxGeometry(length, height, width);
      geom.translate(length / 2, 0, 0);
      const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(start.x, height / 2, -start.y);
      mesh.rotation.y = Math.atan2(dz, dx);
      wallGroup.add(mesh);
    });
    group.add(wallGroup);
    wallGroupRef.current = wallGroup;
  }, [store.roomShape, wallThickness, wallHeight]);

    useEffect(() => {
      if (!mode) return;
      let id = 0;
      const loop = () => {
        const { x, y } = lookVec.current;
        if (x !== 0 || y !== 0) {
          threeRef.current?.updateCameraRotation?.(x * 2, y * 2);
        }
        if (mode) {
          id = requestAnimationFrame(loop);
        }
      };
      id = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(id);
    }, [threeRef, mode]);

  useEffect(() => {
    if (!mode) return;
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        return;
      }
      if (e.type === 'keydown') {
        const n = Number(e.key);
        if (n >= 1 && n <= 9) {
          store.setSelectedItemSlot(n);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, [store, mode]);

  useEffect(() => {
    if (mode === null) return;
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ') {
        setShowRadial(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ') {
        setShowRadial(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      setShowRadial(false);
    };
  }, [mode]);

  useEffect(() => {
    if (mode === null) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      setMode((m) => {
        const idx = PLAYER_MODES.indexOf(m as PlayerSubMode);
        return PLAYER_MODES[(idx + 1) % PLAYER_MODES.length];
      });
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [mode, setMode]);

  useEffect(() => {
    updateGhost();
  }, [updateGhost]);

  const createCabinetMesh = (mod: Module3D, legHeight: number) => {
    const W = mod.size.w;
    const H = mod.size.h;
    const D = mod.size.d;
    const adv: ModuleAdv = mod.adv ?? {};
    const drawers = Array.isArray(adv.drawerFronts)
      ? adv.drawerFronts.length
      : 0;
    const hinge = (adv as any).hinge as 'left' | 'right' | undefined;
    const dividerPosition =
      drawers > 0
        ? undefined
        : ((adv as any).dividerPosition as
            | 'left'
            | 'right'
            | 'center'
            | undefined);
    const legOffset =
      adv.legs?.legsOffset ?? store.globals[mod.family]?.legsOffset ?? 0;
    const legCategory =
      adv.legs?.category ??
      (adv.legs?.type ? legCategories[adv.legs.type] : undefined);
    const legCategoryToType: Record<string, 'standard' | 'reinforced' | 'decorative'> = {
      standard: 'standard',
      reinforced: 'reinforced',
      decorative: 'decorative',
    };
    const legsType = legCategory ? legCategoryToType[legCategory] : undefined;
    const group = buildCabinetMesh({
      width: W,
      height: H,
      depth: D,
      drawers,
      gaps: adv.gaps || { top: 0, bottom: 0 },
      drawerFronts: adv.drawerFronts,
      family: mod.family,
      shelves: adv.shelves,
      backPanel: adv.backPanel,
      topPanel: adv.topPanel,
      bottomPanel: adv.bottomPanel,
      legHeight,
      legsOffset: legOffset / 1000,
      legsType,
      showHandles: true,
      hinge,
      dividerPosition,
      showEdges,
      rightSideEdgeBanding: adv.rightSideEdgeBanding,
      leftSideEdgeBanding: adv.leftSideEdgeBanding,
      traverseEdgeBanding: adv.traverseEdgeBanding,
      shelfEdgeBanding: adv.shelfEdgeBanding,
      backEdgeBanding: adv.backEdgeBanding,
      topPanelEdgeBanding: adv.topPanelEdgeBanding,
      bottomPanelEdgeBanding: adv.bottomPanelEdgeBanding,
      carcassType: adv.carcassType,
      showFronts,
    });
    group.userData.kind = 'cab';
    group.userData.moduleId = mod.id;
    const fg = group.userData.frontGroups || [];
    group.userData.openStates =
      mod.openStates?.slice(0, fg.length) || new Array(fg.length).fill(false);
    group.userData.openProgress = new Array(fg.length).fill(0);
    group.userData.animSpeed = (adv as any).animationSpeed ?? 0.15;
    fg.forEach((g: THREE.Object3D) => (g.visible = showFronts));
    return group;
  };

  const drawScene = () => {
    const group = threeRef.current?.group;
    if (!group) return;
    [...group.children].forEach((c) => {
      if (
        c.userData?.kind === 'cab' ||
        c.userData?.kind === 'top' ||
        c.userData?.kind === 'item'
      ) {
        group.remove(c);
        c.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material))
              obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
      }
    });
    store.modules.forEach((m: Module3D) => {
      const legHeight = getLegHeight(m, store.globals);
      const cabMesh = createCabinetMesh(m, legHeight);
      const fgs: THREE.Object3D[] = cabMesh.userData.frontGroups || [];
      fgs.forEach((fg) => (fg.visible = showFronts));
      const baseY = m.family === FAMILY.BASE ? 0 : m.position[1];
      cabMesh.position.set(m.position[0], baseY, m.position[2]);
      cabMesh.rotation.y = m.rotationY || 0;
      group.add(cabMesh);
      if (addCountertop && m.family === FAMILY.BASE) {
        const topThickness = 0.04;
        const top = new THREE.Mesh(
          new THREE.BoxGeometry(m.size.w, topThickness, m.size.d),
          new THREE.MeshStandardMaterial({ color: 0xbfa06a }),
        );
        const topY = baseY + legHeight + m.size.h + topThickness / 2;
        top.position.set(m.position[0], topY, m.position[2]);
        top.rotation.y = m.rotationY || 0;
        top.userData.kind = 'top';
        group.add(top);
      }
    });

    store.items.forEach((it) => {
      loadItemModel(it.type)
        .then((obj) => {
          obj.position.set(it.position[0], it.position[1], it.position[2]);
          obj.rotation.set(it.rotation[0], it.rotation[1], it.rotation[2]);
          obj.userData.kind = 'item';
          obj.userData.itemId = it.id;
          group.add(obj);
        })
        .catch(() => {
          const placeholder = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xff00ff }),
          );
          placeholder.position.set(
            it.position[0],
            it.position[1],
            it.position[2],
          );
          placeholder.rotation.set(
            it.rotation[0],
            it.rotation[1],
            it.rotation[2],
          );
          placeholder.userData.kind = 'item';
          placeholder.userData.itemId = it.id;
          group.add(placeholder);
        });
    });
  };
  useEffect(drawScene, [
    store.modules,
    store.items,
    addCountertop,
    showEdges,
    showFronts,
    store.room.height,
  ]);


  useEffect(() => {
    const three = threeRef.current;
    if (!three || !three.renderer || !three.camera || !three.group) return;
    const renderer = three.renderer as THREE.WebGLRenderer;
    const camera = three.camera;
    const group = three.group as THREE.Group;
    const raycaster = new THREE.Raycaster();
    const handlePointer = (event: PointerEvent) => {
      if (mode) {
        if (event.button === 2) {
          const target = targetRef.current;
          if (target) {
            const { cab, index } = target;
            const openStates: boolean[] = cab.userData.openStates || [];
            if (index >= 0 && index < openStates.length) {
              openStates[index] = !openStates[index];
              cab.userData.openStates = openStates;
            }
          }
        } else if (event.button === 0 && mode === 'decorate') {
          const ghost = ghostRef.current;
          const type = hotbarItems[store.selectedItemSlot - 1];
          const cab = targetCabinet;
          if (!ghost || !type || !cab || !cab.userData?.moduleId) return;
          const surfaceIndex = ghost.userData?.surfaceIndex;
          const baseY = ghost.userData?.baseY ?? ghost.position.y;
          if (surfaceIndex === undefined) return;
          const existing = store.itemsBySurface(
            cab.userData.moduleId,
            surfaceIndex,
          );
          if (
            existing.length > 0 &&
            (type !== 'plate' || existing.some((it) => it.type !== 'plate'))
          )
            return;
          const pos = ghost.position.clone();
          pos.y = baseY + (type === 'plate' ? PLATE_HEIGHT * existing.length : 0);
          const id = Math.random().toString(36).slice(2);
          loadItemModel(type)
            .catch(() => null)
            .finally(() => {
              store.addItem({
                id,
                type,
                position: [pos.x, pos.y, pos.z],
                rotation: [0, 0, 0],
                cabinetId: cab.userData.moduleId,
                shelfIndex: surfaceIndex,
              });
              updateGhost();
            });
          group.remove(ghost);
          ghostRef.current = null;
        }
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(group.children, true);
      if (intersects.length === 0 || event.button !== 2) return;
      let obj: THREE.Object3D | null = null;
      for (const inter of intersects) {
        obj = inter.object;
        let ignore = false;
        while (obj) {
          if (obj.userData?.ignoreRaycast) {
            ignore = true;
            break;
          }
          if (obj.userData?.frontIndex !== undefined) break;
          obj = obj.parent;
        }
        if (ignore || !obj || obj.userData?.frontIndex === undefined) {
          obj = null;
          continue;
        }
        if (obj.userData.isHandle) {
          obj = obj.parent;
          if (!obj || obj.userData?.frontIndex === undefined) {
            obj = null;
          } else {
            obj = null;
          }
          break;
        }
        break;
      }
      if (!obj || obj.userData?.frontIndex === undefined) return;
      const { frontIndex } = obj.userData as { frontIndex?: number };
      let cab: THREE.Object3D | null = obj;
      while (cab && cab.userData?.kind !== 'cab') {
        cab = cab.parent;
      }
      if (!cab || !cab.userData) return;
      const openStates: boolean[] = cab.userData.openStates || [];
      if (frontIndex >= 0 && frontIndex < openStates.length) {
        openStates[frontIndex] = !openStates[frontIndex];
        cab.userData.openStates = openStates;
      }
    };
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();
    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('pointerup', handlePointer);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('pointerup', handlePointer);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [
    store.modules,
    mode,
    targetCabinet,
    store.selectedItemSlot,
    store.items,
    updateGhost,
  ]);

    useEffect(() => {
      if (!mode) return;
      let animId: number;
      const raycaster = new THREE.Raycaster();
      const detect = () => {
        const three = threeRef.current;
        if (mode && three && three.group) {
          const camera = three.camera;
          const group = three.group as THREE.Group;
          const origin = camera.getWorldPosition(new THREE.Vector3());
          const dir = camera.getWorldDirection(new THREE.Vector3());
          raycaster.set(origin, dir);
          raycaster.far = INTERACT_DISTANCE;
          const intersects = raycaster.intersectObjects(group.children, true);
          let target: { cab: THREE.Object3D; index: number } | null = null;
          for (const inter of intersects) {
            let obj: THREE.Object3D | null = inter.object;
            let ignore = false;
            while (obj) {
              if (obj.userData?.ignoreRaycast) {
                ignore = true;
                break;
              }
              if (obj.userData?.frontIndex !== undefined) break;
              obj = obj.parent;
            }
            if (ignore || !obj || obj.userData?.frontIndex === undefined) {
              continue;
            }
            if (obj.userData.isHandle) {
              obj = obj.parent;
              if (!obj || obj.userData?.frontIndex === undefined) {
                continue;
              }
            }
            let cab: THREE.Object3D | null = obj;
            while (cab && cab.userData?.kind !== 'cab') {
              cab = cab.parent;
            }
            if (!cab) continue;
            target = { cab, index: obj.userData.frontIndex };
            break;
          }
          targetRef.current = target;
          setShowHint(!!target);
          setTargetCabinet(target?.cab || null);
        } else {
          targetRef.current = null;
          setShowHint(false);
          setTargetCabinet(null);
        }
        if (mode) {
          animId = requestAnimationFrame(detect);
        }
      };
      animId = requestAnimationFrame(detect);
      return () => {
        cancelAnimationFrame(animId);
      };
    }, [mode, threeRef]);

    useEffect(() => {
      if (!mode) return;
      let animId: number;
      const animate = () => {
        const three = threeRef.current;
        if (three && three.group) {
          const group = three.group as THREE.Group;
          group.children.forEach((cab) => {
            if (cab.userData?.kind === 'cab') {
              const openStates: boolean[] = cab.userData.openStates || [];
              const openProgress: number[] = cab.userData.openProgress || [];
              const frontGroups: THREE.Object3D[] =
                cab.userData.frontGroups || [];
              openStates.forEach((target, idx) => {
                let prog = openProgress[idx] ?? 0;
                const dest = target ? 1 : 0;
                const diff = dest - prog;
                if (Math.abs(diff) > 0.001) {
                  const speed = cab.userData.animSpeed || 0.15;
                  prog += diff * speed;
                  if (Math.abs(dest - prog) < 0.02) prog = dest;
                  openProgress[idx] = prog;
                  const fg = frontGroups[idx];
                  if (fg) {
                    if (fg.userData.type === 'door') {
                      const hingeSide = fg.userData.hingeSide || 'left';
                      const sign = hingeSide === 'left' ? -1 : 1;
                      fg.rotation.y = ((sign * Math.PI) / 2) * prog;
                    } else if (fg.userData.type === 'drawer') {
                      const slide = fg.userData.slideDist || 0.45;
                      fg.position.z = (fg.userData.closedZ ?? 0) - slide * prog;
                    }
                  }
                }
              });
            }
          });
        }
        if (mode) {
          animId = requestAnimationFrame(animate);
        }
      };
      animId = requestAnimationFrame(animate);
      return () => {
        cancelAnimationFrame(animId);
      };
    }, [mode, threeRef]);

  const handleZoomIn = () => {
    const controls = threeRef.current?.controls;
    if (controls) {
      controls.dollyIn(0.95);
      controls.update();
    }
  };

  const handleZoomOut = () => {
    const controls = threeRef.current?.controls;
    if (controls) {
      controls.dollyOut(0.95);
      controls.update();
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <canvas
        ref={axesRef}
        data-testid="axes-gizmo"
        width={80}
        height={80}
        style={{
          position: 'absolute',
          right: 10,
          bottom: 10,
          width: 80,
          height: 80,
          pointerEvents: 'none',
        }}
      />
      <RadialMenu
        items={radialItems}
        selected={store.selectedItemSlot}
        onSelect={(slot) => {
          store.setSelectedItemSlot(slot);
          const tool = radialItems[slot - 1];
          if (tool === 'window' || tool === 'door') {
            store.setSelectedTool(tool);
          } else {
            store.setSelectedTool(null);
          }
        }}
        visible={showRadial}
      />
      {mode === null && (
        <div className="zoomControls">
          <button className="btnGhost" onClick={handleZoomIn}>
            +
          </button>
          <button className="btnGhost" onClick={handleZoomOut}>
            −
          </button>
        </div>
      )}
      {mode && showHint && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 24 }}>✛</div>
          <div style={{ fontSize: 12 }}>Kliknij, aby otworzyć</div>
        </div>
      )}
      {pointerLockError && (
        <div
          data-testid="pointerlock-error"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            padding: 8,
            borderRadius: 4,
            textAlign: 'center',
          }}
        >
          {pointerLockError}
        </div>
      )}
      {viewMode === '2d' && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'flex',
            gap: 8,
          }}
        >
          <button
            data-testid="switch-3d"
            className="btnGhost"
            onClick={() => setViewMode('3d')}
          >
            Widok 3D
          </button>
        </div>
      )}
      {mode && <ItemHotbar mode={mode} />}
      {showRoomTools && <RoomToolBar />}
      {mode && isMobile && (
        <>
          <TouchJoystick
            style={{ left: 16, bottom: 16 }}
            onMove={(x, y, _a) =>
              threeRef.current?.setMoveFromJoystick?.({ x, y })
            }
          />
          <TouchJoystick
            style={{ right: 16, bottom: 16 }}
            onMove={(x, y, active) => {
              lookVec.current = active ? { x, y } : { x: 0, y: 0 };
            }}
          />
          <button
            className="btnGhost"
            style={{ position: 'absolute', right: 96, bottom: 16 }}
            onClick={() => threeRef.current?.resetCameraRotation?.()}
          >
            Centrum
          </button>
        </>
      )}
      {mode && isMobile && (
        <div className="modeBar">
          {PLAYER_MODES.map((key) => (
            <div
              key={key}
              className={`modeItem${mode === key ? ' active' : ''}`}
              onClick={() => setMode(key)}
            >
              {MODE_ICONS[key]}
            </div>
          ))}
          <div
            className="modeItem"
            onTouchStart={() => setShowRadial(true)}
            onTouchEnd={() => setShowRadial(false)}
            onTouchCancel={() => setShowRadial(false)}
          >
            ⭮
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneViewer;

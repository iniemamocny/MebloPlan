import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type CabinetDragger from '../viewer/CabinetDragger';
import { setupThree } from '../scene/engine';
import { buildCabinetMesh } from '../scene/cabinetBuilder';
import { FAMILY } from '../core/catalog';
import { usePlannerStore, legCategories } from '../state/store';
import { Module3D, ModuleAdv, Globals } from '../types';
import { loadItemModel } from '../scene/itemLoader';
import ItemHotbar, { hotbarItems } from './components/ItemHotbar';
import TouchJoystick from './components/TouchJoystick';
import { PlayerMode } from './types';
import RoomBuilder from './build/RoomBuilder';
import RadialMenu from './components/RadialMenu';

interface ThreeContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  playerControls: PointerLockControls;
  group: THREE.Group;
  cabinetDragger: CabinetDragger;
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
}

interface Props {
  threeRef: React.MutableRefObject<ThreeContext | null>;
  addCountertop: boolean;
  mode: PlayerMode;
  setMode: React.Dispatch<React.SetStateAction<PlayerMode>>;
}

const INTERACT_DISTANCE = 1.5;
const PLATE_HEIGHT = 0.02;

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const store = usePlannerStore();
  const showEdges = store.role === 'stolarz';
  const showFronts = store.showFronts;

  const [isMobile, setIsMobile] = useState(false);
  const [showRadial, setShowRadial] = useState(false);
  const lookVec = useRef({ x: 0, y: 0 });
  const targetRef = useRef<{ cab: THREE.Object3D; index: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [targetCabinet, setTargetCabinet] = useState<THREE.Object3D | null>(null);
  const ghostRef = useRef<THREE.Object3D | null>(null);

  const buildRadialItems: (string | null)[] = [
    'wall',
    'window',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  const furnishRadialItems: (string | null)[] = Array(9).fill(null);
  const radialItems =
    mode === 'build'
      ? buildRadialItems
      : mode === 'furnish'
        ? furnishRadialItems
        : hotbarItems;

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
    (threeRef.current as any).setMode = setMode;
    const pc = threeRef.current.playerControls;
    const onUnlock = () => setMode(null);
    pc.addEventListener('unlock', onUnlock);
    return () => {
      pc.removeEventListener('unlock', onUnlock);
    };
  }, [threeRef]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three) return;
    if (mode === 'furnish') {
      three.controls.enabled = false;
      three.cabinetDragger.enable();
      if (isMobile) {
        (three.playerControls as any).isLocked = true;
      } else {
        three.playerControls.lock();
      }
      three.camera.position.y = store.playerHeight;
    } else {
      three.cabinetDragger.disable();
      if (mode) {
        three.controls.enabled = false;
        if (isMobile) {
          (three.playerControls as any).isLocked = true;
        } else {
          three.playerControls.lock();
        }
        three.camera.position.y = store.playerHeight;
      } else {
        if (isMobile) {
          (three.playerControls as any).isLocked = false;
        } else {
          three.playerControls.unlock();
        }
        three.controls.enabled = true;
      }
    }
  }, [mode, threeRef, store.playerHeight, isMobile]);

  useEffect(() => {
    threeRef.current?.setPlayerParams?.({
      height: store.playerHeight,
      speed: store.playerSpeed,
    });
  }, [store.playerHeight, store.playerSpeed, threeRef]);

  useEffect(() => {
    let id = 0;
    const loop = () => {
      const { x, y } = lookVec.current;
      if (x !== 0 || y !== 0) {
        threeRef.current?.updateCameraRotation?.(x * 2, y * 2);
      }
      id = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(id);
  }, [threeRef]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        store.setSelectedItemSlot(n);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [store]);

  useEffect(() => {
    setShowRadial(false);
    if (!mode) return;
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
    };
  }, [mode]);

  useEffect(() => {
    if (mode === null) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      setMode((m) => {
        const modes: PlayerMode[] = ['build', 'furnish', 'decorate'];
        const idx = modes.indexOf(m ?? 'decorate');
        return modes[(idx + 1) % modes.length];
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
      if (c.userData?.kind === 'cab' || c.userData?.kind === 'top' || c.userData?.kind === 'item') {
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
  useEffect(drawScene, [store.modules, store.items, addCountertop, showEdges, showFronts]);


  useEffect(() => {
    const three = threeRef.current;
    if (!three || !three.renderer || !three.camera || !three.group) return;
    const renderer = three.renderer as THREE.WebGLRenderer;
    const camera = three.camera as THREE.PerspectiveCamera;
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
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [store.modules, mode, targetCabinet, store.selectedItemSlot, store.items, updateGhost]);

  useEffect(() => {
    let animId: number;
    const raycaster = new THREE.Raycaster();
    const detect = () => {
      const three = threeRef.current;
      if (mode && three && three.group) {
        const camera = three.camera as THREE.PerspectiveCamera;
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
      animId = requestAnimationFrame(detect);
    };
    animId = requestAnimationFrame(detect);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [mode, threeRef]);

  useEffect(() => {
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
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

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
      <RadialMenu
        items={radialItems}
        selected={store.selectedItemSlot}
        onSelect={store.setSelectedItemSlot}
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
      <div style={{ position: 'absolute', top: 10, left: 10 }}>
        <button className="btnGhost" onClick={() => setMode((m) => (m ? null : 'furnish'))}>
          {mode ? 'Tryb edycji' : 'Tryb gracza'}
        </button>
      </div>
      {mode === 'build' && <RoomBuilder threeRef={threeRef} />}
      {mode === 'decorate' && <ItemHotbar mode={mode} />}
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
      {isMobile && (
        <div className="modeBar">
          {(
            [
              { key: 'build', label: '🔨' },
              { key: 'furnish', label: '🪑' },
              { key: 'decorate', label: '🎨' },
            ] as { key: PlayerMode; label: string }[]
          ).map(({ key, label }) => (
            <div
              key={key}
              className={`modeItem${mode === key ? ' active' : ''}`}
              onClick={() => setMode(key)}
            >
              {label}
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

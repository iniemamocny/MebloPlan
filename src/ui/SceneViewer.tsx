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

interface ThreeContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  playerControls: PointerLockControls;
  group: THREE.Group;
  cabinetDragger: CabinetDragger;
}

interface Props {
  threeRef: React.MutableRefObject<ThreeContext | null>;
  addCountertop: boolean;
}

const INTERACT_DISTANCE = 1.5;

export const getLegHeight = (mod: Module3D, globals: Globals): number => {
  if (mod.family !== FAMILY.BASE) return 0;
  const h =
    mod.adv?.legs?.height ?? globals[mod.family]?.legsHeight;
  if (typeof h === 'number') return h / 1000;
  return 0.1;
};

const SceneViewer: React.FC<Props> = ({ threeRef, addCountertop }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const store = usePlannerStore();
  const showEdges = store.role === 'stolarz';
  const showFronts = store.showFronts;

  const [playerMode, setPlayerMode] = useState(false);
  const targetRef = useRef<{ cab: THREE.Object3D; index: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const availableItems = ['cup', 'plate'];

  useEffect(() => {
    if (!containerRef.current) return;
    threeRef.current = setupThree(containerRef.current) as ThreeContext;
    (threeRef.current as any).setPlayerMode = setPlayerMode;
    const pc = threeRef.current.playerControls;
    const onUnlock = () => setPlayerMode(false);
    pc.addEventListener('unlock', onUnlock);
    return () => {
      pc.removeEventListener('unlock', onUnlock);
    };
  }, [threeRef]);

  useEffect(() => {
    const three = threeRef.current;
    if (!three) return;
    if (playerMode) {
      three.controls.enabled = false;
      three.cabinetDragger.disable();
      three.playerControls.lock();
      three.camera.position.y = 1.6;
    } else {
      three.playerControls.unlock();
      three.controls.enabled = true;
      three.cabinetDragger.enable();
    }
  }, [playerMode, threeRef]);

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
      loadItemModel(it.type).then((obj) => {
        obj.position.set(it.position[0], it.position[1], it.position[2]);
        obj.rotation.set(it.rotation[0], it.rotation[1], it.rotation[2]);
        obj.userData.kind = 'item';
        obj.userData.itemId = it.id;
        group.add(obj);
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
      if (playerMode) {
        const target = targetRef.current;
        if (!target) return;
        const { cab, index } = target;
        const openStates: boolean[] = cab.userData.openStates || [];
        if (index >= 0 && index < openStates.length) {
          openStates[index] = !openStates[index];
          cab.userData.openStates = openStates;
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
      if (intersects.length === 0) return;
      if (selectedItem) {
        const inter = intersects[0];
        let cab: THREE.Object3D | null = inter.object;
        while (cab && cab.userData?.kind !== 'cab') {
          cab = cab.parent;
        }
        if (!cab || !cab.userData?.moduleId) return;
        const point = inter.point.clone();
        const id = Math.random().toString(36).slice(2);
        store.addItem({
          id,
          type: selectedItem,
          position: [point.x, point.y + 0.05, point.z],
          rotation: [0, 0, 0],
          cabinetId: cab.userData.moduleId,
        });
        setSelectedItem(null);
        return;
      }
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
    renderer.domElement.addEventListener('pointerdown', handlePointer);
    return () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointer);
    };
  }, [store.modules, playerMode]);

  useEffect(() => {
    let animId: number;
    const raycaster = new THREE.Raycaster();
    const detect = () => {
      const three = threeRef.current;
      if (playerMode && three && three.group) {
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
      } else {
        targetRef.current = null;
        setShowHint(false);
      }
      animId = requestAnimationFrame(detect);
    };
    animId = requestAnimationFrame(detect);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [playerMode, threeRef]);

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
      {!playerMode && (
        <div className="zoomControls">
          <button className="btnGhost" onClick={handleZoomIn}>
            +
          </button>
          <button className="btnGhost" onClick={handleZoomOut}>
            −
          </button>
        </div>
      )}
      {playerMode && showHint && (
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
        <button className="btnGhost" onClick={() => setPlayerMode((p) => !p)}>
          {playerMode ? 'Tryb edycji' : 'Tryb gracza'}
        </button>
      </div>
      {!playerMode && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            display: 'flex',
            gap: 8,
          }}
        >
          {availableItems.map((it) => (
            <button
              key={it}
              className="btnGhost"
              style={
                selectedItem === it
                  ? { border: '2px solid #fff' }
                  : undefined
              }
              onClick={() => setSelectedItem(it)}
            >
              {it}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SceneViewer;

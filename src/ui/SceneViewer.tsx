import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { setupThree } from '../scene/engine';
import { buildCabinetMesh } from '../scene/cabinetBuilder';
import { FAMILY } from '../core/catalog';
import { usePlannerStore, legCategories } from '../state/store';
import { Module3D, ModuleAdv, Globals } from '../types';

interface ThreeContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  group: THREE.Group;
  onLengthChange?: (len: number) => void;
  onAngleChange?: (angle: number) => void;
}

interface Props {
  threeRef: React.MutableRefObject<ThreeContext | null>;
  addCountertop: boolean;
  setIsDrawingWalls: React.Dispatch<React.SetStateAction<boolean>>;
}

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
  setIsDrawingWalls,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const store = usePlannerStore();
  const showEdges = store.role === 'stolarz';
  const showFronts = store.showFronts;

  useEffect(() => {
    if (!containerRef.current) return;
    threeRef.current = setupThree(containerRef.current, {
      onEnterTopDownMode: () => setIsDrawingWalls(true),
      onExitTopDownMode: () => {
        setIsDrawingWalls(false);
        threeRef.current?.onLengthChange?.(0);
        threeRef.current?.onAngleChange?.(0);
      },
      onLengthChange: (len) => threeRef.current?.onLengthChange?.(len),
      onAngleChange: (angle) => threeRef.current?.onAngleChange?.(angle),
    });
  }, [threeRef, setIsDrawingWalls]);

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
      if (c.userData?.kind === 'cab' || c.userData?.kind === 'top') {
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
  };
  useEffect(drawScene, [store.modules, addCountertop, showEdges, showFronts]);


  useEffect(() => {
    const three = threeRef.current;
    if (!three || !three.renderer || !three.camera || !three.group) return;
    const renderer = three.renderer as THREE.WebGLRenderer;
    const camera = three.camera as THREE.PerspectiveCamera;
    const group = three.group as THREE.Group;
    const raycaster = new THREE.Raycaster();
    const handlePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(group.children, true);
      if (intersects.length === 0) return;
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
  }, [store.modules]);

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
      <div className="zoomControls">
        <button className="btnGhost" onClick={handleZoomIn}>
          +
        </button>
        <button className="btnGhost" onClick={handleZoomOut}>
          −
        </button>
      </div>
    </div>
  );
};

export default SceneViewer;

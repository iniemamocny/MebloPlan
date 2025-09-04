import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FAMILY } from '../../core/catalog';
import { buildCabinetMesh } from '../../scene/cabinetBuilder';
import { usePlannerStore } from '../../state/store';
import { TopPanel, BottomPanel, EdgeBanding, SidePanelSpec } from '../../types';

export default function Cabinet3D({
  widthMM,
  heightMM,
  depthMM,
  doorsCount,
  drawersCount,
  gaps,
  drawerFronts,
  family,
  shelves = 1,
  backPanel = 'full',
  topPanel,
  bottomPanel,
  dividerPosition,
  rightSideEdgeBanding = { front: true, back: true },
  leftSideEdgeBanding = { front: true, back: true },
  traverseEdgeBanding = {},
  shelfEdgeBanding = {},
  backEdgeBanding = {},
  topPanelEdgeBanding = {},
  bottomPanelEdgeBanding = {},
  sidePanels,
  carcassType = 'type1',
  showFronts = true,
  highlightPart = null,
  legHeight: legHeightMM = 0,
  legsOffset: legsOffsetMM = 0,
  legsType = 'standard',
}: {
  widthMM: number;
  heightMM: number;
  depthMM: number;
  doorsCount: number;
  drawersCount: number;
  gaps: { top: number; bottom: number };
  drawerFronts?: number[];
  family: FAMILY;
  shelves?: number;
  backPanel?: 'full' | 'split' | 'none';
  topPanel?: TopPanel;
  bottomPanel?: BottomPanel;
  dividerPosition?: 'left' | 'right' | 'center';
  rightSideEdgeBanding?: EdgeBanding;
  leftSideEdgeBanding?: EdgeBanding;
  traverseEdgeBanding?: EdgeBanding;
  shelfEdgeBanding?: EdgeBanding;
  backEdgeBanding?: EdgeBanding;
  topPanelEdgeBanding?: EdgeBanding;
  bottomPanelEdgeBanding?: EdgeBanding;
  sidePanels?: {
    left?: SidePanelSpec;
    right?: SidePanelSpec;
  };
  carcassType?: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6';
  showFronts?: boolean;
  highlightPart?: 'top' | 'bottom' | 'shelf' | 'back' | 'leftSide' | 'rightSide' | null;
  legHeight?: number;
  legsOffset?: number;
  legsType?: 'standard' | 'reinforced' | 'decorative';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const highlightedRef = useRef<{
    mesh: THREE.Mesh;
    material: THREE.Material;
  } | null>(null);
  const rotatedRef = useRef(false);
  const baseDistance = useRef(0);
  const minDistance = useRef(0);
  const maxDistance = useRef(0);
  const [zoom, setZoom] = useState(50);
  const [zoomLocked, setZoomLocked] = useState(false);
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const role = usePlannerStore((s) => s.role);
  const showEdges = role === 'stolarz';

  useEffect(() => {
    if (!ref.current) return;
    const w = 390,
      h = 285;

    let renderer = rendererRef.current;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      ref.current.innerHTML = '';
      ref.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    }

    if (sceneRef.current) {
      sceneRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      sceneRef.current = null;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.01, 100);
    camera.position.set(0.9, 0.7, 1.3);
    camera.lookAt(0, 0.4, -0.2);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const W = widthMM / 1000;
    const H = heightMM / 1000;
    const D = depthMM / 1000;
    const legHeight =
      family === FAMILY.BASE || family === FAMILY.TALL
        ? legHeightMM / 1000
        : 0;
    const legOffset = legsOffsetMM / 1000;
    const cabGroup = buildCabinetMesh({
      width: W,
      height: H,
      depth: D,
      drawers: drawersCount,
      doorCount: doorsCount,
      gaps,
      drawerFronts,
      family,
      shelves,
      backPanel,
      topPanel,
      bottomPanel,
      legHeight,
      legsOffset: legOffset,
      legsType,
      dividerPosition: drawersCount > 0 ? undefined : dividerPosition,
      showEdges,
      rightSideEdgeBanding,
      leftSideEdgeBanding,
      traverseEdgeBanding,
      shelfEdgeBanding,
      backEdgeBanding,
      topPanelEdgeBanding,
      bottomPanelEdgeBanding,
      sidePanels,
      carcassType,
      showFronts,
    });
    cabGroup.userData.animSpeed = 0.15;
    scene.add(cabGroup);
    const center = new THREE.Vector3(W / 2, legHeight + H / 2, -D / 2);
    renderer.render(scene, camera);

    if (controlsRef.current) {
      controlsRef.current.dispose();
    }
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = true; // allow manual update calls
    controls.enableRotate = false;
    controls.enableZoom = false; // keep mouse wheel disabled
    controls.enablePan = false;
    controls.addEventListener('change', () => renderer.render(scene, camera));
    controls.target.copy(center);
    camera.lookAt(center);
    controls.update();
    baseDistance.current = camera.position.distanceTo(center);
    minDistance.current = baseDistance.current * 0.5;
    maxDistance.current = baseDistance.current * 1.5;
    setZoom(50);
    controlsRef.current = controls;
    renderer.render(scene, camera);

    sceneRef.current = scene;
    groupRef.current = cabGroup;
    cameraRef.current = camera;

    return () => {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      if (highlightedRef.current) {
        highlightedRef.current.material.dispose();
        highlightedRef.current = null;
      }
      const controls = controlsRef.current;
      if (controls) {
        controls.dispose();
        controlsRef.current = null;
      }
      sceneRef.current = null;
    };
  }, [
    widthMM,
    heightMM,
    depthMM,
    doorsCount,
    drawersCount,
    gaps,
    drawerFronts,
    family,
    shelves,
    backPanel,
    topPanel,
    bottomPanel,
    dividerPosition,
    showEdges,
    rightSideEdgeBanding,
    leftSideEdgeBanding,
    traverseEdgeBanding,
    shelfEdgeBanding,
    backEdgeBanding,
    topPanelEdgeBanding,
    bottomPanelEdgeBanding,
    sidePanels,
    carcassType,
    showFronts,
    legHeightMM,
    legsOffsetMM,
    legsType,
  ]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const group = groupRef.current;
    const scene = sceneRef.current;
    if (!renderer || !camera || !group || !scene) return;
    const raycaster = new THREE.Raycaster();
    const handlePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(group.children, true);
      let obj: THREE.Object3D | null = null;
      for (const hit of intersects) {
        obj = hit.object;
        let ignore = false;
        while (obj) {
          if (obj.userData?.ignoreRaycast) {
            ignore = true;
            break;
          }
          if (obj.userData.frontIndex !== undefined) break;
          obj = obj.parent;
        }
        if (ignore || !obj || obj.userData.frontIndex === undefined) {
          obj = null;
          continue;
        }
        if (obj.userData.isHandle) {
          obj = obj.parent;
          if (!obj || obj.userData.frontIndex === undefined) {
            obj = null;
          } else {
            obj = null;
          }
          break;
        }
        break;
      }
      if (!obj) {
        return;
      }
      const frontIndex = obj.userData.frontIndex as number;
      const openStates: boolean[] = group.userData.openStates || [];
      group.userData.openStates = openStates;
      openStates[frontIndex] = !openStates[frontIndex];
      renderer.render(scene, camera);
    };
    renderer.domElement.addEventListener('pointerdown', handlePointer);
    return () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointer);
    };
  }, [
    widthMM,
    heightMM,
    depthMM,
    doorsCount,
    drawersCount,
    gaps,
    drawerFronts,
    family,
    shelves,
    backPanel,
    topPanel,
    bottomPanel,
    dividerPosition,
    showEdges,
    rightSideEdgeBanding,
    leftSideEdgeBanding,
    traverseEdgeBanding,
    shelfEdgeBanding,
    backEdgeBanding,
    topPanelEdgeBanding,
    bottomPanelEdgeBanding,
    sidePanels,
    carcassType,
    showFronts,
    legHeightMM,
    legsOffsetMM,
    legsType,
  ]);

  useEffect(() => {
    let animId: number;
    const animate = () => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const group = groupRef.current;
      if (renderer && scene && camera && group) {
        const openStates: boolean[] = group.userData.openStates || [];
        const openProgress: number[] = group.userData.openProgress || [];
        const frontGroups: THREE.Object3D[] = group.userData.frontGroups || [];
        openStates.forEach((target, idx) => {
          let prog = openProgress[idx] ?? 0;
          const dest = target ? 1 : 0;
          const diff = dest - prog;
          if (Math.abs(diff) > 0.001) {
            const speed = group.userData.animSpeed || 0.15;
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
        renderer.render(scene, camera);
      }
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    return () => {
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.forceContextLoss();
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const group = groupRef.current;
    if (!renderer || !scene || !camera || !group) return;

    if (highlightedRef.current) {
      const { mesh, material } = highlightedRef.current;
      (mesh.material as THREE.Material).dispose();
      mesh.material = material;
      highlightedRef.current = null;
    }

    if (rotatedRef.current) {
      group.rotation.y -= Math.PI;
      rotatedRef.current = false;
    }

    if (highlightPart) {
      let target: THREE.Mesh | null = null;
      group.traverse((obj) => {
        if (!target && obj instanceof THREE.Mesh && obj.userData.part === highlightPart) {
          target = obj;
        }
      });
      if (target) {
        const originalMat = target.material as THREE.Material;
        const mat = originalMat.clone();
        if ('emissive' in mat) {
          (mat as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x4444ff);
        } else if ((mat as any).color) {
          (mat as any).color = new THREE.Color(0x4444ff);
        }
        target.material = mat;
        highlightedRef.current = { mesh: target, material: originalMat };
      }
      if (highlightPart === 'back') {
        group.rotation.y += Math.PI;
        rotatedRef.current = true;
      }
    }

    renderer.render(scene, camera);
  }, [highlightPart]);

  const handleZoomChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const controls = controlsRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const min = minDistance.current;
    const max = maxDistance.current;
    if (controls && renderer && scene && camera) {
      const value = +e.target.value;
      setZoom(value);
      const distance = THREE.MathUtils.lerp(max, min, value / 100);
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position
        .copy(controls.target)
        .addScaledVector(dir, distance);
      controls.update();
      renderer.render(scene, camera);
    }
  };

  const handleToggleRotate = () => {
    const controls = controlsRef.current;
    if (controls) {
      const newVal = !rotationEnabled;
      controls.enableRotate = newVal;
      setRotationEnabled(newVal);
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: 390, height: 285 }}>
      <div
        ref={ref}
        style={{
          width: '100%',
          height: '100%',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          background: '#fff',
        }}
      />
      <div
        className="cabinet3d-controls"
        style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <input
          type="range"
          min={0}
          max={100}
          value={zoom}
          disabled={zoomLocked}
          onChange={handleZoomChange}
        />
        <button onClick={() => setZoomLocked((z) => !z)}>
          {zoomLocked ? 'odblokuj' : 'zablokuj'}
        </button>
        <button onClick={handleToggleRotate}>
          {rotationEnabled ? 'zatrzymaj' : 'obrót'}
        </button>
      </div>
    </div>
  );
}

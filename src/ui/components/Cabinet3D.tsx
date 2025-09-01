import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FAMILY } from '../../core/catalog';
import { buildCabinetMesh } from '../../scene/cabinetBuilder';
import { usePlannerStore } from '../../state/store';
import { TopPanel, BottomPanel, EdgeBanding } from '../../types';

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
  edgeBanding = { front: true, back: true },
  traverseEdgeBanding = {},
  shelfEdgeBanding = {},
  backEdgeBanding = {},
  sidePanels,
  carcassType = 'type1',
  showFronts = true,
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
  edgeBanding?: EdgeBanding;
  traverseEdgeBanding?: EdgeBanding;
  shelfEdgeBanding?: EdgeBanding;
  backEdgeBanding?: EdgeBanding;
  sidePanels?: {
    left?: Record<string, any>;
    right?: Record<string, any>;
  };
  carcassType?: 'type1' | 'type2' | 'type3';
  showFronts?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const role = usePlannerStore((s) => s.role);
  const showEdges = role === 'stolarz';

  useEffect(() => {
    if (!ref.current) return;
    const w = 260,
      h = 190;

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
      family === FAMILY.BASE || family === FAMILY.TALL ? 0.04 : 0;
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
      dividerPosition: drawersCount > 0 ? undefined : dividerPosition,
      showEdges,
      edgeBanding,
      traverseEdgeBanding,
      shelfEdgeBanding,
      backEdgeBanding,
      sidePanels,
      carcassType,
      showFronts,
    });
    scene.add(cabGroup);
    renderer.render(scene, camera);
    sceneRef.current = scene;

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
    edgeBanding,
    traverseEdgeBanding,
    shelfEdgeBanding,
    backEdgeBanding,
    sidePanels,
    carcassType,
    showFronts,
  ]);

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
  return (
    <div
      ref={ref}
      style={{
        width: 260,
        height: 190,
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        background: '#fff',
      }}
    />
  );
}

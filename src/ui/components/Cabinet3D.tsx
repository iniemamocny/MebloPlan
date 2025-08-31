import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FAMILY } from '../../core/catalog';
import { buildCabinetMesh } from '../../scene/cabinetBuilder';
import { usePlannerStore } from '../../state/store';

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
  dividerPosition,
  edgeBanding = 'front',
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
  dividerPosition?: 'left' | 'right' | 'center';
  edgeBanding?: 'none' | 'front' | 'full';
  carcassType?: 'type1' | 'type2' | 'type3';
  showFronts?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const role = usePlannerStore((s) => s.role);
  const showEdges = role === 'stolarz';

  useEffect(() => {
    if (!ref.current) return;
    const w = 260,
      h = 190;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    ref.current.innerHTML = '';
    ref.current.appendChild(renderer.domElement);
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
      legHeight,
      dividerPosition: drawersCount > 0 ? undefined : dividerPosition,
      showEdges,
      edgeBanding,
      carcassType,
      showFronts,
    });
    scene.add(cabGroup);
    renderer.render(scene, camera);
    return () => {
      renderer.dispose();
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
    dividerPosition,
    showEdges,
    edgeBanding,
    carcassType,
    showFronts,
  ]);
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


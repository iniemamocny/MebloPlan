import * as THREE from 'three';
import { FAMILY, FAMILY_COLORS } from '../core/catalog';

export interface CabinetOptions {
  width: number;
  height: number;
  depth: number;
  drawers: number;
  doorCount?: number;
  gaps: { top: number; bottom: number };
  drawerFronts?: number[];
  family: FAMILY;
  shelves?: number;
  backPanel?: 'full' | 'split' | 'none';
  legHeight?: number;
  showHandles?: boolean;
  boardThickness?: number;
  backThickness?: number;
  hinge?: 'left' | 'right';
  dividerPosition?: 'left' | 'right' | 'center';
}

/**
 * Build a cabinet mesh using basic construction rules shared between
 * different viewers. Dimensions are in metres.
 */
export function buildCabinetMesh(opts: CabinetOptions): THREE.Group {
  const {
    width: W,
    height: H,
    depth: D,
    drawers,
    doorCount = 1,
    gaps,
    drawerFronts,
    family,
    shelves = 1,
    backPanel = 'full',
    legHeight = 0,
    showHandles = true,
    boardThickness: T = 0.018,
    backThickness: backT = 0.003,
    dividerPosition,
  } = opts;

  const FRONT_OFFSET = 0.002;

  const carcColour = new THREE.Color(0xf5f5f5);
  const frontColour = new THREE.Color(FAMILY_COLORS[family]);
  const backColour = new THREE.Color(0xf0f0f0);
  const handleColour = new THREE.Color(0x333333);
  const footColour = new THREE.Color(0x444444);

  const carcMat = new THREE.MeshStandardMaterial({
    color: carcColour,
    metalness: 0.1,
    roughness: 0.8,
  });
  const frontMat = new THREE.MeshStandardMaterial({
    color: frontColour,
    metalness: 0.2,
    roughness: 0.6,
  });
  const backMat = new THREE.MeshStandardMaterial({
    color: backColour,
    metalness: 0.05,
    roughness: 0.9,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: handleColour,
    metalness: 0.8,
    roughness: 0.4,
  });
  const footMat = new THREE.MeshStandardMaterial({
    color: footColour,
    metalness: 0.3,
    roughness: 0.7,
  });

  const group = new THREE.Group();
  const frontGroups: THREE.Group[] = [];
  const openStates: boolean[] = [];
  const openProgress: number[] = [];

  // Sides
  const sideGeo = new THREE.BoxGeometry(T, H, D);
  const leftSide = new THREE.Mesh(sideGeo, carcMat);
  leftSide.position.set(T / 2, legHeight + H / 2, -D / 2);
  group.add(leftSide);
  const rightSide = new THREE.Mesh(sideGeo.clone(), carcMat);
  rightSide.position.set(W - T / 2, legHeight + H / 2, -D / 2);
  group.add(rightSide);

  // Top and bottom
  const horizGeo = new THREE.BoxGeometry(W, T, D);
  const bottom = new THREE.Mesh(horizGeo, carcMat);
  bottom.position.set(W / 2, legHeight + T / 2, -D / 2);
  group.add(bottom);
  const top = new THREE.Mesh(horizGeo.clone(), carcMat);
  top.position.set(W / 2, legHeight + H - T / 2, -D / 2);
  group.add(top);

  // Back panel styles
  if (backPanel === 'full') {
    const backGeo = new THREE.BoxGeometry(W, H, backT);
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(W / 2, legHeight + H / 2, -D + backT / 2);
    group.add(back);
  } else if (backPanel === 'split') {
    const gap = 0.002;
    const halfH = (H - gap) / 2;
    const backGeo = new THREE.BoxGeometry(W, halfH, backT);
    const bottomBack = new THREE.Mesh(backGeo, backMat);
    bottomBack.position.set(W / 2, legHeight + halfH / 2, -D + backT / 2);
    group.add(bottomBack);
    const topBack = new THREE.Mesh(backGeo.clone(), backMat);
    topBack.position.set(W / 2, legHeight + H - halfH / 2, -D + backT / 2);
    group.add(topBack);
  }

  // Shelves when there are no drawers
  if (drawers === 0) {
    const shelfGeo = new THREE.BoxGeometry(W - 2 * T, T, D);
    const count = Math.max(0, shelves);
    for (let i = 0; i < count; i++) {
      const shelf = new THREE.Mesh(shelfGeo, carcMat);
      const y = legHeight + (H * (i + 1)) / (count + 1);
      shelf.position.set(W / 2, y, -D / 2);
      group.add(shelf);
    }
  }

  if (dividerPosition) {
    const divGeo = new THREE.BoxGeometry(T, H, D);
    const divider = new THREE.Mesh(divGeo, carcMat);
    let x = W / 2;
    if (dividerPosition === 'left') x = W / 3;
    else if (dividerPosition === 'right') x = (2 * W) / 3;
    divider.position.set(x, legHeight + H / 2, -D / 2);
    group.add(divider);
  }

  // Fronts
  if (drawers > 0) {
    const totalFrontHeight = Math.max(
      50,
      Math.round(H * 1000 - (gaps.top + gaps.bottom)),
    );
    const arr =
      drawerFronts && drawerFronts.length === drawers
        ? drawerFronts
        : Array.from({ length: drawers }, () =>
            Math.floor(totalFrontHeight / drawers),
          );
    let currentY = legHeight + gaps.bottom / 1000;
    for (let i = 0; i < drawers; i++) {
      const h = arr[i] / 1000;
      const frontGeo = new THREE.BoxGeometry(W, h, T);
      const frontMesh = new THREE.Mesh(frontGeo, frontMat);
      const fg = new THREE.Group();
      // Start each drawer front completely in front of the carcass with a 2 mm gap
      fg.position.set(W / 2, currentY + h / 2, FRONT_OFFSET + T / 2);
      fg.userData.closedZ = FRONT_OFFSET + T / 2;
      frontMesh.position.set(0, 0, 0);
      fg.add(frontMesh);
      fg.userData.type = 'drawer';
      fg.userData.frontIndex = frontGroups.length;
      fg.userData.slideDist = -Math.min(0.45, D);
      frontGroups.push(fg);
      openStates.push(false);
      openProgress.push(0);
      if (showHandles) {
        const handleWidth = Math.min(0.4, W * 0.5);
        const handleHeight = 0.02;
        const handleDepth = 0.03;
        const handleGeo = new THREE.BoxGeometry(
          handleWidth,
          handleHeight,
          handleDepth,
        );
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, h / 2 - handleHeight * 1.5, T / 2 + 0.01);
        frontMesh.add(handle);
      }
      group.add(fg);
      currentY += h;
    }
  } else {
    const doors = Math.max(1, doorCount);
    const doorW = W / doors;
    for (let i = 0; i < doors; i++) {
      const hingeSide = i < doors / 2 ? 'left' : 'right';
      const doorGeo = new THREE.BoxGeometry(doorW, H, T);
      const doorMesh = new THREE.Mesh(doorGeo, frontMat);
      const fg = new THREE.Group();
      const pivotX = hingeSide === 'left' ? i * doorW : (i + 1) * doorW;
      // Hinge pivot sits 2 mm in front of the carcass, door hangs entirely in front
      fg.position.set(pivotX, legHeight + H / 2, FRONT_OFFSET);
      doorMesh.position.set(
        hingeSide === 'left' ? doorW / 2 : -doorW / 2,
        0,
        T / 2,
      );
      fg.add(doorMesh);
      fg.userData.type = 'door';
      fg.userData.frontIndex = frontGroups.length;
      fg.userData.hingeSide = hingeSide;
      frontGroups.push(fg);
      openStates.push(false);
      openProgress.push(0);
      if (showHandles) {
        const handleWidth = Math.min(0.4, doorW * 0.5);
        const handleHeight = 0.02;
        const handleDepth = 0.03;
        const handleGeo = new THREE.BoxGeometry(
          handleWidth,
          handleHeight,
          handleDepth,
        );
        const handle = new THREE.Mesh(handleGeo, handleMat);
        const xPos =
          hingeSide === 'left'
            ? doorW / 2 - handleWidth / 2
            : -doorW / 2 + handleWidth / 2;
        handle.position.set(xPos, H * 0.2, T / 2 + 0.01);
        doorMesh.add(handle);
      }
      group.add(fg);
    }
  }

  // Feet (hardware)
  if (legHeight > 0) {
    const footRadius = 0.02;
    const footHeight = legHeight;
    const footGeo = new THREE.CylinderGeometry(
      footRadius,
      footRadius,
      footHeight,
      16,
    );
    const fl = new THREE.Mesh(footGeo, footMat);
    fl.position.set(T + footRadius, footHeight / 2, -T);
    group.add(fl);
    const fr = new THREE.Mesh(footGeo.clone(), footMat);
    fr.position.set(W - T - footRadius, footHeight / 2, -T);
    group.add(fr);
    const bl = new THREE.Mesh(footGeo.clone(), footMat);
    bl.position.set(T + footRadius, footHeight / 2, -D + T);
    group.add(bl);
    const br = new THREE.Mesh(footGeo.clone(), footMat);
    br.position.set(W - T - footRadius, footHeight / 2, -D + T);
    group.add(br);
  }
  group.userData.frontGroups = frontGroups;
  group.userData.openStates = openStates;
  group.userData.openProgress = openProgress;
  return group;
}

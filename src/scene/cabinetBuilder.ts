import * as THREE from 'three';
import { FAMILY, FAMILY_COLORS } from '../core/catalog';
import { TopPanel, BottomPanel, Traverse } from '../types';

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
  topPanel?: TopPanel;
  bottomPanel?: BottomPanel;
  legHeight?: number;
  showHandles?: boolean;
  boardThickness?: number;
  backThickness?: number;
  hinge?: 'left' | 'right';
  dividerPosition?: 'left' | 'right' | 'center';
  showEdges?: boolean;
  edgeBanding?: {
    front: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
  };
  carcassType?: 'type1' | 'type2' | 'type3';
  showFronts?: boolean;
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
    topPanel = { type: 'full' } as TopPanel,
    bottomPanel = 'full' as BottomPanel,
    legHeight = 0,
    showHandles = true,
    boardThickness: T = 0.018,
    backThickness: backT = 0.003,
    dividerPosition,
    showEdges = false,
    edgeBanding = { front: false, back: false, left: false, right: false },
    carcassType = 'type1',
    showFronts = true,
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
  const isFull =
    edgeBanding.front && edgeBanding.back && edgeBanding.left && edgeBanding.right;
  const bandThickness = isFull ? 0.002 : 0.001;
  const bandMat = new THREE.MeshStandardMaterial({
    color: isFull ? 0xffaa00 : 0xffdd99,
    metalness: 0.2,
    roughness: 0.6,
  });

  const addBand = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, bandMat);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };

  const group = new THREE.Group();
  const frontGroups: THREE.Group[] = [];
  const openStates: boolean[] = [];
  const openProgress: number[] = [];

  const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000 });
  const addEdges = (mesh: THREE.Mesh) => {
    if (!showEdges) return;
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      edgeMat,
    );
    mesh.add(e);
  };

  // Sides
  const sideHeight =
    carcassType === 'type1' ? H : carcassType === 'type2' ? H - T : H - 2 * T;
  const sideY =
    carcassType === 'type2'
      ? legHeight + T + (H - T) / 2
      : carcassType === 'type3'
        ? legHeight + T + (H - 2 * T) / 2
        : legHeight + H / 2;
  const sideGeo = new THREE.BoxGeometry(T, sideHeight, D);
  const leftSide = new THREE.Mesh(sideGeo, carcMat);
  leftSide.position.set(T / 2, sideY, -D / 2);
  addEdges(leftSide);
  group.add(leftSide);
  const rightSide = new THREE.Mesh(sideGeo.clone(), carcMat);
  rightSide.position.set(W - T / 2, sideY, -D / 2);
  addEdges(rightSide);
  group.add(rightSide);
  if (edgeBanding.front) {
    addBand(T / 2, sideY, bandThickness / 2, T, sideHeight, bandThickness);
    addBand(W - T / 2, sideY, bandThickness / 2, T, sideHeight, bandThickness);
  }
  if (edgeBanding.back) {
    const sideBottomY = sideY - sideHeight / 2;
    const sideTopY = sideY + sideHeight / 2;
    addBand(
      T / 2,
      sideBottomY + bandThickness / 2,
      -D / 2,
      T,
      bandThickness,
      D,
    );
    addBand(T / 2, sideTopY - bandThickness / 2, -D / 2, T, bandThickness, D);
    addBand(
      W - T / 2,
      sideBottomY + bandThickness / 2,
      -D / 2,
      T,
      bandThickness,
      D,
    );
    addBand(
      W - T / 2,
      sideTopY - bandThickness / 2,
      -D / 2,
      T,
      bandThickness,
      D,
    );
  }
  if (edgeBanding.left) {
    const sideBottomY = sideY - sideHeight / 2;
    addBand(
      T / 2,
      sideBottomY + bandThickness / 2,
      bandThickness / 2,
      T,
      bandThickness,
      bandThickness,
    );
    addBand(
      W - T / 2,
      sideBottomY + bandThickness / 2,
      bandThickness / 2,
      T,
      bandThickness,
      bandThickness,
    );
  }
  if (edgeBanding.right) {
    const sideTopY = sideY + sideHeight / 2;
    addBand(
      T / 2,
      sideTopY - bandThickness / 2,
      bandThickness / 2,
      T,
      bandThickness,
      bandThickness,
    );
    addBand(
      W - T / 2,
      sideTopY - bandThickness / 2,
      bandThickness / 2,
      T,
      bandThickness,
      bandThickness,
    );
  }

  // Top and bottom
  const bottomWidth = carcassType === 'type1' ? W - 2 * T : W;
  const topWidth =
    carcassType === 'type3'
      ? W
      : carcassType === 'type2'
        ? W - 2 * T
        : W - 2 * T;
  const sideInset = carcassType === 'type3' ? 0 : T;
  if (bottomPanel !== 'none') {
    const bottom = new THREE.Mesh(
      new THREE.BoxGeometry(bottomWidth, T, D),
      carcMat,
    );
    bottom.position.set(W / 2, legHeight + T / 2, -D / 2);
    addEdges(bottom);
    group.add(bottom);
    if (edgeBanding.front) {
      addBand(
        W / 2,
        legHeight + T / 2,
        bandThickness / 2,
        bottomWidth,
        T,
        bandThickness,
      );
    }
    if (edgeBanding.back) {
      addBand(
        W / 2,
        legHeight + T / 2,
        -D + bandThickness / 2,
        bottomWidth,
        T,
        bandThickness,
      );
    }
    if (edgeBanding.left || edgeBanding.right) {
      const bottomLeft = (W - bottomWidth) / 2;
      if (edgeBanding.left) {
        addBand(
          bottomLeft + bandThickness / 2,
          legHeight + T / 2,
          -D / 2,
          bandThickness,
          T,
          D,
        );
      }
      if (edgeBanding.right) {
        addBand(
          W - bottomLeft - bandThickness / 2,
          legHeight + T / 2,
          -D / 2,
          bandThickness,
          T,
          D,
        );
      }
    }
  }
  const addTraverseTop = (tr: Traverse, zBase: number, topWidth: number) => {
    const widthM = tr.width / 1000;
    if (tr.orientation === 'vertical') {
      const geo = new THREE.BoxGeometry(topWidth, widthM, T);
      const mesh = new THREE.Mesh(geo, carcMat);
      const isFront = zBase === 0;
      const x = W / 2;
      const y = legHeight + H - widthM / 2 - tr.offset / 1000;
      const z = isFront ? FRONT_OFFSET - T / 2 : -D + backT + T / 2;
      mesh.position.set(x, y, z);
      addEdges(mesh);
      group.add(mesh);
      const halfHeight = widthM / 2;
      const yTop = y + halfHeight - bandThickness / 2;
      const yBottom = y - halfHeight + bandThickness / 2;
      if (edgeBanding.front) {
        addBand(x, yTop, z, topWidth, bandThickness, T);
      }
      if (edgeBanding.back) {
        addBand(x, yBottom, z, topWidth, bandThickness, T);
      }
      if (edgeBanding.left) {
        const topLeft = (W - topWidth) / 2;
        addBand(
          topLeft + bandThickness / 2,
          y,
          z,
          bandThickness,
          widthM,
          T,
        );
      }
      if (edgeBanding.right) {
        const topLeft = (W - topWidth) / 2;
        addBand(
          W - topLeft - bandThickness / 2,
          y,
          z,
          bandThickness,
          widthM,
          T,
        );
      }
    } else {
      const geo = new THREE.BoxGeometry(topWidth, T, widthM);
      const mesh = new THREE.Mesh(geo, carcMat);
      const isFront = zBase === 0;
      let frontEdge: number;
      let backEdge: number;
      if (isFront) {
        frontEdge = -tr.offset / 1000;
        backEdge = frontEdge - widthM;
      } else {
        backEdge = -zBase + tr.offset / 1000;
        frontEdge = backEdge + widthM;
      }
      const z = (frontEdge + backEdge) / 2;
      const x = W / 2;
      mesh.position.set(x, legHeight + H - T / 2, z);
      addEdges(mesh);
      group.add(mesh);
      const zFront = frontEdge + bandThickness / 2;
      const zBack = backEdge - bandThickness / 2;
      if (edgeBanding.front) {
        addBand(x, legHeight + H - T / 2, zFront, topWidth, T, bandThickness);
      }
      if (edgeBanding.back) {
        addBand(x, legHeight + H - T / 2, zBack, topWidth, T, bandThickness);
      }
      if (edgeBanding.left) {
        const topLeft = (W - topWidth) / 2;
        addBand(
          topLeft + bandThickness / 2,
          legHeight + H - T / 2,
          z,
          bandThickness,
          T,
          widthM,
        );
      }
      if (edgeBanding.right) {
        const topLeft = (W - topWidth) / 2;
        addBand(
          W - topLeft - bandThickness / 2,
          legHeight + H - T / 2,
          z,
          bandThickness,
          T,
          widthM,
        );
      }
    }
  };
  if (!topPanel || topPanel.type === 'full') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(topWidth, T, D), carcMat);
    top.position.set(W / 2, legHeight + H - T / 2, -D / 2);
    addEdges(top);
    group.add(top);
    if (edgeBanding.front) {
      addBand(
        W / 2,
        legHeight + H - T / 2,
        bandThickness / 2,
        topWidth,
        T,
        bandThickness,
      );
    }
    if (edgeBanding.back) {
      addBand(
        W / 2,
        legHeight + H - T / 2,
        -D + bandThickness / 2,
        topWidth,
        T,
        bandThickness,
      );
    }
    if (edgeBanding.left || edgeBanding.right) {
      const topLeft = (W - topWidth) / 2;
      if (edgeBanding.left) {
        addBand(
          topLeft + bandThickness / 2,
          legHeight + H - T / 2,
          -D / 2,
          bandThickness,
          T,
          D,
        );
      }
      if (edgeBanding.right) {
        addBand(
          W - topLeft - bandThickness / 2,
          legHeight + H - T / 2,
          -D / 2,
          bandThickness,
          T,
          D,
        );
      }
    }
  } else if (topPanel.type === 'frontTraverse') {
    addTraverseTop(topPanel.traverse, 0, topWidth);
  } else if (topPanel.type === 'backTraverse') {
    addTraverseTop(topPanel.traverse, D, topWidth);
  } else if (topPanel.type === 'twoTraverses') {
    addTraverseTop(topPanel.front, 0, topWidth);
    addTraverseTop(topPanel.back, D, topWidth);
  }

  // Back panel styles
  if (backPanel === 'full') {
    const backGeo = new THREE.BoxGeometry(W, H, backT);
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(W / 2, legHeight + H / 2, -D + backT / 2);
    addEdges(back);
    group.add(back);
  } else if (backPanel === 'split') {
    const gap = 0.002;
    const halfH = (H - gap) / 2;
    const backGeo = new THREE.BoxGeometry(W, halfH, backT);
    const bottomBack = new THREE.Mesh(backGeo, backMat);
    bottomBack.position.set(W / 2, legHeight + halfH / 2, -D + backT / 2);
    addEdges(bottomBack);
    group.add(bottomBack);
    const topBack = new THREE.Mesh(backGeo.clone(), backMat);
    topBack.position.set(W / 2, legHeight + H - halfH / 2, -D + backT / 2);
    addEdges(topBack);
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
      addEdges(shelf);
      group.add(shelf);
      if (edgeBanding.front) {
        addBand(W / 2, y, bandThickness / 2, W - 2 * T, T, bandThickness);
      }
      if (edgeBanding.back) {
        addBand(W / 2, y, -D + bandThickness / 2, W - 2 * T, T, bandThickness);
      }
      if (edgeBanding.left) {
        addBand(T + bandThickness / 2, y, -D / 2, bandThickness, T, D);
      }
      if (edgeBanding.right) {
        addBand(W - T - bandThickness / 2, y, -D / 2, bandThickness, T, D);
      }
    }
  }

  if (dividerPosition && drawers === 0) {
    const divGeo = new THREE.BoxGeometry(T, H, D);
    const divider = new THREE.Mesh(divGeo, carcMat);
    let x = W / 2;
    if (dividerPosition === 'left') x = W / 3;
    else if (dividerPosition === 'right') x = (2 * W) / 3;
    divider.position.set(x, legHeight + H / 2, -D / 2);
    addEdges(divider);
    group.add(divider);
    if (edgeBanding.front) {
      addBand(x, legHeight + H / 2, bandThickness / 2, T, H, bandThickness);
    }
    if (edgeBanding.back) {
      addBand(x, legHeight + H / 2, -D + bandThickness / 2, T, H, bandThickness);
    }
    if (edgeBanding.left) {
      addBand(x, legHeight + bandThickness / 2, -D / 2, T, bandThickness, D);
    }
    if (edgeBanding.right) {
      addBand(
        x,
        legHeight + H - bandThickness / 2,
        -D / 2,
        T,
        bandThickness,
        D,
      );
    }
  }

  // Fronts
  if (showFronts) {
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
        addEdges(frontMesh);
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
        addEdges(doorMesh);
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

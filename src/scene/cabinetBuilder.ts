import * as THREE from 'three';
import { FAMILY, FAMILY_COLORS } from '../core/catalog';
import { TopPanel, BottomPanel, Traverse, EdgeBanding } from '../types';

export type Orientation = 'vertical' | 'horizontal' | 'back';
export type EdgeName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export const getOrientationAxes = (orientation: Orientation) => {
  switch (orientation) {
    case 'horizontal':
      return { length: 'z', width: 'x' } as const;
    case 'back':
      return { length: 'x', width: 'y' } as const;
    default:
      return { length: 'y', width: 'z' } as const;
  }
};

export interface CabinetOptions {
  width: number;
  height: number;
  depth: number;
  drawers: number;
  doorCount?: number;
  gaps: {
    top: number;
    bottom: number;
    left?: number;
    right?: number;
    between?: number;
  };
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
  rightSideEdgeBanding?: EdgeBanding;
  leftSideEdgeBanding?: EdgeBanding;
  shelfEdgeBanding?: EdgeBanding;
  traverseEdgeBanding?: EdgeBanding;
  backEdgeBanding?: EdgeBanding;
  topPanelEdgeBanding?: EdgeBanding;
  bottomPanelEdgeBanding?: EdgeBanding;
  sidePanels?: {
    left?: Record<string, any>;
    right?: Record<string, any>;
  };
  carcassType?: 'type1' | 'type2' | 'type3' | 'type4';
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
    rightSideEdgeBanding: rightSideEdgeBandingInput = {},
    leftSideEdgeBanding: leftSideEdgeBandingInput = {},
    traverseEdgeBanding: traverseEdgeBandingInput = {},
    shelfEdgeBanding: shelfEdgeBandingInput = {},
    backEdgeBanding: backEdgeBandingInput = {},
    topPanelEdgeBanding: topPanelEdgeBandingInput = {},
    bottomPanelEdgeBanding: bottomPanelEdgeBandingInput = {},
    sidePanels = {},
    carcassType = 'type1',
    showFronts = true,
  } = opts;

  const shouldBand = (
    banding: EdgeBanding | undefined,
    _orientation: Orientation,
    edge: EdgeName,
  ) => {
    return banding?.[edge] ?? false;
  };

  const rightSideEdgeBanding = rightSideEdgeBandingInput;
  const leftSideEdgeBanding = leftSideEdgeBandingInput;
  const traverseEdgeBanding = traverseEdgeBandingInput;
  const shelfEdgeBanding = shelfEdgeBandingInput;
  const backEdgeBanding = backEdgeBandingInput;
  const topPanelEdgeBanding = topPanelEdgeBandingInput;
  const bottomPanelEdgeBanding = bottomPanelEdgeBandingInput;

  const FRONT_OFFSET = 0.002;
  const frontProj = T + FRONT_OFFSET;

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
  const hasFrontBack =
    rightSideEdgeBanding.front ||
    rightSideEdgeBanding.back ||
    leftSideEdgeBanding.front ||
    leftSideEdgeBanding.back ||
    topPanelEdgeBanding.front ||
    topPanelEdgeBanding.back ||
    bottomPanelEdgeBanding.front ||
    bottomPanelEdgeBanding.back;
  const hasOther =
    rightSideEdgeBanding.left ||
    rightSideEdgeBanding.right ||
    rightSideEdgeBanding.top ||
    rightSideEdgeBanding.bottom ||
    leftSideEdgeBanding.left ||
    leftSideEdgeBanding.right ||
    leftSideEdgeBanding.top ||
    leftSideEdgeBanding.bottom ||
    topPanelEdgeBanding.left ||
    topPanelEdgeBanding.right ||
    bottomPanelEdgeBanding.left ||
    bottomPanelEdgeBanding.right;
  const isFull = !!(hasFrontBack && hasOther);
  const bandThickness = 0.0008;
  const bandMat = new THREE.MeshStandardMaterial({
    color: isFull ? 0xffaa00 : 0xffdd99,
    metalness: 0.2,
    roughness: 0.6,
  });

  const offsetForEdge = (edge: EdgeName) =>
    edge === 'front' || edge === 'right' || edge === 'top'
      ? bandThickness / 2
      : -bandThickness / 2;

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
    carcassType === 'type1'
      ? H
      : carcassType === 'type2'
        ? H - T
        : H - 2 * T;
  const sideY =
    carcassType === 'type2'
      ? legHeight + T + (H - T) / 2
      : carcassType === 'type3' || carcassType === 'type4'
        ? legHeight + T + (H - 2 * T) / 2
        : legHeight + H / 2;
  const sideGeo = new THREE.BoxGeometry(T, sideHeight, D);
  const leftSide = new THREE.Mesh(sideGeo, carcMat);
  leftSide.position.set(T / 2, sideY, -D / 2);
  leftSide.userData.part = 'leftSide';
  leftSide.userData.originalMaterial = leftSide.material;
  addEdges(leftSide);
  group.add(leftSide);
  const rightSide = new THREE.Mesh(sideGeo.clone(), carcMat);
  rightSide.position.set(W - T / 2, sideY, -D / 2);
  rightSide.userData.part = 'rightSide';
  rightSide.userData.originalMaterial = rightSide.material;
  addEdges(rightSide);
  group.add(rightSide);
  const sideBottomY = sideY - sideHeight / 2;
  const sideTopY = sideY + sideHeight / 2;
  const bandSide = (banding: EdgeBanding | undefined, x: number) => {
    if (shouldBand(banding, 'vertical', 'front')) {
      addBand(x, sideY, offsetForEdge('front'), T, sideHeight, bandThickness);
    }
    if (shouldBand(banding, 'vertical', 'back')) {
      addBand(
        x,
        sideY,
        -D + offsetForEdge('back'),
        T,
        sideHeight,
        bandThickness,
      );
    }
    if (shouldBand(banding, 'vertical', 'left')) {
      addBand(
        x,
        sideBottomY + offsetForEdge('bottom'),
        offsetForEdge('front'),
        T,
        bandThickness,
        bandThickness,
      );
    }
    if (shouldBand(banding, 'vertical', 'right')) {
      addBand(
        x,
        sideTopY + offsetForEdge('top'),
        offsetForEdge('front'),
        T,
        bandThickness,
        bandThickness,
      );
    }
    if (shouldBand(banding, 'vertical', 'bottom')) {
      addBand(
        x,
        sideBottomY + offsetForEdge('bottom'),
        -D / 2,
        T,
        bandThickness,
        D,
      );
    }
    if (shouldBand(banding, 'vertical', 'top')) {
      addBand(
        x,
        sideTopY + offsetForEdge('top'),
        -D / 2,
        T,
        bandThickness,
        D,
      );
    }
  };
  bandSide(leftSideEdgeBanding, T / 2);
  bandSide(rightSideEdgeBanding, W - T / 2);

  if (sidePanels.left) {
    const panel = new THREE.Mesh(sideGeo.clone(), carcMat);
    panel.position.set(-T / 2, sideY, -D / 2);
    panel.userData.part = 'leftSide';
    panel.userData.originalMaterial = panel.material;
    addEdges(panel);
    group.add(panel);
    bandSide(leftSideEdgeBanding, -T / 2);
  }
  if (sidePanels.right) {
    const panel = new THREE.Mesh(sideGeo.clone(), carcMat);
    panel.position.set(W + T / 2, sideY, -D / 2);
    panel.userData.part = 'rightSide';
    panel.userData.originalMaterial = panel.material;
    addEdges(panel);
    group.add(panel);
    bandSide(rightSideEdgeBanding, W + T / 2);
  }

  // Top and bottom
  const bottomWidth = carcassType === 'type1' ? W - 2 * T : W;
  const topWidth =
    carcassType === 'type3' || carcassType === 'type4' ? W : W - 2 * T;
  const sideInset = carcassType === 'type3' || carcassType === 'type4' ? 0 : T;
  if (bottomPanel !== 'none') {
    const bottomDepth = carcassType === 'type4' ? D + frontProj : D;
    const bottomZ = carcassType === 'type4' ? -D / 2 + frontProj / 2 : -D / 2;
    const bottom = new THREE.Mesh(
      new THREE.BoxGeometry(bottomWidth, T, bottomDepth),
      carcMat,
    );
    bottom.position.set(W / 2, legHeight + T / 2, bottomZ);
    bottom.userData.part = 'bottom';
    bottom.userData.originalMaterial = bottom.material;
    addEdges(bottom);
    group.add(bottom);
    if (shouldBand(bottomPanelEdgeBanding, 'horizontal', 'front')) {
      const zFront = carcassType === 'type4'
        ? frontProj + offsetForEdge('front')
        : offsetForEdge('front');
      addBand(
        W / 2,
        legHeight + T / 2,
        zFront,
        bottomWidth,
        T,
        bandThickness,
      );
    }
    if (shouldBand(bottomPanelEdgeBanding, 'horizontal', 'back')) {
      addBand(
        W / 2,
        legHeight + T / 2,
        -D + offsetForEdge('back'),
        bottomWidth,
        T,
        bandThickness,
      );
    }
    if (
      shouldBand(bottomPanelEdgeBanding, 'horizontal', 'left') ||
      shouldBand(bottomPanelEdgeBanding, 'horizontal', 'right')
    ) {
      const bottomLeft = (W - bottomWidth) / 2;
      const zCenter = carcassType === 'type4' ? -D / 2 + frontProj / 2 : -D / 2;
      const depth = carcassType === 'type4' ? D + frontProj : D;
      if (shouldBand(bottomPanelEdgeBanding, 'horizontal', 'left')) {
        addBand(
          bottomLeft + offsetForEdge('left'),
          legHeight + T / 2,
          zCenter,
          bandThickness,
          T,
          depth,
        );
      }
      if (shouldBand(bottomPanelEdgeBanding, 'horizontal', 'right')) {
        addBand(
          W - bottomLeft + offsetForEdge('right'),
          legHeight + T / 2,
          zCenter,
          bandThickness,
          T,
          depth,
        );
      }
    }
  }
  const addTraverseTop = (
    tr: Traverse,
    zBase: number,
    topWidth: number,
  ) => {
    const widthM = tr.width / 1000;
    if (tr.orientation === 'vertical') {
      const geo = new THREE.BoxGeometry(topWidth, widthM, T);
      const mesh = new THREE.Mesh(geo, carcMat);
      const isFront = zBase === 0;
      const x = W / 2;
      const y = legHeight + H - widthM / 2 - tr.offset / 1000;
      const z = isFront
        ? carcassType === 'type4'
          ? frontProj - T / 2
          : FRONT_OFFSET - T / 2
        : -D + backT + T / 2;
      mesh.position.set(x, y, z);
      addEdges(mesh);
      group.add(mesh);
      const halfHeight = widthM / 2;
      const yTop = y + halfHeight + offsetForEdge('top');
      const yBottom = y - halfHeight + offsetForEdge('bottom');
      if (shouldBand(traverseEdgeBanding, 'horizontal', 'front')) {
        addBand(x, yTop, z, topWidth, bandThickness, T);
      }
      if (shouldBand(traverseEdgeBanding, 'horizontal', 'back')) {
        addBand(x, yBottom, z, topWidth, bandThickness, T);
      }
      if (shouldBand(traverseEdgeBanding, 'horizontal', 'left')) {
        const topLeft = (W - topWidth) / 2;
        addBand(
          topLeft + offsetForEdge('left'),
          y,
          z,
          bandThickness,
          widthM,
          T,
        );
      }
      if (shouldBand(traverseEdgeBanding, 'horizontal', 'right')) {
        const topLeft = (W - topWidth) / 2;
        addBand(
          W - topLeft + offsetForEdge('right'),
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
        const frontBase = carcassType === 'type4' ? frontProj : 0;
        frontEdge = frontBase - tr.offset / 1000;
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
      const zFront = frontEdge + offsetForEdge('front');
      const zBack = backEdge + offsetForEdge('back');
      if (shouldBand(traverseEdgeBanding, 'horizontal', 'front')) {
        addBand(x, legHeight + H - T / 2, zFront, topWidth, T, bandThickness);
      }
      if (shouldBand(traverseEdgeBanding, 'horizontal', 'back')) {
        addBand(x, legHeight + H - T / 2, zBack, topWidth, T, bandThickness);
      }
      if (shouldBand(traverseEdgeBanding, 'horizontal', 'left')) {
        const topLeft = (W - topWidth) / 2;
        addBand(
          topLeft + offsetForEdge('left'),
          legHeight + H - T / 2,
          z,
          bandThickness,
          T,
          widthM,
        );
      }
      if (shouldBand(traverseEdgeBanding, 'horizontal', 'right')) {
        const topLeft = (W - topWidth) / 2;
        addBand(
          W - topLeft + offsetForEdge('right'),
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
    const topDepth = carcassType === 'type4' ? D + frontProj : D;
    const topZ = carcassType === 'type4' ? -D / 2 + frontProj / 2 : -D / 2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(topWidth, T, topDepth), carcMat);
    top.position.set(W / 2, legHeight + H - T / 2, topZ);
    top.userData.part = 'top';
    top.userData.originalMaterial = top.material;
    addEdges(top);
    group.add(top);
    if (shouldBand(topPanelEdgeBanding, 'horizontal', 'front')) {
      const zFront = carcassType === 'type4'
        ? frontProj + offsetForEdge('front')
        : offsetForEdge('front');
      addBand(
        W / 2,
        legHeight + H - T / 2,
        zFront,
        topWidth,
        T,
        bandThickness,
      );
    }
    if (shouldBand(topPanelEdgeBanding, 'horizontal', 'back')) {
      addBand(
        W / 2,
        legHeight + H - T / 2,
        -D + offsetForEdge('back'),
        topWidth,
        T,
        bandThickness,
      );
    }
    if (
      shouldBand(topPanelEdgeBanding, 'horizontal', 'left') ||
      shouldBand(topPanelEdgeBanding, 'horizontal', 'right')
    ) {
      const topLeft = (W - topWidth) / 2;
      const zCenter = carcassType === 'type4' ? -D / 2 + frontProj / 2 : -D / 2;
      const depth = carcassType === 'type4' ? D + frontProj : D;
      if (shouldBand(topPanelEdgeBanding, 'horizontal', 'left')) {
        addBand(
          topLeft + offsetForEdge('left'),
          legHeight + H - T / 2,
          zCenter,
          bandThickness,
          T,
          depth,
        );
      }
      if (shouldBand(topPanelEdgeBanding, 'horizontal', 'right')) {
        addBand(
          W - topLeft + offsetForEdge('right'),
          legHeight + H - T / 2,
          zCenter,
          bandThickness,
          T,
          depth,
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
    back.userData.part = 'back';
    back.userData.originalMaterial = back.material;
    addEdges(back);
    group.add(back);
  } else if (backPanel === 'split') {
    const gap = 0.002;
    const halfH = (H - gap) / 2;
    const backGeo = new THREE.BoxGeometry(W, halfH, backT);
    const bottomBack = new THREE.Mesh(backGeo, backMat);
    bottomBack.position.set(W / 2, legHeight + halfH / 2, -D + backT / 2);
    bottomBack.userData.part = 'back';
    bottomBack.userData.originalMaterial = bottomBack.material;
    addEdges(bottomBack);
    group.add(bottomBack);
    const topBack = new THREE.Mesh(backGeo.clone(), backMat);
    topBack.position.set(W / 2, legHeight + H - halfH / 2, -D + backT / 2);
    topBack.userData.part = 'back';
    topBack.userData.originalMaterial = topBack.material;
    addEdges(topBack);
    group.add(topBack);
  }

  if (backPanel !== 'none' && backT >= 0.018) {
    const z = -D + backT / 2;
    if (backPanel === 'full') {
      if (shouldBand(backEdgeBanding, 'back', 'front')) {
        addBand(
          W / 2,
          legHeight + H + offsetForEdge('top'),
          z,
          W,
          bandThickness,
          backT,
        );
      }
      if (shouldBand(backEdgeBanding, 'back', 'back')) {
        addBand(
          W / 2,
          legHeight + offsetForEdge('bottom'),
          z,
          W,
          bandThickness,
          backT,
        );
      }
      if (shouldBand(backEdgeBanding, 'back', 'top')) {
        addBand(
          offsetForEdge('left'),
          legHeight + H / 2,
          z,
          bandThickness,
          H,
          backT,
        );
      }
      if (shouldBand(backEdgeBanding, 'back', 'bottom')) {
        addBand(
          W + offsetForEdge('right'),
          legHeight + H / 2,
          z,
          bandThickness,
          H,
          backT,
        );
      }
    } else if (backPanel === 'split') {
      const gap = 0.002;
      const halfH = (H - gap) / 2;
      if (shouldBand(backEdgeBanding, 'back', 'front')) {
        addBand(
          W / 2,
          legHeight + H + offsetForEdge('top'),
          z,
          W,
          bandThickness,
          backT,
        );
      }
      if (shouldBand(backEdgeBanding, 'back', 'back')) {
        addBand(
          W / 2,
          legHeight + offsetForEdge('bottom'),
          z,
          W,
          bandThickness,
          backT,
        );
      }
      if (shouldBand(backEdgeBanding, 'back', 'top')) {
        addBand(
          offsetForEdge('left'),
          legHeight + halfH / 2,
          z,
          bandThickness,
          halfH,
          backT,
        );
        addBand(
          offsetForEdge('left'),
          legHeight + H - halfH / 2,
          z,
          bandThickness,
          halfH,
          backT,
        );
      }
      if (shouldBand(backEdgeBanding, 'back', 'bottom')) {
        addBand(
          W + offsetForEdge('right'),
          legHeight + halfH / 2,
          z,
          bandThickness,
          halfH,
          backT,
        );
        addBand(
          W + offsetForEdge('right'),
          legHeight + H - halfH / 2,
          z,
          bandThickness,
          halfH,
          backT,
        );
      }
    }
  }

  // Shelves when there are no drawers
  if (drawers === 0) {
    const shelfGeo = new THREE.BoxGeometry(W - 2 * T, T, D);
    const count = Math.max(0, shelves);
    for (let i = 0; i < count; i++) {
      const shelf = new THREE.Mesh(shelfGeo, carcMat);
      const y = legHeight + (H * (i + 1)) / (count + 1);
      shelf.position.set(W / 2, y, -D / 2);
      shelf.userData.part = 'shelf';
      shelf.userData.originalMaterial = shelf.material;
      addEdges(shelf);
      group.add(shelf);
      if (shouldBand(shelfEdgeBanding, 'horizontal', 'front')) {
        addBand(W / 2, y, offsetForEdge('front'), W - 2 * T, T, bandThickness);
      }
      if (shouldBand(shelfEdgeBanding, 'horizontal', 'back')) {
        addBand(
          W / 2,
          y,
          -D + offsetForEdge('back'),
          W - 2 * T,
          T,
          bandThickness,
        );
      }
      if (shouldBand(shelfEdgeBanding, 'horizontal', 'left')) {
        addBand(T + offsetForEdge('left'), y, -D / 2, bandThickness, T, D);
      }
      if (shouldBand(shelfEdgeBanding, 'horizontal', 'right')) {
        addBand(W - T + offsetForEdge('right'), y, -D / 2, bandThickness, T, D);
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
  }

  // Fronts
  if (showFronts) {
    const gapLeft = gaps.left ?? 0;
    const gapRight = gaps.right ?? 0;
    const gapTop = gaps.top ?? 0;
    const gapBottom = gaps.bottom ?? 0;
    const gapBetween = gaps.between ?? 0;
    const availW = W - (gapLeft + gapRight) / 1000;
    const availH =
      (carcassType === 'type4' ? H - 2 * T : H) -
      (gapTop + gapBottom) / 1000;
    if (drawers > 0) {
      const totalFrontHeight = Math.max(50, Math.round(availH * 1000));
      const arr =
        drawerFronts && drawerFronts.length === drawers
          ? drawerFronts
          : Array.from({ length: drawers }, () =>
              Math.floor(totalFrontHeight / drawers),
            );
      let currentY =
        legHeight + (carcassType === 'type4' ? T : 0) + gapBottom / 1000;
      for (let i = 0; i < drawers; i++) {
        const h = arr[i] / 1000;
        const frontGeo = new THREE.BoxGeometry(availW, h, T);
        const frontMesh = new THREE.Mesh(frontGeo, frontMat);
        const fg = new THREE.Group();
        const frontIndex = frontGroups.length;
        // Start each drawer front completely in front of the carcass with a 2 mm gap
        fg.position.set(gapLeft / 1000 + availW / 2, currentY + h / 2, frontProj - T / 2);
        fg.userData.closedZ = frontProj - T / 2;
        frontMesh.position.set(0, 0, 0);
        addEdges(frontMesh);
        frontMesh.userData.frontIndex = frontIndex;
        fg.add(frontMesh);
        fg.userData.type = 'drawer';
        fg.userData.frontIndex = frontIndex;
        fg.userData.slideDist = -Math.min(0.45, D);
        frontGroups.push(fg);
        openStates.push(false);
        openProgress.push(0);
        if (showHandles) {
          const handleWidth = Math.min(0.4, availW * 0.5);
          const handleHeight = 0.02;
          const handleDepth = 0.03;
          const handleGeo = new THREE.BoxGeometry(
            handleWidth,
            handleHeight,
            handleDepth,
          );
          const handle = new THREE.Mesh(handleGeo, handleMat);
          handle.position.set(0, h / 2 - handleHeight * 1.5, T / 2 + 0.01);
          handle.userData = { frontIndex, isHandle: true };
          frontMesh.add(handle);
        }
        group.add(fg);
        currentY += h;
      }
    } else {
      const doors = Math.max(1, doorCount);
      const doorW =
        (availW - (doors - 1) * gapBetween / 1000) / doors;
      const doorH = availH;
      for (let i = 0; i < doors; i++) {
        const hingeSide = i < doors / 2 ? 'left' : 'right';
        const doorGeo = new THREE.BoxGeometry(doorW, doorH, T);
        const doorMesh = new THREE.Mesh(doorGeo, frontMat);
        const fg = new THREE.Group();
        const frontIndex = frontGroups.length;
        const leftEdge =
          gapLeft / 1000 + i * (doorW + gapBetween / 1000);
        const pivotX = hingeSide === 'left' ? leftEdge : leftEdge + doorW;
        // Hinge pivot sits 2 mm in front of the carcass, door hangs entirely in front
        fg.position.set(
          pivotX,
          legHeight + gapBottom / 1000 + doorH / 2,
          frontProj - T,
        );
        doorMesh.position.set(
          hingeSide === 'left' ? doorW / 2 : -doorW / 2,
          0,
          T / 2,
        );
        addEdges(doorMesh);
        doorMesh.userData.frontIndex = frontIndex;
        fg.add(doorMesh);
        fg.userData.type = 'door';
        fg.userData.frontIndex = frontIndex;
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
          handle.position.set(xPos, doorH * 0.2, T / 2 + 0.01);
          handle.userData = { frontIndex, isHandle: true };
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

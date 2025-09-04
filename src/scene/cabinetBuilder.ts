import * as THREE from 'three';
import { FAMILY, FAMILY_COLORS } from '../core/catalog';
import {
  TopPanel,
  BottomPanel,
  Traverse,
  EdgeBanding,
  SidePanelSpec,
  hasValidSidePanelDimensions,
} from '../types';

export type Orientation = 'vertical' | 'horizontal' | 'back';
export type EdgeName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

const mm = (n: number): number => n / 1000;

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
  legsOffset?: number;
  legsType?: 'standard' | 'reinforced' | 'decorative';
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
    left?: SidePanelSpec;
    right?: SidePanelSpec;
  };
  carcassType?: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6';
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
    legsOffset,
    legsType = 'standard',
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
  const decorativeColour = new THREE.Color(0x8b4513);
  const legOffset = typeof legsOffset === 'number' ? legsOffset : T;

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
  const plateMat = new THREE.MeshStandardMaterial({
    color: footColour,
    metalness: 0.5,
    roughness: 0.4,
  });
  const decorativeMat = new THREE.MeshStandardMaterial({
    color: decorativeColour,
    metalness: 0.2,
    roughness: 0.8,
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
    mesh.userData.ignoreRaycast = true;
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
    e.userData.ignoreRaycast = true;
    mesh.add(e);
  };

  // Sides
  const sideHeight =
    carcassType === 'type1'
      ? H
      : carcassType === 'type2' || carcassType === 'type6'
        ? H - T
        : H - 2 * T;
  const sideY =
    carcassType === 'type2'
      ? legHeight + T + (H - T) / 2
      : carcassType === 'type3' ||
          carcassType === 'type4' ||
          carcassType === 'type5'
        ? legHeight + T + (H - 2 * T) / 2
        : carcassType === 'type6'
          ? legHeight + (H - T) / 2
          : legHeight + H / 2;
  const sideBottomY = sideY - sideHeight / 2;
  const leftGeo = new THREE.BoxGeometry(T, sideHeight, D);
  const leftSide = new THREE.Mesh(leftGeo, carcMat);
  leftSide.position.set(T / 2, sideBottomY + sideHeight / 2, -D / 2);
  leftSide.userData.part = 'leftSide';
  leftSide.userData.originalMaterial = leftSide.material;
  addEdges(leftSide);
  group.add(leftSide);
  const rightGeo = new THREE.BoxGeometry(T, sideHeight, D);
  const rightSide = new THREE.Mesh(rightGeo, carcMat);
  rightSide.position.set(W - T / 2, sideBottomY + sideHeight / 2, -D / 2);
  rightSide.userData.part = 'rightSide';
  rightSide.userData.originalMaterial = rightSide.material;
  addEdges(rightSide);
  group.add(rightSide);
  const bandSide = (
    banding: EdgeBanding | undefined,
    x: number,
    bottomY: number,
    h: number,
    w: number,
  ) => {
    const centerY = bottomY + h / 2;
    const topY = bottomY + h;
    if (shouldBand(banding, 'vertical', 'front')) {
      addBand(x, centerY, offsetForEdge('front'), T, h, bandThickness);
    }
    if (shouldBand(banding, 'vertical', 'back')) {
      addBand(x, centerY, -w + offsetForEdge('back'), T, h, bandThickness);
    }
    if (shouldBand(banding, 'vertical', 'left')) {
      addBand(
        x,
        bottomY + offsetForEdge('bottom'),
        offsetForEdge('front'),
        T,
        bandThickness,
        bandThickness,
      );
    }
    if (shouldBand(banding, 'vertical', 'right')) {
      addBand(
        x,
        topY + offsetForEdge('top'),
        offsetForEdge('front'),
        T,
        bandThickness,
        bandThickness,
      );
    }
    if (carcassType !== 'type5' && shouldBand(banding, 'vertical', 'bottom')) {
      addBand(
        x,
        bottomY + offsetForEdge('bottom'),
        -w / 2,
        T,
        bandThickness,
        w,
      );
    }
    if (shouldBand(banding, 'vertical', 'top')) {
      addBand(x, topY + offsetForEdge('top'), -w / 2, T, bandThickness, w);
    }
  };
  bandSide(leftSideEdgeBanding, T / 2, sideBottomY, sideHeight, D);
  bandSide(rightSideEdgeBanding, W - T / 2, sideBottomY, sideHeight, D);

  const bandPanel = (
    banding: EdgeBanding | undefined,
    x: number,
    bottomY: number,
    h: number,
    w: number,
  ) => {
    const centerY = bottomY + h / 2;
    const topY = bottomY + h;
    if (shouldBand(banding, 'vertical', 'front')) {
      addBand(x, centerY, offsetForEdge('front'), T, h, bandThickness);
    }
    if (shouldBand(banding, 'vertical', 'back')) {
      addBand(x, centerY, -w + offsetForEdge('back'), T, h, bandThickness);
    }
    if (shouldBand(banding, 'vertical', 'left')) {
      addBand(
        x,
        bottomY + offsetForEdge('bottom'),
        offsetForEdge('front'),
        T,
        bandThickness,
        bandThickness,
      );
    }
    if (shouldBand(banding, 'vertical', 'right')) {
      addBand(
        x,
        topY + offsetForEdge('top'),
        offsetForEdge('front'),
        T,
        bandThickness,
        bandThickness,
      );
    }
    if (carcassType !== 'type5' && shouldBand(banding, 'vertical', 'bottom')) {
      addBand(
        x,
        bottomY + offsetForEdge('bottom'),
        -w / 2,
        T,
        bandThickness,
        w,
      );
    }
    if (shouldBand(banding, 'vertical', 'top')) {
      addBand(x, topY + offsetForEdge('top'), -w / 2, T, bandThickness, w);
    }
  };

  if (sidePanels.left?.panel && hasValidSidePanelDimensions(sidePanels.left)) {
    const pw = sidePanels.left.width / 1000;
    const drop = sidePanels.left.dropToFloor;
    const ph = drop
      ? (sidePanels.left.height + legHeight) / 1000
      : sidePanels.left.height / 1000;
    const bottom = drop
      ? (gaps.bottom || 0) / 1000
      : legHeight + (gaps.bottom || 0) / 1000;
    const geo = new THREE.BoxGeometry(T, ph, pw);
    const panel = new THREE.Mesh(geo, carcMat);
    const y = bottom + ph / 2;
    panel.position.set(-T / 2, y, -pw / 2);
    panel.userData.part = 'leftSide';
    panel.userData.originalMaterial = panel.material;
    addEdges(panel);
    group.add(panel);
    bandPanel(leftSideEdgeBanding, -T / 2, bottom, ph, pw);
  }
  if (
    sidePanels.right?.panel &&
    hasValidSidePanelDimensions(sidePanels.right)
  ) {
    const pw = sidePanels.right.width / 1000;
    const drop = sidePanels.right.dropToFloor;
    const ph = drop
      ? (sidePanels.right.height + legHeight) / 1000
      : sidePanels.right.height / 1000;
    const bottom = drop
      ? (gaps.bottom || 0) / 1000
      : legHeight + (gaps.bottom || 0) / 1000;
    const geo = new THREE.BoxGeometry(T, ph, pw);
    const panel = new THREE.Mesh(geo, carcMat);
    const y = bottom + ph / 2;
    panel.position.set(W + T / 2, y, -pw / 2);
    panel.userData.part = 'rightSide';
    panel.userData.originalMaterial = panel.material;
    addEdges(panel);
    group.add(panel);
    bandPanel(rightSideEdgeBanding, W + T / 2, bottom, ph, pw);
  }

  if (sidePanels.left?.blenda) {
    const bl = sidePanels.left.blenda;
    const w = bl.width / 1000;
    const h = bl.height / 1000;
    const geo = new THREE.BoxGeometry(w, h, T);
    const mesh = new THREE.Mesh(geo, frontMat);
    const baseX = sidePanels.left.panel ? -T : 0;
    const y = legHeight + (gaps.bottom || 0) / 1000 + h / 2;
    mesh.position.set(baseX - w / 2, y, frontProj - T / 2);
    addEdges(mesh);
    group.add(mesh);
  }
  if (sidePanels.right?.blenda) {
    const bl = sidePanels.right.blenda;
    const w = bl.width / 1000;
    const h = bl.height / 1000;
    const geo = new THREE.BoxGeometry(w, h, T);
    const mesh = new THREE.Mesh(geo, frontMat);
    const baseX = sidePanels.right.panel ? W + T : W;
    const y = legHeight + (gaps.bottom || 0) / 1000 + h / 2;
    mesh.position.set(baseX + w / 2, y, frontProj - T / 2);
    addEdges(mesh);
    group.add(mesh);
  }

  // Top and bottom
  const bottomWidth =
    carcassType === 'type1' || carcassType === 'type6' ? W - 2 * T : W;
  const topWidth =
    carcassType === 'type3' ||
    carcassType === 'type4' ||
    carcassType === 'type5' ||
    carcassType === 'type6'
      ? W
      : W - 2 * T;
  const sideInset =
    carcassType === 'type3' ||
    carcassType === 'type4' ||
    carcassType === 'type5' ||
    carcassType === 'type6'
      ? 0
      : T;
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
      const zFront =
        carcassType === 'type4'
          ? frontProj + offsetForEdge('front')
          : offsetForEdge('front');
      addBand(W / 2, legHeight + T / 2, zFront, bottomWidth, T, bandThickness);
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
  const addTraverseTop = (tr: Traverse, zBase: number, topWidth: number) => {
    const widthM = tr.width / 1000;
    if (tr.orientation === 'vertical') {
      const geo = new THREE.BoxGeometry(topWidth, widthM, T);
      const mesh = new THREE.Mesh(geo, carcMat);
      const isFront = zBase === 0;
      const x = W / 2;
      const y = legHeight + H - widthM / 2 - tr.offset / 1000;
      const z = isFront
        ? carcassType === 'type4' ||
          carcassType === 'type5' ||
          carcassType === 'type6'
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
        const frontBase =
          carcassType === 'type4' ||
          carcassType === 'type5' ||
          carcassType === 'type6'
            ? frontProj
            : 0;
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
    const topDepth =
      carcassType === 'type4' ||
      carcassType === 'type5' ||
      carcassType === 'type6'
        ? D + frontProj
        : D;
    const topZ =
      carcassType === 'type4' ||
      carcassType === 'type5' ||
      carcassType === 'type6'
        ? -D / 2 + frontProj / 2
        : -D / 2;
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(topWidth, T, topDepth),
      carcMat,
    );
    top.position.set(W / 2, legHeight + H - T / 2, topZ);
    top.userData.part = 'top';
    top.userData.originalMaterial = top.material;
    addEdges(top);
    group.add(top);
    if (shouldBand(topPanelEdgeBanding, 'horizontal', 'front')) {
      const zFront =
        carcassType === 'type4' ||
        carcassType === 'type5' ||
        carcassType === 'type6'
          ? frontProj + offsetForEdge('front')
          : offsetForEdge('front');
      addBand(W / 2, legHeight + H - T / 2, zFront, topWidth, T, bandThickness);
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
      const zCenter =
        carcassType === 'type4' ||
        carcassType === 'type5' ||
        carcassType === 'type6'
          ? -D / 2 + frontProj / 2
          : -D / 2;
      const depth =
        carcassType === 'type4' ||
        carcassType === 'type5' ||
        carcassType === 'type6'
          ? D + frontProj
          : D;
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
      (carcassType === 'type4'
        ? H - 2 * T
        : carcassType === 'type5' || carcassType === 'type6'
          ? H - T
          : H) -
      (gapTop + gapBottom) / 1000;
    if (drawers > 0) {
      const totalFrontHeight = Math.max(50, Math.round(availH * 1000));
      const arr =
        drawerFronts && drawerFronts.length === drawers
          ? drawerFronts
          : Array.from({ length: drawers }, () =>
              Math.floor(totalFrontHeight / drawers),
            );
      const bottomOffset = carcassType === 'type4' ? T : 0;
      let currentY = legHeight + bottomOffset + gapBottom / 1000;
      for (let i = 0; i < drawers; i++) {
        const h = arr[i] / 1000;
        const frontGeo = new THREE.BoxGeometry(availW, h, T);
        const frontMesh = new THREE.Mesh(frontGeo, frontMat);
        const fg = new THREE.Group();
        const frontIndex = frontGroups.length;
        // Start each drawer front completely in front of the carcass with a 2 mm gap
        fg.position.set(
          gapLeft / 1000 + availW / 2,
          currentY + h / 2,
          frontProj - T / 2,
        );
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
      const doorW = (availW - ((doors - 1) * gapBetween) / 1000) / doors;
      const doorH = availH;
      for (let i = 0; i < doors; i++) {
        const hingeSide = i < doors / 2 ? 'left' : 'right';
        const doorGeo = new THREE.BoxGeometry(doorW, doorH, T);
        const doorMesh = new THREE.Mesh(doorGeo, frontMat);
        const fg = new THREE.Group();
        const frontIndex = frontGroups.length;
        const leftEdge = gapLeft / 1000 + i * (doorW + gapBetween / 1000);
        const pivotX = hingeSide === 'left' ? leftEdge : leftEdge + doorW;
        // Hinge pivot sits 2 mm in front of the carcass, door hangs entirely in front
        const bottomOffset = carcassType === 'type4' ? T : 0;
        const baseY = legHeight + bottomOffset + gapBottom / 1000 + doorH / 2;
        fg.position.set(pivotX, baseY, frontProj - T);
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
    const legTotalHeight = legHeight;
    const standardRadius = 0.03;
    const baseSize = 0.08;
    const reinforcedCylRadius = 0.036 / 2;
    const decorativeSize = 0.04;
    const halfSize =
      legsType === 'decorative'
        ? decorativeSize / 2
        : legsType === 'reinforced'
          ? baseSize / 2
          : standardRadius;
    const positions: [number, number][] = [
      [T + halfSize, -(legOffset + halfSize)],
      [W - T - halfSize, -(legOffset + halfSize)],
      [T + halfSize, -D + legOffset + halfSize],
      [W - T - halfSize, -D + legOffset + halfSize],
    ];

    const buildReinforcedLeg = (
      position: THREE.Vector3,
      height: number,
    ): THREE.Object3D => {
      const legGroup = new THREE.Group();
      // Ensure both the base and top plates share the same 22 mm height
      const plateThickness = mm(22);
      const chamfer = mm(8);
      const halfPlate = baseSize / 2;
      const cylRadius = reinforcedCylRadius;
      const cylHeight = Math.max(height - plateThickness * 2, 0);
      const screwRadius = mm(10) / 2;

      const plateShape = new THREE.Shape();
      plateShape.moveTo(-halfPlate, halfPlate);
      plateShape.lineTo(halfPlate, halfPlate);
      plateShape.lineTo(halfPlate, -halfPlate + chamfer);
      plateShape.lineTo(halfPlate - chamfer, -halfPlate);
      plateShape.lineTo(-halfPlate + chamfer, -halfPlate);
      plateShape.lineTo(-halfPlate, -halfPlate + chamfer);
      plateShape.lineTo(-halfPlate, halfPlate);

      const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
        depth: plateThickness,
        bevelEnabled: false,
      });
      const bottomPlate = new THREE.Mesh(plateGeo, plateMat);
      bottomPlate.rotation.x = -Math.PI / 2;
      bottomPlate.position.y = 0;
      legGroup.add(bottomPlate);

      const topPlate = bottomPlate.clone();
      topPlate.position.y = height - plateThickness;
      legGroup.add(topPlate);

      if (cylHeight > 0) {
        const cylGeo = new THREE.CylinderGeometry(
          cylRadius,
          cylRadius,
          cylHeight,
          16,
        );
        const cyl = new THREE.Mesh(cylGeo, footMat);
        cyl.position.y = plateThickness + cylHeight / 2;
        legGroup.add(cyl);

        const screwGeo = new THREE.CylinderGeometry(
          screwRadius,
          screwRadius,
          cylHeight,
          16,
        );
        const screw = new THREE.Mesh(screwGeo, footMat);
        screw.position.y = plateThickness + cylHeight / 2;
        legGroup.add(screw);
      }

      legGroup.position.copy(position);
      return legGroup;
    };

    const buildDecorativeLeg = (
      position: THREE.Vector3,
      height: number,
    ): THREE.Object3D => {
      const legGroup = new THREE.Group();
      const decoGeo = new THREE.BoxGeometry(
        decorativeSize,
        height,
        decorativeSize,
      );
      const deco = new THREE.Mesh(decoGeo, decorativeMat);
      deco.position.y = height / 2;
      legGroup.add(deco);
      legGroup.position.copy(position);
      return legGroup;
    };

    const buildStandardLeg = (
      position: THREE.Vector3,
      height: number,
    ): THREE.Object3D => {
      const legGroup = new THREE.Group();

      // Dimensions in metres
      // Match base and top plate heights to 22 mm
      const plateThickness = mm(22);
      const plateOuterR = mm(60) / 2;
      const plateInnerR = mm(50) / 2;
      const footHeight = mm(22); // base (foot) height
      const footRadius = mm(50) / 2;
      const shaftRadius = mm(22) / 2;
      const screwRadius = mm(10) / 2;
      const totalMiddleHeight = Math.max(
        height - plateThickness - footHeight,
        0,
      );
      // Split remaining height so the smaller cylinder is 1/5 and the larger 4/5
      const screwHeight = totalMiddleHeight / 5;
      const shaftHeight = (totalMiddleHeight * 4) / 5;

      const footShape = new THREE.Shape();
      footShape.absarc(0, 0, footRadius, 0, Math.PI * 2, false);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const notch = new THREE.Path();
        notch.absarc(
          Math.cos(angle) * (footRadius - 0.007),
          Math.sin(angle) * (footRadius - 0.007),
          mm(3),
          0,
          Math.PI * 2,
          true,
        );
        footShape.holes.push(notch);
      }
      const footGeo = new THREE.ExtrudeGeometry(footShape, {
        depth: footHeight,
        bevelEnabled: false,
        curveSegments: 16,
      });
      footGeo.translate(0, 0, -footHeight / 2);
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.rotation.x = -Math.PI / 2;
      foot.position.y = footHeight / 2;
      legGroup.add(foot);

      const screwGeo = new THREE.CylinderGeometry(
        screwRadius,
        screwRadius,
        screwHeight,
        16,
      );
      const screw = new THREE.Mesh(screwGeo, footMat);
      screw.position.y = footHeight + screwHeight / 2;
      legGroup.add(screw);

      const shaftGeo = new THREE.CylinderGeometry(
        shaftRadius,
        shaftRadius,
        shaftHeight,
        16,
      );
      const shaft = new THREE.Mesh(shaftGeo, footMat);
      shaft.position.y = footHeight + screwHeight + shaftHeight / 2;
      legGroup.add(shaft);

      const plateShape = new THREE.Shape();
      plateShape.absarc(0, 0, plateOuterR, 0, Math.PI * 2, false);
      const plateHole = new THREE.Path();
      plateHole.absarc(0, 0, plateInnerR, 0, Math.PI * 2, true);
      plateShape.holes.push(plateHole);
      const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
        depth: plateThickness,
        bevelEnabled: false,
        curveSegments: 32,
      });
      plateGeo.translate(0, 0, -plateThickness / 2);
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.rotation.x = -Math.PI / 2;
      plate.position.y =
        footHeight + screwHeight + shaftHeight + plateThickness / 2;
      legGroup.add(plate);

      legGroup.position.copy(position);
      return legGroup;
    };

    positions.forEach(([x, z]) => {
      const pos = new THREE.Vector3(x, 0, z);
      const leg =
        legsType === 'reinforced'
          ? buildReinforcedLeg(pos, legTotalHeight)
          : legsType === 'decorative'
            ? buildDecorativeLeg(pos, legTotalHeight)
            : buildStandardLeg(pos, legTotalHeight);
      group.add(leg);
    });
  }
  group.userData.frontGroups = frontGroups;
  group.userData.openStates = openStates;
  group.userData.openProgress = openProgress;
  return group;
}

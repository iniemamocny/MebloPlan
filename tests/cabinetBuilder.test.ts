import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildCabinetMesh } from '../src/scene/cabinetBuilder';
import { FAMILY } from '../src/core/catalog';

const FRONT_OFFSET = 0.002;
const WIDTH = 1;
const HEIGHT = 0.9;
const DEPTH = 0.5;
const BOARD_THICKNESS = 0.018;
const BAND_THICKNESS = 0.0008;

describe('buildCabinetMesh', () => {
  it('returns group with expected children for drawers', () => {
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 2,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
    });
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.children.length).toBe(7);
  });

  it('creates provided number of drawer groups', () => {
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 3,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
    });
    const drawers = g.children.filter(
      (c) => c instanceof THREE.Group && (c as any).userData.type === 'drawer',
    );
    expect(drawers.length).toBe(3);
  });

  it('returns group with expected children for doors', () => {
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
    });
    expect(g.children.length).toBe(7);
  });

  it('creates provided number of door groups', () => {
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 0,
      doorCount: 2,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
    });
    const doors = g.children.filter(
      (c) => c instanceof THREE.Group && (c as any).userData.type === 'door',
    );
    expect(doors.length).toBe(2);
  });

  it('omits front groups when showFronts is false', () => {
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 1,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      showFronts: false,
    });
    const fronts = g.children.filter(
      (c) => c instanceof THREE.Group && (c as any).userData?.type,
    );
    expect(fronts.length).toBe(0);
    expect((g.userData.frontGroups || []).length).toBe(0);
  });

  it('adds divider when dividerPosition provided', () => {
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 0,
      doorCount: 3,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      dividerPosition: 'left',
    });
    const div = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs(c.position.x - 1 / 3) < 0.001 &&
        (c as THREE.Mesh).geometry instanceof THREE.BoxGeometry &&
        (c as any).geometry.parameters.width === 0.018,
    );
    expect(div).toBeTruthy();
  });

  it('does not add divider when drawers present', () => {
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 2,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      dividerPosition: 'left',
    });
    const div = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs(c.position.x - 1 / 3) < 0.001 &&
        (c as THREE.Mesh).geometry instanceof THREE.BoxGeometry &&
        (c as any).geometry.parameters.width === 0.018,
    );
    expect(div).toBeUndefined();
  });

  it('matches provided dimensions', () => {
    const width = 0.8;
    const height = 0.7;
    const depth = 0.6;
    const g = buildCabinetMesh({
      width,
      height,
      depth,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      showHandles: false,
    });
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    const size = box.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(width, 5);
    expect(size.y).toBeCloseTo(height, 5);
    const boardThickness = 0.018;
    expect(size.z).toBeCloseTo(depth + boardThickness + FRONT_OFFSET, 5);
  });

  it('handles carcass type4 depth and front heights', () => {
    const carcass = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      carcassType: 'type4',
      showFronts: false,
    });
    carcass.updateMatrixWorld(true);
    const carcBox = new THREE.Box3().setFromObject(carcass);
    const carcSize = carcBox.getSize(new THREE.Vector3());
    expect(carcSize.z).toBeCloseTo(
      DEPTH + BOARD_THICKNESS + FRONT_OFFSET,
      5,
    );

    const gDoor = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      carcassType: 'type4',
    });
    const doorGroup = gDoor.children.find(
      (c) => c instanceof THREE.Group && (c as any).userData.type === 'door',
    ) as THREE.Group;
    const doorMesh = doorGroup.children[0] as THREE.Mesh;
    expect((doorMesh.geometry as any).parameters.height).toBeCloseTo(
      HEIGHT - 2 * BOARD_THICKNESS,
      5,
    );

    const gDrawer = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 1,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      carcassType: 'type4',
    });
    const drawerGroup = gDrawer.children.find(
      (c) => c instanceof THREE.Group && (c as any).userData.type === 'drawer',
    ) as THREE.Group;
    const drawerMesh = drawerGroup.children[0] as THREE.Mesh;
    expect((drawerMesh.geometry as any).parameters.height).toBeCloseTo(
      HEIGHT - 2 * BOARD_THICKNESS,
      5,
    );
  });

  it('handles carcass type5 depth and front heights', () => {
    const carcass = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      carcassType: 'type5',
      showFronts: false,
    });
    carcass.updateMatrixWorld(true);
    const carcBox = new THREE.Box3().setFromObject(carcass);
    const carcSize = carcBox.getSize(new THREE.Vector3());
    expect(carcSize.z).toBeCloseTo(
      DEPTH + BOARD_THICKNESS + FRONT_OFFSET,
      5,
    );

    const sideMesh = carcass.children.find(
      (c) => c instanceof THREE.Mesh && (c as any).userData.part === 'leftSide',
    ) as THREE.Mesh;
    expect((sideMesh.geometry as any).parameters.height).toBeCloseTo(
      HEIGHT - 2 * BOARD_THICKNESS,
      5,
    );
    const rightSide = carcass.children.find(
      (c) => c instanceof THREE.Mesh && (c as any).userData.part === 'rightSide',
    ) as THREE.Mesh;
    expect((rightSide.geometry as any).parameters.height).toBeCloseTo(
      HEIGHT - 2 * BOARD_THICKNESS,
      5,
    );

    const gDoor = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      carcassType: 'type5',
    });
    const doorGroup = gDoor.children.find(
      (c) => c instanceof THREE.Group && (c as any).userData.type === 'door',
    ) as THREE.Group;
    const doorMesh = doorGroup.children[0] as THREE.Mesh;
    expect((doorMesh.geometry as any).parameters.height).toBeCloseTo(
      HEIGHT - BOARD_THICKNESS,
      5,
    );

    const gDrawer = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 1,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      carcassType: 'type5',
    });
    const drawerGroup = gDrawer.children.find(
      (c) => c instanceof THREE.Group && (c as any).userData.type === 'drawer',
    ) as THREE.Group;
    const drawerMesh = drawerGroup.children[0] as THREE.Mesh;
    expect((drawerMesh.geometry as any).parameters.height).toBeCloseTo(
      HEIGHT - BOARD_THICKNESS,
      5,
    );
  });

  it('keeps depth and reduces door front by only the top board for carcass type6', () => {
    const carcass = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      carcassType: 'type6',
      showFronts: false,
    });
    carcass.updateMatrixWorld(true);
    const carcSize = new THREE.Box3().setFromObject(carcass).getSize(new THREE.Vector3());
    expect(carcSize.z).toBeCloseTo(
      DEPTH + BOARD_THICKNESS + FRONT_OFFSET,
      5,
    );

    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      carcassType: 'type6',
    });
    const doorGroup = g.children.find(
      (c) => c instanceof THREE.Group && (c as any).userData.type === 'door',
    ) as THREE.Group;
    const doorMesh = doorGroup.children[0] as THREE.Mesh;
    expect((doorMesh.geometry as any).parameters.height).toBeCloseTo(
      HEIGHT - BOARD_THICKNESS,
      5,
    );
  });

  it('positions vertical traverse by y offset', () => {
    const offset = 100;
    const trWidth = 100;
    const depth = 0.5;
    const height = 0.9;
    const g = buildCabinetMesh({
      width: 1,
      height,
      depth,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      topPanel: {
        type: 'frontTraverse',
        traverse: { orientation: 'vertical', offset, width: trWidth },
      },
    });
    const boardThickness = 0.018;
    const expectedWidth = 1 - 2 * boardThickness;
    const widthM = trWidth / 1000;
    const traverse = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - expectedWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - widthM) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - boardThickness) < 1e-6,
    ) as THREE.Mesh | undefined;
    expect(traverse).toBeTruthy();
    expect(traverse!.position.x).toBeCloseTo(0.5, 5);
    const expectedY = height - widthM / 2 - offset / 1000;
    expect(traverse!.position.y).toBeCloseTo(expectedY, 5);
    expect(traverse!.position.z).toBeCloseTo(
      FRONT_OFFSET - boardThickness / 2,
      5,
    );
  });

  it('aligns front vertical traverse with cabinet front', () => {
    const trWidth = 100;
    const depth = 0.5;
    const height = 0.9;
    const g = buildCabinetMesh({
      width: 1,
      height,
      depth,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      topPanel: {
        type: 'frontTraverse',
        traverse: { orientation: 'vertical', offset: 0, width: trWidth },
      },
    });
    const boardThickness = 0.018;
    const expectedWidth = 1 - 2 * boardThickness;
    const widthM = trWidth / 1000;
    const traverse = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - expectedWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - widthM) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - boardThickness) < 1e-6,
    ) as THREE.Mesh | undefined;
    expect(traverse).toBeTruthy();
    expect(traverse!.position.x).toBeCloseTo(0.5, 5);
    const expectedY = height - widthM / 2;
    expect(traverse!.position.y).toBeCloseTo(expectedY, 5);
    expect(traverse!.position.z).toBeCloseTo(
      FRONT_OFFSET - boardThickness / 2,
      5,
    );
  });

  it('positions back vertical traverse taking back thickness into account', () => {
    const depth = 0.5;
    const trWidth = 100;
    const height = 0.9;
    const g = buildCabinetMesh({
      width: 1,
      height,
      depth,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      topPanel: {
        type: 'backTraverse',
        traverse: { orientation: 'vertical', offset: 0, width: trWidth },
      },
    });
    const boardThickness = 0.018;
    const expectedWidth = 1 - 2 * boardThickness;
    const widthM = trWidth / 1000;
    const traverse = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - expectedWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - widthM) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - boardThickness) < 1e-6,
    ) as THREE.Mesh | undefined;
    expect(traverse).toBeTruthy();
    const backThickness = 0.003;
    const expectedY = height - widthM / 2;
    expect(traverse!.position.y).toBeCloseTo(expectedY, 5);
    expect(traverse!.position.z).toBeCloseTo(
      -depth + backThickness + boardThickness / 2,
      5,
    );
  });

  it('adds traverse edge banding to vertical traverse on all edges', () => {
    const trWidth = 100;
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      traverseEdgeBanding: {
        front: true,
        back: true,
        left: true,
        right: true,
      },
      topPanel: {
        type: 'frontTraverse',
        traverse: { orientation: 'vertical', offset: 0, width: trWidth },
      },
    });
    const boardThickness = 0.018;
    const bandThickness = 0.0008;
    const topWidth = 1 - 2 * boardThickness;
    const widthM = trWidth / 1000;
    const traverseY = 0.9 - widthM / 2;
    const traverseZ = FRONT_OFFSET - boardThickness / 2;
    const topBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - topWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - bandThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - boardThickness) < 1e-6 &&
        Math.abs(c.position.x - 0.5) < 1e-6 &&
        Math.abs(
          c.position.y - (traverseY + widthM / 2 + bandThickness / 2),
        ) < 1e-6 &&
        Math.abs(c.position.z - traverseZ) < 1e-6,
    );
    const bottomBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - topWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - bandThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - boardThickness) < 1e-6 &&
        Math.abs(c.position.x - 0.5) < 1e-6 &&
        Math.abs(
          c.position.y - (traverseY - widthM / 2 - bandThickness / 2),
        ) < 1e-6 &&
        Math.abs(c.position.z - traverseZ) < 1e-6,
    );
    const leftBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - bandThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - widthM) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - boardThickness) < 1e-6 &&
        Math.abs(c.position.x - (boardThickness - bandThickness / 2)) < 1e-6 &&
        Math.abs(c.position.y - traverseY) < 1e-6 &&
        Math.abs(c.position.z - traverseZ) < 1e-6,
    );
    const rightBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - bandThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - widthM) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - boardThickness) < 1e-6 &&
        Math.abs(
          c.position.x - (1 - boardThickness + bandThickness / 2),
        ) < 1e-6 &&
        Math.abs(c.position.y - traverseY) < 1e-6 &&
        Math.abs(c.position.z - traverseZ) < 1e-6,
    );
    expect(topBand).toBeTruthy();
    expect(bottomBand).toBeTruthy();
    expect(leftBand).toBeTruthy();
    expect(rightBand).toBeTruthy();
  });

  it('adds edge banding to side panels on top and bottom edges', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      rightSideEdgeBanding: {
        top: true,
        bottom: true,
      },
      leftSideEdgeBanding: {
        top: true,
        bottom: true,
      },
    });
    const bandThickness = 0.0008;
    const boardThickness = 0.018;
    const depth = 0.5;
    const bottomY = -bandThickness / 2;
    const topY = 0.9 + bandThickness / 2;
    const bands = g.children.filter(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - boardThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - bandThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - depth) < 1e-6,
    ) as THREE.Mesh[];
    const bottomBands = bands.filter((b) => Math.abs(b.position.y - bottomY) < 1e-6);
    const topBands = bands.filter((b) => Math.abs(b.position.y - topY) < 1e-6);
    expect(bottomBands.length).toBe(2);
    expect(topBands.length).toBe(2);
  });

  it('skips bottom edge banding for carcass type5', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      carcassType: 'type5',
      rightSideEdgeBanding: {
        bottom: true,
      },
      leftSideEdgeBanding: {
        bottom: true,
      },
    });
    const bandThickness = BAND_THICKNESS;
    const boardThickness = BOARD_THICKNESS;
    const depth = DEPTH;
    const bottomY = -bandThickness / 2;
    const bands = g.children.filter(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - boardThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - bandThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - depth) < 1e-6,
    ) as THREE.Mesh[];
    const bottomBands = bands.filter(
      (b) => Math.abs(b.position.y - bottomY) < 1e-6,
    );
    expect(bottomBands.length).toBe(0);
  });

  it('does not band top or bottom panels when side front banding selected', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      leftSideEdgeBanding: { front: true },
    });
    const bottomWidth = WIDTH - 2 * BOARD_THICKNESS;
    const topWidth = WIDTH - 2 * BOARD_THICKNESS;
    const bottomBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - bottomWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - BOARD_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - BAND_THICKNESS) < 1e-6 &&
        Math.abs(c.position.x - WIDTH / 2) < 1e-6 &&
        Math.abs(c.position.y - BOARD_THICKNESS / 2) < 1e-6 &&
        Math.abs(c.position.z - BAND_THICKNESS / 2) < 1e-6,
    );
    const topBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - topWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - BOARD_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - BAND_THICKNESS) < 1e-6 &&
        Math.abs(c.position.x - WIDTH / 2) < 1e-6 &&
        Math.abs(c.position.y - (HEIGHT - BOARD_THICKNESS / 2)) < 1e-6 &&
        Math.abs(c.position.z - BAND_THICKNESS / 2) < 1e-6,
    );
    expect(bottomBand).toBeUndefined();
    expect(topBand).toBeUndefined();
  });

  it('bands top and bottom panels when edge flags set', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      topPanelEdgeBanding: { front: true },
      bottomPanelEdgeBanding: { front: true },
    });
    const panelWidth = WIDTH - 2 * BOARD_THICKNESS;
    const bottomBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - panelWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - BOARD_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - BAND_THICKNESS) < 1e-6 &&
        Math.abs(c.position.x - WIDTH / 2) < 1e-6 &&
        Math.abs(c.position.y - BOARD_THICKNESS / 2) < 1e-6 &&
        Math.abs(c.position.z - BAND_THICKNESS / 2) < 1e-6,
    );
    const topBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - panelWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - BOARD_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - BAND_THICKNESS) < 1e-6 &&
        Math.abs(c.position.x - WIDTH / 2) < 1e-6 &&
        Math.abs(c.position.y - (HEIGHT - BOARD_THICKNESS / 2)) < 1e-6 &&
        Math.abs(c.position.z - BAND_THICKNESS / 2) < 1e-6,
    );
    expect(bottomBand).toBeTruthy();
    expect(topBand).toBeTruthy();
  });

  it('bands only right side when rightSideEdgeBanding is set', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      rightSideEdgeBanding: { front: true },
      leftSideEdgeBanding: {},
    });
    const bands = g.children.filter(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - BOARD_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - HEIGHT) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - BAND_THICKNESS) < 1e-6 &&
        Math.abs(c.position.z - BAND_THICKNESS / 2) < 1e-6,
    ) as THREE.Mesh[];
    const leftBand = bands.find((b) => Math.abs(b.position.x - BOARD_THICKNESS / 2) < 1e-6);
    const rightBand = bands.find(
      (b) => Math.abs(b.position.x - (WIDTH - BOARD_THICKNESS / 2)) < 1e-6,
    );
    expect(rightBand).toBeTruthy();
    expect(leftBand).toBeFalsy();
  });

  it('bands only left side when leftSideEdgeBanding is set', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      rightSideEdgeBanding: {},
      leftSideEdgeBanding: { front: true },
    });
    const bands = g.children.filter(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - BOARD_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - HEIGHT) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - BAND_THICKNESS) < 1e-6 &&
        Math.abs(c.position.z - BAND_THICKNESS / 2) < 1e-6,
    ) as THREE.Mesh[];
    const leftBand = bands.find((b) => Math.abs(b.position.x - BOARD_THICKNESS / 2) < 1e-6);
    const rightBand = bands.find(
      (b) => Math.abs(b.position.x - (WIDTH - BOARD_THICKNESS / 2)) < 1e-6,
    );
    expect(leftBand).toBeTruthy();
    expect(rightBand).toBeFalsy();
  });

  it('adds shelf edge banding on front edge', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      shelves: 1,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      shelfEdgeBanding: { front: true },
    });
    const y = HEIGHT / 2;
    const band = g.children.filter(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - (WIDTH - 2 * BOARD_THICKNESS)) <
          1e-6 &&
        Math.abs((c as any).geometry.parameters.height - BOARD_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - BAND_THICKNESS) < 1e-6 &&
        Math.abs(c.position.x - WIDTH / 2) < 1e-6 &&
        Math.abs(c.position.y - y) < 1e-6 &&
        Math.abs(c.position.z - BAND_THICKNESS / 2) < 1e-6,
    );
    expect(band.length).toBe(1);
  });

  it('adds shelf edge banding on back edge', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      shelves: 1,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      shelfEdgeBanding: { back: true },
    });
    const y = HEIGHT / 2;
    const band = g.children.filter(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - (WIDTH - 2 * BOARD_THICKNESS)) <
          1e-6 &&
        Math.abs((c as any).geometry.parameters.height - BOARD_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - BAND_THICKNESS) < 1e-6 &&
        Math.abs(c.position.x - WIDTH / 2) < 1e-6 &&
        Math.abs(c.position.y - y) < 1e-6 &&
        Math.abs(
          c.position.z - (-DEPTH - BAND_THICKNESS / 2),
        ) < 1e-6,
    );
    expect(band.length).toBe(1);
  });

  it('adds shelf edge banding on left edge', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      shelves: 1,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      shelfEdgeBanding: { left: true },
    });
    const y = HEIGHT / 2;
    const band = g.children.filter(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - BAND_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - BOARD_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - DEPTH) < 1e-6 &&
        Math.abs(c.position.x - (BOARD_THICKNESS - BAND_THICKNESS / 2)) < 1e-6 &&
        Math.abs(c.position.y - y) < 1e-6 &&
        Math.abs(c.position.z - -DEPTH / 2) < 1e-6,
    );
    expect(band.length).toBe(1);
  });

  it('adds shelf edge banding on right edge', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      shelves: 1,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      shelfEdgeBanding: { right: true },
    });
    const y = HEIGHT / 2;
    const band = g.children.filter(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - BAND_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - BOARD_THICKNESS) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - DEPTH) < 1e-6 &&
        Math.abs(c.position.x - (WIDTH - BOARD_THICKNESS + BAND_THICKNESS / 2)) < 1e-6 &&
        Math.abs(c.position.y - y) < 1e-6 &&
        Math.abs(c.position.z - -DEPTH / 2) < 1e-6,
    );
    expect(band.length).toBe(1);
  });

  it('adds back panel edge banding on all edges', () => {
    const backT = 0.018;
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      shelves: 0,
      backThickness: backT,
      backEdgeBanding: {
        front: true,
        back: true,
        top: true,
        bottom: true,
      },
      rightSideEdgeBanding: {},
      leftSideEdgeBanding: {},
    });
    const bandThickness = 0.0008;
    const z = -0.5 + backT / 2;
    const topBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - 1) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - bandThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - backT) < 1e-6 &&
        Math.abs(c.position.x - 0.5) < 1e-6 &&
        Math.abs(c.position.y - (0.9 + bandThickness / 2)) < 1e-6 &&
        Math.abs(c.position.z - z) < 1e-6,
    );
    const bottomBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - 1) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - bandThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - backT) < 1e-6 &&
        Math.abs(c.position.x - 0.5) < 1e-6 &&
        Math.abs(c.position.y - -bandThickness / 2) < 1e-6 &&
        Math.abs(c.position.z - z) < 1e-6,
    );
    const leftBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - bandThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - 0.9) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - backT) < 1e-6 &&
        Math.abs(c.position.x - -bandThickness / 2) < 1e-6 &&
        Math.abs(c.position.y - 0.45) < 1e-6 &&
        Math.abs(c.position.z - z) < 1e-6,
    );
    const rightBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - bandThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - 0.9) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - backT) < 1e-6 &&
        Math.abs(c.position.x - (1 + bandThickness / 2)) < 1e-6 &&
        Math.abs(c.position.y - 0.45) < 1e-6 &&
        Math.abs(c.position.z - z) < 1e-6,
    );
    expect(topBand).toBeTruthy();
    expect(bottomBand).toBeTruthy();
    expect(leftBand).toBeTruthy();
    expect(rightBand).toBeTruthy();
  });

  it('positions horizontal traverse by depth offset', () => {
    const offset = 100;
    const trWidth = 100;
    const depth = 0.5;
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      traverseEdgeBanding: {
        front: true,
        back: true,
        left: true,
        right: true,
      },
      topPanel: {
        type: 'frontTraverse',
        traverse: { orientation: 'horizontal', offset, width: trWidth },
      },
    });
    const boardThickness = 0.018;
    const bandThickness = 0.0008;
    const expectedWidth = 1 - 2 * boardThickness;
    const widthM = trWidth / 1000;
    const traverse = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - expectedWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - boardThickness) <
          1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - widthM) < 1e-6,
    ) as THREE.Mesh | undefined;
    expect(traverse).toBeTruthy();
    expect(traverse!.position.x).toBeCloseTo(0.5, 5);
    const expectedZ = -(offset / 1000 + widthM / 2);
    expect(traverse!.position.z).toBeCloseTo(expectedZ, 5);
    expect(traverse!.position.y).toBeCloseTo(0.9 - boardThickness / 2, 5);

    const frontBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - expectedWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - boardThickness) <
          1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - bandThickness) < 1e-6 &&
        Math.abs(c.position.z - (-offset / 1000 + bandThickness / 2)) < 1e-6,
    );
    const backBand = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - expectedWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - boardThickness) <
          1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - bandThickness) < 1e-6 &&
        Math.abs(
          c.position.z - (-offset / 1000 - widthM - bandThickness / 2),
        ) < 1e-6,
    );
    expect(frontBand).toBeTruthy();
    expect(backBand).toBeTruthy();
  });

  it('positions back horizontal traverse by depth offset', () => {
    const depth = 0.6;
    const offset = 80;
    const trWidth = 90;
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      rightSideEdgeBanding: {},
      leftSideEdgeBanding: {},
      topPanel: {
        type: 'backTraverse',
        traverse: { orientation: 'horizontal', offset, width: trWidth },
      },
    });
    const boardThickness = 0.018;
    const expectedWidth = 1 - 2 * boardThickness;
    const widthM = trWidth / 1000;
    const traverse = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - expectedWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - widthM) < 1e-6,
    ) as THREE.Mesh | undefined;
    expect(traverse).toBeTruthy();
    expect(traverse!.position.x).toBeCloseTo(0.5, 5);
    const expectedZ = -depth + offset / 1000 + widthM / 2;
    expect(traverse!.position.z).toBeCloseTo(expectedZ, 5);
  });

  it('creates two traverses for topPanel.twoTraverses', () => {
    const depth = 0.5;
    const trWidth = 80;
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      rightSideEdgeBanding: {},
      leftSideEdgeBanding: {},
      topPanel: {
        type: 'twoTraverses',
        front: { orientation: 'horizontal', offset: 20, width: trWidth },
        back: { orientation: 'horizontal', offset: 30, width: trWidth },
      },
    });
    const boardThickness = 0.018;
    const expectedWidth = 1 - 2 * boardThickness;
    const widthM = trWidth / 1000;
    const traverses = g.children.filter(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - expectedWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - boardThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - widthM) < 1e-6,
    ) as THREE.Mesh[];
    expect(traverses.length).toBe(2);
    const frontExpected = -(20 / 1000 + widthM / 2);
    const backExpected = -depth + 30 / 1000 + widthM / 2;
    expect(
      traverses.some((t) => Math.abs(t.position.z - frontExpected) < 1e-6),
    ).toBe(true);
    expect(
      traverses.some((t) => Math.abs(t.position.z - backExpected) < 1e-6),
    ).toBe(true);
    traverses.forEach((t) => expect(t.position.x).toBeCloseTo(0.5, 5));
  });

  it('omits bottom panel when bottomPanel is none', () => {
    const depth = 0.5;
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      topPanel: { type: 'none' },
      bottomPanel: 'none',
      rightSideEdgeBanding: {},
      leftSideEdgeBanding: {},
    });
    const boardThickness = 0.018;
    const bottomWidth = 1 - 2 * boardThickness;
    const bottom = g.children.find(
      (c) =>
        c instanceof THREE.Mesh &&
        Math.abs((c as any).geometry.parameters.width - bottomWidth) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.height - boardThickness) < 1e-6 &&
        Math.abs((c as any).geometry.parameters.depth - depth) < 1e-6 &&
        Math.abs(c.position.y - boardThickness / 2) < 1e-6,
    );
    expect(bottom).toBeUndefined();
  });

  it('adds edge outlines when showEdges is true', () => {
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 1,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      showEdges: true,
    });
    let edgesCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.LineSegments) edgesCount++;
    });
    expect(edgesCount).toBeGreaterThan(0);
  });

  it('bands each side panel edge once when all edge flags enabled', () => {
    const g = buildCabinetMesh({
      width: WIDTH,
      height: HEIGHT,
      depth: DEPTH,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      rightSideEdgeBanding: {
        front: true,
        back: true,
        left: true,
        right: true,
        top: true,
        bottom: true,
      },
      leftSideEdgeBanding: {
        front: true,
        back: true,
        left: true,
        right: true,
        top: true,
        bottom: true,
      },
    });
    const bands = g.children.filter(
      (c) =>
        c instanceof THREE.Mesh &&
        (c as any).material instanceof THREE.MeshStandardMaterial &&
        (c as any).material.color.getHex() === 0xffaa00,
    ) as THREE.Mesh[];
    const bandT = 0.0008;
    const frontBands = bands.filter(
      (b) =>
        Math.abs(b.position.z - bandT / 2) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.width ?? 0) - BOARD_THICKNESS) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.height ?? 0) - HEIGHT) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.depth ?? 0) - bandT) < 1e-6,
    );
    const backBands = bands.filter(
      (b) =>
        Math.abs(b.position.z - (-DEPTH - bandT / 2)) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.width ?? 0) - BOARD_THICKNESS) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.height ?? 0) - HEIGHT) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.depth ?? 0) - bandT) < 1e-6,
    );
    const topBands = bands.filter(
      (b) =>
        Math.abs(b.position.y - (HEIGHT + bandT / 2)) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.width ?? 0) - BOARD_THICKNESS) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.height ?? 0) - bandT) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.depth ?? 0) - DEPTH) < 1e-6,
    );
    const bottomBands = bands.filter(
      (b) =>
        Math.abs(b.position.y - -bandT / 2) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.width ?? 0) - BOARD_THICKNESS) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.height ?? 0) - bandT) < 1e-6 &&
        Math.abs(((b.geometry as any).parameters.depth ?? 0) - DEPTH) < 1e-6,
    );
    expect(frontBands.length).toBe(2);
    expect(backBands.length).toBe(2);
    expect(topBands.length).toBe(2);
    expect(bottomBands.length).toBe(2);
  });
});

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildCabinetMesh } from '../src/scene/cabinetBuilder';
import { FAMILY } from '../src/core/catalog';

const FRONT_OFFSET = 0.002;

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

  it('positions vertical traverse centered and by depth offset', () => {
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
    const expectedZ = FRONT_OFFSET - offset / 1000 - boardThickness / 2;
    expect(traverse!.position.z).toBeCloseTo(expectedZ, 5);
  });

  it('aligns front vertical traverse with cabinet front', () => {
    const trWidth = 100;
    const depth = 0.5;
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
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
    expect(traverse!.position.z + boardThickness / 2).toBeCloseTo(
      FRONT_OFFSET,
      5,
    );
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
      edgeBanding: 'full',
      topPanel: {
        type: 'frontTraverse',
        traverse: { orientation: 'horizontal', offset, width: trWidth },
      },
    });
    const boardThickness = 0.018;
    const bandThickness = 0.002;
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
      edgeBanding: 'none',
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
      edgeBanding: 'none',
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
      edgeBanding: 'none',
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
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';
import * as THREE from 'three';
import { usePlannerStore } from '../src/state/store';
import { createWallGeometry } from '../src/viewer/wall';

if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto as any;
}

describe('openings', () => {
  beforeEach(() => {
    usePlannerStore.setState({
      room: {
        walls: [{ id: 'w1', length: 2000, angle: 0, thickness: 100 }],
        openings: [],
        height: 2700,
        origin: { x: 0, y: 0 },
      },
    });
  });

  it('adds opening to store', () => {
    const { addOpening } = usePlannerStore.getState();
    addOpening({
      wallId: 'w1',
      offset: 100,
      width: 50,
      height: 50,
      bottom: 0,
      kind: 0,
    });
    expect(usePlannerStore.getState().room.openings).toHaveLength(1);
  });

  it('updates and removes opening', () => {
    const { addOpening, updateOpening, removeOpening } =
      usePlannerStore.getState();
    addOpening({
      wallId: 'w1',
      offset: 100,
      width: 50,
      height: 50,
      bottom: 0,
      kind: 0,
    });
    const id = usePlannerStore.getState().room.openings[0].id;
    updateOpening(id, { width: 60 });
    expect(usePlannerStore.getState().room.openings[0].width).toBe(60);
    removeOpening(id);
    expect(usePlannerStore.getState().room.openings).toHaveLength(0);
  });

  it('creates geometry with hole for opening', () => {
    const wall = { id: 'w1', length: 2000, angle: 0, thickness: 100 };
    const opening = {
      id: 'o1',
      wallId: 'w1',
      offset: 500,
      width: 800,
      height: 1000,
      bottom: 0,
      kind: 1,
    };
    const geom = createWallGeometry(wall.length, 2700, wall.thickness, [opening]);
    const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
    const len = wall.length / 1000;
    const h = 2700 / 1000;
    const t = wall.thickness / 1000;
    const holeX = (opening.offset / 1000 + opening.width / 1000 / 2) - len / 2;
    const holeY = (opening.bottom / 1000 + opening.height / 1000 / 2) - h / 2;
    const rc = new THREE.Raycaster(
      new THREE.Vector3(holeX, holeY, t),
      new THREE.Vector3(0, 0, -1),
    );
    expect(rc.intersectObject(mesh)).toHaveLength(0);
    const rc2 = new THREE.Raycaster(
      new THREE.Vector3(-len / 2 + 0.1, 0, t),
      new THREE.Vector3(0, 0, -1),
    );
    expect(rc2.intersectObject(mesh).length).toBeGreaterThan(0);
  });

  it('rejects opening with negative offset', () => {
    const { addOpening } = usePlannerStore.getState();
    expect(() =>
      addOpening({
        wallId: 'w1',
        offset: -10,
        width: 50,
        height: 50,
        bottom: 0,
        kind: 0,
      }),
    ).toThrow();
    expect(usePlannerStore.getState().room.openings).toHaveLength(0);
  });

  it('rejects opening exceeding wall length', () => {
    const { addOpening } = usePlannerStore.getState();
    expect(() =>
      addOpening({
        wallId: 'w1',
        offset: 1900,
        width: 200,
        height: 50,
        bottom: 0,
        kind: 0,
      }),
    ).toThrow();
    expect(usePlannerStore.getState().room.openings).toHaveLength(0);
  });

  it('rejects opening exceeding room height', () => {
    const { addOpening } = usePlannerStore.getState();
    expect(() =>
      addOpening({
        wallId: 'w1',
        offset: 100,
        width: 50,
        height: 2500,
        bottom: 300,
        kind: 0,
      }),
    ).toThrow();
    expect(usePlannerStore.getState().room.openings).toHaveLength(0);
  });

  it('rejects update that violates constraints', () => {
    const { addOpening, updateOpening } = usePlannerStore.getState();
    addOpening({
      wallId: 'w1',
      offset: 100,
      width: 50,
      height: 50,
      bottom: 0,
      kind: 0,
    });
    const id = usePlannerStore.getState().room.openings[0].id;
    expect(() => updateOpening(id, { offset: -5 })).toThrow();
    expect(usePlannerStore.getState().room.openings[0].offset).toBe(100);
  });
});

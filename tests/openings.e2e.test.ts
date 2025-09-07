// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { usePlannerStore } from '../src/state/store';
import { createWallGeometry } from '../src/viewer/wall';

describe('openings', () => {
  beforeEach(() => {
    usePlannerStore.setState({
      room: { walls: [], openings: [], height: 2700, origin: { x: 0, y: 0 } },
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

  it('creates geometry with hole for opening', () => {
    const wall = { id: 'w1', length: 2000, angle: 0, thickness: 100 };
    const opening = {
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
});

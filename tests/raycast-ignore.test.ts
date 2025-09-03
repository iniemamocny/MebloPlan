import { describe, it, expect } from 'vitest';
import * as THREE from 'three';

// A helper replicating the core of handlePointer logic for ignoring raycast objects
const selectFront = (group: THREE.Group, raycaster: THREE.Raycaster) => {
  const intersects = raycaster.intersectObjects(group.children, true);
  let obj: THREE.Object3D | null = null;
  for (const hit of intersects) {
    obj = hit.object;
    let ignore = false;
    while (obj) {
      if (obj.userData?.ignoreRaycast) {
        ignore = true;
        break;
      }
      if (obj.userData.frontIndex !== undefined) break;
      obj = obj.parent as THREE.Object3D | null;
    }
    if (ignore || !obj || obj.userData.frontIndex === undefined) {
      obj = null;
      continue;
    }
    break;
  }
  return obj?.userData.frontIndex;
};

describe('handlePointer raycast ignoring', () => {
  it('toggles front state despite edge band in front', () => {
    const group = new THREE.Group();
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 0.02),
      new THREE.MeshBasicMaterial(),
    );
    door.userData.frontIndex = 0;
    group.add(door);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 0.001),
      new THREE.MeshBasicMaterial(),
    );
    band.position.set(0, 0, 0.011);
    band.userData.ignoreRaycast = true;
    group.add(band);
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    );
    const frontIndex = selectFront(group, raycaster);
    const openStates = [false];
    if (frontIndex !== undefined && frontIndex >= 0) {
      openStates[frontIndex] = !openStates[frontIndex];
    }
    expect(openStates[0]).toBe(true);
  });
});

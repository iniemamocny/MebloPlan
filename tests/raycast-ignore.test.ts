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
    if (obj.userData.isHandle) {
      obj = obj.parent as THREE.Object3D | null;
      if (!obj || obj.userData.frontIndex === undefined) {
        obj = null;
      } else {
        obj = null;
      }
      break;
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

  it('does not toggle when clicking handle', () => {
    const group = new THREE.Group();
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 0.02),
      new THREE.MeshBasicMaterial(),
    );
    door.userData.frontIndex = 0;
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.02, 0.03),
      new THREE.MeshBasicMaterial(),
    );
    handle.position.set(1.2, 0.4, 0.02);
    handle.userData = { frontIndex: 0, isHandle: true };
    group.add(door);
    group.add(handle);
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(1.2, 0.4, 1),
      new THREE.Vector3(0, 0, -1),
    );
    const frontIndex = selectFront(group, raycaster);
    const openStates = [false];
    if (frontIndex !== undefined && frontIndex >= 0) {
      openStates[frontIndex] = !openStates[frontIndex];
    }
    expect(openStates[0]).toBe(false);
  });
});

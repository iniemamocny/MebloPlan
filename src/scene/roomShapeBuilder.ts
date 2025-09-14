import * as THREE from 'three';
import { RoomShape } from '../types';
import { plannerPointToWorld } from '../utils/planner';

/**
 * Convert a RoomShape into a Three.js mesh with walls extruded to the given
 * thickness and height. Coordinates are interpreted in metres.
 */
export function buildRoomShapeMesh(
  shape: RoomShape,
  opts: { thickness: number; height: number },
): THREE.Group {
  const group = new THREE.Group();
  const thickness = opts.thickness / 1000;
  const height = opts.height / 1000;
  const material = new THREE.MeshStandardMaterial({ color: 0xb0b0b0 });

  for (const seg of shape.segments) {
    const s = plannerPointToWorld(seg.start);
    const e = plannerPointToWorld(seg.end);
    const dx = e.x - s.x;
    const dz = e.z - s.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const geometry = new THREE.BoxGeometry(length, height, thickness);
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(s.x + dx / 2, height / 2, s.z + dz / 2);
    mesh.rotation.y = Math.atan2(dz, dx);
    group.add(mesh);
  }

  return group;
}

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

    // Compute a perpendicular unit vector (normal) for offsetting the wall to
    // one side of the drawn line so that the line represents the inner face of
    // the wall.
    const normal = new THREE.Vector3(-dz, 0, dx).normalize();
    const offset = opts.thickness / 2000; // half thickness in metres

    // Extend the wall length slightly so adjoining walls meet without gaps.
    const geometry = new THREE.BoxGeometry(length + thickness, height, thickness);
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(
      s.x + dx / 2 + normal.x * offset,
      height / 2,
      s.z + dz / 2 + normal.z * offset,
    );
    // Keep rotation based on segment direction
    mesh.rotation.y = Math.atan2(dz, dx);
    group.add(mesh);
  }

  return group;
}

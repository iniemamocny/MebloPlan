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

  // Determine polygon orientation to ensure wall thickness always extends
  // outward from the room shape. A positive signed area indicates a
  // counter-clockwise winding and a negative area indicates clockwise.
  let area = 0;
  if (shape.segments.length) {
    for (const seg of shape.segments) {
      area +=
        seg.start.x * seg.end.y - seg.end.x * seg.start.y;
    }
  } else if (shape.points.length) {
    for (let i = 0; i < shape.points.length; i++) {
      const p = shape.points[i];
      const q = shape.points[(i + 1) % shape.points.length];
      area += p.x * q.y - q.x * p.y;
    }
  }
  const clockwise = area < 0;

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
    if (clockwise) {
      normal.multiplyScalar(-1);
    }
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

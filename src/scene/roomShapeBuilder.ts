import * as THREE from 'three';
import { RoomShape } from '../types';
import { plannerPointToWorld } from '../utils/planner';

/**
 * Convert a RoomShape into a Three.js mesh with walls extruded to the given
 * thickness and height. Coordinates are interpreted in metres.
 *
 * `mode` controls how the provided segments are interpreted:
 * - `inside` (default): segments follow the inner face of the wall so meshes are
 *   offset outward by half the thickness and extended so the wall thickness lies
 *   outside the drawn line.
 * - `axis`: segments represent the wall's centre line; meshes are centred on the
 *   line without any offset or length extension.
 */
export function buildRoomShapeMesh(
  shape: RoomShape,
  opts: { thickness: number; height: number; mode?: 'axis' | 'inside' },
): THREE.Group {
  const group = new THREE.Group();
  const thickness = opts.thickness / 1000;
  const height = opts.height / 1000;
  const mode = opts.mode ?? 'inside';
  const material = new THREE.MeshStandardMaterial({ color: 0xb0b0b0 });

  // Convert all shape coordinates to world space before processing.
  const segments = shape.segments.map((seg) => ({
    start: plannerPointToWorld(seg.start),
    end: plannerPointToWorld(seg.end),
  }));
  const points = shape.points.map((pt) => plannerPointToWorld(pt));

  // Determine polygon orientation to ensure wall thickness always extends
  // outward from the room shape. Signed area is computed on the XZ plane
  // (planner Y maps to world Z with inverted direction).
  let area = 0;
  if (segments.length) {
    for (const seg of segments) {
      area += seg.start.x * seg.end.z - seg.end.x * seg.start.z;
    }
  } else if (points.length) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const q = points[(i + 1) % points.length];
      area += p.x * q.z - q.x * p.z;
    }
  }
  // With planner Y inverted when mapped to world Z, a positive area indicates
  // a clockwise winding.
  const clockwise = area > 0;

  for (const seg of segments) {
    const s = seg.start;
    const e = seg.end;
    const dx = e.x - s.x;
    const dz = e.z - s.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    // Compute a perpendicular unit vector (normal) for offsetting the wall to
    // one side of the drawn line when lines represent the inner face of the
    // wall.
    const normal = new THREE.Vector3(-dz, 0, dx).normalize();
    if (clockwise) {
      normal.multiplyScalar(-1);
    }

    const offset = thickness / 2; // half thickness in metres

    const geometry =
      mode === 'axis'
        ? new THREE.BoxGeometry(length, height, thickness)
        : new THREE.BoxGeometry(length + thickness, height, thickness);
    const mesh = new THREE.Mesh(geometry, material.clone());
    if (mode === 'axis') {
      mesh.position.set(s.x + dx / 2, height / 2, s.z + dz / 2);
    } else {
      mesh.position.set(
        s.x + dx / 2 + normal.x * offset,
        height / 2,
        s.z + dz / 2 + normal.z * offset,
      );
    }
    // Keep rotation based on segment direction
    mesh.rotation.y = Math.atan2(dz, dx);
    group.add(mesh);
  }

  return group;
}

import * as THREE from 'three';
import { RoomShape, ShapePoint, ShapeSegment } from '../types';
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

  // Build an ordered loop of points from the shape's segments to compute a
  // signed polygon area on the XZ plane. This ensures orientation is derived
  // from a consistent winding regardless of the input segment order.
  const key = (p: ShapePoint) => p.id ?? `${p.x},${p.y}`;
  const ordered: ShapePoint[] = [];
  if (shape.segments.length) {
    const conn = new Map<string, ShapeSegment[]>();
    for (const seg of shape.segments) {
      const a = key(seg.start);
      const b = key(seg.end);
      if (!conn.has(a)) conn.set(a, []);
      if (!conn.has(b)) conn.set(b, []);
      conn.get(a)!.push(seg);
      conn.get(b)!.push(seg);
    }
    const start = shape.segments[0].start;
    const startKey = key(start);
    ordered.push(start);
    const used = new Set<ShapeSegment>();
    let current = start;
    let currentKey = startKey;
    while (ordered.length <= shape.segments.length) {
      const segList = conn.get(currentKey) ?? [];
      const nextSeg = segList.find((s) => !used.has(s));
      if (!nextSeg) break;
      used.add(nextSeg);
      const next = key(nextSeg.start) === currentKey ? nextSeg.end : nextSeg.start;
      const nextKey = key(next);
      if (nextKey === startKey) break;
      ordered.push(next);
      current = next;
      currentKey = nextKey;
    }
  } else if (shape.points.length) {
    ordered.push(...shape.points);
  }

  const contour: THREE.Vector2[] = ordered.map((pt) => {
    const { x, z } = plannerPointToWorld(pt);
    return new THREE.Vector2(x, z);
  });
  const area = contour.length >= 3 ? THREE.ShapeUtils.area(contour) : 0;
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

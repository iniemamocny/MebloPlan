import * as THREE from 'three';
import { RoomShape } from '../types';
import { alignToGround, plannerToWorld } from '../utils/coordinateSystem';

/**
 * Convert a RoomShape into a Three.js LineSegments mesh.
 * Each segment is represented by a line on the XZ plane
 * (planner X/Y mapped to world X/Z).
 */
export function buildRoomShapeMesh(shape: RoomShape): THREE.LineSegments {
  const verts: number[] = [];
  for (const seg of shape.segments) {
    // Convert planner coordinates to world space to avoid axis inversion
    const sx = plannerToWorld(seg.start.x, 'x');
    const sz = plannerToWorld(seg.start.y, 'y');
    const ex = plannerToWorld(seg.end.x, 'x');
    const ez = plannerToWorld(seg.end.y, 'y');

    // Build geometry in the XY plane; alignToGround will map it onto XZ
    verts.push(sx, -sz, 0, ex, -ez, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x333333 });
  const lines = new THREE.LineSegments(geometry, material);
  alignToGround(lines);
  return lines;
}

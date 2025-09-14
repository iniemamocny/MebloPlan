import * as THREE from 'three';
import { RoomShape } from '../types';
import { alignToGround } from '../utils/coordinateSystem';

/**
 * Convert a RoomShape into a Three.js LineSegments mesh.
 * Each segment is represented by a line on the XZ plane
 * (planner X/Y mapped to world X/Z).
 */
export function buildRoomShapeMesh(shape: RoomShape): THREE.LineSegments {
  const verts: number[] = [];
  for (const seg of shape.segments) {
    verts.push(seg.start.x, seg.start.y, 0, seg.end.x, seg.end.y, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x333333 });
  const lines = new THREE.LineSegments(geometry, material);
  alignToGround(lines);
  return lines;
}

import * as THREE from 'three';
import type { ShapePoint } from '../types';
import { plannerToWorld, worldToPlanner } from './coordinateSystem';

/**
 * Helper utilities for converting between planner 2D coordinates and the 3D
 * world space used by the viewer.
 *
 * Planner axes map to world axes as follows:
 * - planner **X** → world **X**
 * - planner **Y** → world **Z** (planner Y grows downward)
 *
 * The functions below operate on whole points to avoid repetitive axis swaps
 * throughout the codebase.
 */

export interface WorldPoint {
  x: number;
  z: number;
}

/** Convert a planner point (x, y) to world coordinates (x, z). */
export function plannerPointToWorld(pt: ShapePoint): WorldPoint {
  return {
    x: plannerToWorld(pt.x, 'x'),
    z: plannerToWorld(pt.y, 'y'),
  };
}

/** Convert world coordinates (x, z) to a planner point (x, y). */
export function worldPointToPlanner(pt: WorldPoint): ShapePoint {
  return {
    x: worldToPlanner(pt.x, 'x'),
    y: worldToPlanner(pt.z, 'z'),
  };
}

/** Convert a planner point directly to a THREE.Vector3 lying on the ground plane. */
export function plannerPointToVector3(pt: ShapePoint): THREE.Vector3 {
  const { x, z } = plannerPointToWorld(pt);
  return new THREE.Vector3(x, 0, z);
}

/** Convert a THREE.Vector3 on the ground plane to a planner point. */
export function vector3ToPlannerPoint(vec: THREE.Vector3): ShapePoint {
  return worldPointToPlanner({ x: vec.x, z: vec.z });
}


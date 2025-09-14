import type { ShapePoint } from '../types';
import { plannerPointToWorld, type WorldPoint } from '../utils/planner';

/**
 * Prototype helpers for the upcoming 2D planner rewrite.
 * For now it only exposes point projection using existing utilities.
 */
export function projectPlannerPoint(pt: ShapePoint): WorldPoint {
  return plannerPointToWorld(pt);
}

import type { RoomShape, ShapePoint, ShapeSegment, Wall } from '../types';
import uuid from './uuid';

const EPSILON = 1e-6;

const pointsEqual = (pt: ShapePoint, p: ShapePoint, eps = EPSILON) =>
  Math.abs(pt.x - p.x) < eps && Math.abs(pt.y - p.y) < eps;

/**
 * Adds a segment to the given room shape, ensuring start/end points are unique.
 * If a point with the same coordinates already exists, it's reused instead of creating a duplicate.
 */
export const addSegmentToShape = (
  shape: RoomShape,
  segment: ShapeSegment,
): RoomShape => {
  const findPoint = (p: ShapePoint) =>
    shape.points.find((pt) => pointsEqual(pt, p));

  const points: ShapePoint[] = [...shape.points];

  let startPoint = findPoint(segment.start);
  if (!startPoint) {
    startPoint = { ...segment.start, id: uuid() };
    points.push(startPoint);
  }

  let endPoint = findPoint(segment.end);
  if (!endPoint) {
    endPoint = { ...segment.end, id: uuid() };
    points.push(endPoint);
  }

  return {
    points,
    segments: [...shape.segments, { start: startPoint, end: endPoint }],
  };
};

/** Removes a segment and any orphaned points from a room shape. */
export const removeSegmentFromShape = (
  shape: RoomShape,
  seg: ShapeSegment,
): RoomShape => {
  const segments = shape.segments.filter((s) => s !== seg);
  const used = new Set<string>();
  segments.forEach((s) => {
    used.add(s.start.id);
    used.add(s.end.id);
  });
  const points = shape.points.filter((p) => used.has(p.id));
  return { points, segments };
};

export default addSegmentToShape;

/** Converts a room shape to an array of walls. */
export const shapeToWalls = (
  shape: RoomShape,
  opts?: { height?: number; thickness?: number },
): Wall[] => {
  const { height = 2.7, thickness = 0.1 } = opts || {};
  return shape.segments.map((seg) => ({
    id: uuid(),
    start: { x: seg.start.x, y: seg.start.y },
    end: { x: seg.end.x, y: seg.end.y },
    height,
    thickness,
  }));
};

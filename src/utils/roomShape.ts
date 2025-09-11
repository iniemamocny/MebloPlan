import type { RoomShape, ShapePoint, ShapeSegment } from '../types';
import uuid from './uuid';

export const EPSILON = 1e-6;

export const pointsEqual = (pt: ShapePoint, p: ShapePoint, eps = EPSILON) =>
  Math.abs(pt.x - p.x) < eps && Math.abs(pt.y - p.y) < eps;

interface SegmentLike {
  start: ShapePoint;
  end: ShapePoint;
}

const orientation = (a: ShapePoint, b: ShapePoint, c: ShapePoint) => {
  const val = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (Math.abs(val) < EPSILON) return 0;
  return val > 0 ? 1 : -1;
};

const onSegment = (a: ShapePoint, b: ShapePoint, c: ShapePoint) =>
  b.x <= Math.max(a.x, c.x) + EPSILON &&
  b.x + EPSILON >= Math.min(a.x, c.x) &&
  b.y <= Math.max(a.y, c.y) + EPSILON &&
  b.y + EPSILON >= Math.min(a.y, c.y);

const segmentsIntersect = (s1: SegmentLike, s2: SegmentLike) => {
  const { start: p1, end: q1 } = s1;
  const { start: p2, end: q2 } = s2;

  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4)
    return true;

  if (
    o1 === 0 &&
    onSegment(p1, p2, q1) &&
    !pointsEqual(p2, p1) &&
    !pointsEqual(p2, q1)
  )
    return true;
  if (
    o2 === 0 &&
    onSegment(p1, q2, q1) &&
    !pointsEqual(q2, p1) &&
    !pointsEqual(q2, q1)
  )
    return true;
  if (
    o3 === 0 &&
    onSegment(p2, p1, q2) &&
    !pointsEqual(p1, p2) &&
    !pointsEqual(p1, q2)
  )
    return true;
  if (
    o4 === 0 &&
    onSegment(p2, q1, q2) &&
    !pointsEqual(q1, p2) &&
    !pointsEqual(q1, q2)
  )
    return true;

  return false;
};

/**
 * Adds a segment to the given room shape, ensuring start/end points are unique.
 * If a point with the same coordinates already exists, it's reused instead of creating a duplicate.
 */
export const addSegmentToShape = (
  shape: RoomShape,
  segment: ShapeSegment,
): RoomShape => {
  if (shape.segments.some((s) => segmentsIntersect(s, segment))) {
    return shape;
  }

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

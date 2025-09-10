import type { RoomShape, ShapePoint, ShapeSegment } from '../types';
import uuid from './uuid';

/**
 * Adds a segment to the given room shape, ensuring start/end points are unique.
 * If a point with the same coordinates already exists, it's reused instead of creating a duplicate.
 */
export const addSegmentToShape = (
  shape: RoomShape,
  segment: ShapeSegment,
): RoomShape => {
  const findPoint = (p: ShapePoint) =>
    shape.points.find((pt) => pt.x === p.x && pt.y === p.y);

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

export default addSegmentToShape;

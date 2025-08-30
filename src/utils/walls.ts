import { usePlannerStore } from '../state/store';

export type Segment = {
  a: { x: number; y: number };
  b: { x: number; y: number };
  angle: number;
  length: number;
};
export function getWallSegments(): Segment[] {
  const { room } = usePlannerStore.getState();
  const segs: Segment[] = [];
  let cursor = { x: 0, y: 0 };
  for (const w of room.walls) {
    const ang = ((w.angle || 0) * Math.PI) / 180;
    const dir = { x: Math.cos(ang), y: Math.sin(ang) };
    const len = w.length || 0;
    const next = { x: cursor.x + dir.x * len, y: cursor.y + dir.y * len };
    segs.push({ a: { ...cursor }, b: { ...next }, angle: ang, length: len });
    cursor = next;
  }
  return segs;
}
export function projectPointToSegment(px: number, py: number, seg: Segment) {
  const ax = seg.a.x;
  const ay = seg.a.y;
  const bx = seg.b.x;
  const by = seg.b.y;
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby || 1;
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const x = ax + abx * t;
  const y = ay + aby * t;
  const dx = px - x;
  const dy = py - y;
  const dist = Math.hypot(dx, dy);
  return { x, y, t, dist };
}

import { usePlannerStore } from '../state/store'
export type Segment = {
  a:{x:number;y:number};
  b:{x:number;y:number};
  angle:number;
  length:number;
  arc?:{ cx:number; cy:number; radius:number; startAngle:number; sweep:number };
}
export function getWallSegments(startX?: number, startY?: number, close = false): Segment[] {
  const room = usePlannerStore.getState().room
  const segs: Segment[] = []
  const origin = room.origin || { x:0, y:0 }
  let cursor = { x:startX ?? origin.x, y:startY ?? origin.y }
  const start = { ...cursor }
  for (const w of room.walls){
    if (w.arc){
      const ang0 = (w.angle||0) * Math.PI/180
      const sweep = (w.arc.angle||0) * Math.PI/180
      const r = w.arc.radius || 0
      const sign = sweep >= 0 ? 1 : -1
      const cx = cursor.x - Math.sin(ang0) * r * sign
      const cy = cursor.y + Math.cos(ang0) * r * sign
      const startAng = Math.atan2(cursor.y - cy, cursor.x - cx)
      const endAng = startAng + sweep
      const next = { x: cx + Math.cos(endAng)*r, y: cy + Math.sin(endAng)*r }
      segs.push({
        a:{...cursor},
        b:{...next},
        angle:ang0,
        length:Math.abs(r*sweep),
        arc:{ cx, cy, radius:r, startAngle:startAng, sweep }
      })
      cursor = next
    } else {
      const ang = (w.angle||0) * Math.PI/180
      const dir = { x: Math.cos(ang), y: Math.sin(ang) }
      const len = (w.length||0)
      const next = { x: cursor.x + dir.x*len, y: cursor.y + dir.y*len }
      segs.push({ a:{...cursor}, b:{...next}, angle:ang, length:len })
      cursor = next
    }
  }
  if (close && segs.length > 0){
    const last = segs[segs.length - 1].b
    if (Math.abs(last.x - start.x) > 1e-3 || Math.abs(last.y - start.y) > 1e-3){
      const dx = start.x - last.x, dy = start.y - last.y
      const len = Math.hypot(dx, dy)
      const ang = Math.atan2(dy, dx)
      segs.push({ a:{...last}, b:{...start}, angle:ang, length:len })
    }
  }
  return segs
}
export function projectPointToSegment(px:number, py:number, seg:Segment){
  const ax=seg.a.x, ay=seg.a.y, bx=seg.b.x, by=seg.b.y
  const abx=bx-ax, aby=by-ay
  const apx=px-ax, apy=py-ay
  const ab2=abx*abx+aby*aby || 1
  let t=(apx*abx+apy*aby)/ab2
  t=Math.max(0,Math.min(1,t))
  const x=ax+abx*t, y=ay+aby*t
  const dx=px-x, dy=py-y
  const dist=Math.hypot(dx,dy)
  return { x,y,t,dist }
}

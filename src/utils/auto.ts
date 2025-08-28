import { Segment } from './walls'
export function autoWidthsForRun(lengthMM:number, prefs:number[] = [600,800,400,500,300]){
  const result:number[] = []
  let remaining = Math.max(0, Math.floor(lengthMM))
  while (remaining >= 260){
    const pick = prefs.find(p=>p<=remaining) || remaining
    const width = (remaining - pick < 260 && remaining > 260) ? remaining : pick
    result.push(width)
    remaining -= width
    if (remaining < 260 && remaining>0){
      result.push(remaining)
      remaining = 0
    }
  }
  return result
}
export function placeAlongWall(widths:number[], seg:Segment, gapMM=5){
  const placed:{ center:[number,number]; rot:number }[] = []
  let cursor = 0
  const dir = { x:(seg.b.x-seg.a.x)/seg.length, y:(seg.b.y-seg.a.y)/seg.length }
  for (const w of widths){
    const centerMM = cursor + w/2
    const cx = seg.a.x + dir.x*centerMM
    const cy = seg.a.y + dir.y*centerMM
    placed.push({ center:[cx, cy], rot: -seg.angle })
    cursor += w + gapMM
  }
  return placed
}

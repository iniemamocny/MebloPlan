import { describe, it, expect } from 'vitest'
import { autoWidthsForRun, placeAlongWall } from '../src/utils/auto'
import type { Segment } from '../src/utils/walls'

describe('autoWidthsForRun', () => {
  it('splits 2400mm run into standard widths', () => {
    const widths = autoWidthsForRun(2400)
    expect(widths).toEqual([600, 600, 600, 600])
  })

  it('widen final unit when leftover would be too small', () => {
    const widths = autoWidthsForRun(2500)
    expect(widths).toEqual([600, 600, 600, 700])
  })
})

describe('placeAlongWall', () => {
  it('positions modules along a wall segment with correct rotation', () => {
    const seg: Segment = {
      a: { x: 10, y: 20 },
      b: { x: 10 + Math.cos(Math.PI / 4) * 3000, y: 20 + Math.sin(Math.PI / 4) * 3000 },
      angle: Math.PI / 4,
      length: 3000,
    }
    const widths = [600, 600]
    const placed = placeAlongWall(widths, seg, 5)
    const dirX = Math.cos(Math.PI / 4)
    const dirY = Math.sin(Math.PI / 4)
    const expected1 = [seg.a.x + dirX * 300, seg.a.y + dirY * 300]
    const expected2 = [seg.a.x + dirX * 905, seg.a.y + dirY * 905]
    expect(placed[0].center[0]).toBeCloseTo(expected1[0], 3)
    expect(placed[0].center[1]).toBeCloseTo(expected1[1], 3)
    expect(placed[1].center[0]).toBeCloseTo(expected2[0], 3)
    expect(placed[1].center[1]).toBeCloseTo(expected2[1], 3)
    expect(placed[0].rot).toBeCloseTo(-Math.PI / 4)
    expect(placed[1].rot).toBeCloseTo(-Math.PI / 4)
  })
})

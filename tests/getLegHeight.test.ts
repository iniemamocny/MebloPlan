import { describe, it, expect } from 'vitest'
import { getLegHeight } from '../src/ui/SceneViewer'
import { FAMILY } from '../src/core/catalog'
import type { Module3D, Globals } from '../src/types'

describe('getLegHeight', () => {
  it('uses legsHeight from globals for base modules', () => {
    const mod: Module3D = {
      id: '1',
      label: 'test',
      family: FAMILY.BASE,
      kind: 'x',
      size: { w: 1, h: 1, d: 1 },
      position: [0, 0, 0]
    }
    const globals: Globals = {
      [FAMILY.BASE]: {
        height: 800,
        depth: 600,
        boardType: '',
        frontType: '',
        gaps: { left:0, right:0, top:0, bottom:0, between:0 },
        legsType: 'Standard 12cm',
        legsHeight: 120
      },
      [FAMILY.WALL]: { height:0, depth:0, boardType:'', frontType:'', gaps:{ left:0, right:0, top:0, bottom:0, between:0 } },
      [FAMILY.PAWLACZ]: { height:0, depth:0, boardType:'', frontType:'', gaps:{ left:0, right:0, top:0, bottom:0, between:0 } },
      [FAMILY.TALL]: { height:0, depth:0, boardType:'', frontType:'', gaps:{ left:0, right:0, top:0, bottom:0, between:0 } }
    }
    expect(getLegHeight(mod, globals)).toBe(0.12)
  })

  it('returns 0 for non-base modules', () => {
    const mod: Module3D = {
      id: '2',
      label: 'test',
      family: FAMILY.WALL,
      kind: 'x',
      size: { w: 1, h: 1, d: 1 },
      position: [0, 0, 0]
    }
    const globals: Globals = {
      [FAMILY.BASE]: {
        height: 800,
        depth: 600,
        boardType: '',
        frontType: '',
        gaps: { left:0, right:0, top:0, bottom:0, between:0 },
        legsType: 'Standard 10cm',
        legsHeight: 100
      },
      [FAMILY.WALL]: { height:0, depth:0, boardType:'', frontType:'', gaps:{ left:0, right:0, top:0, bottom:0, between:0 } },
      [FAMILY.PAWLACZ]: { height:0, depth:0, boardType:'', frontType:'', gaps:{ left:0, right:0, top:0, bottom:0, between:0 } },
      [FAMILY.TALL]: { height:0, depth:0, boardType:'', frontType:'', gaps:{ left:0, right:0, top:0, bottom:0, between:0 } }
    }
    expect(getLegHeight(mod, globals)).toBe(0)
  })
})

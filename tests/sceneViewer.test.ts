import { describe, it, expect } from 'vitest'
import { getLegHeight } from '../src/ui/SceneViewer'
import { FAMILY } from '../src/core/catalog'
import { Module3D, Globals } from '../src/types'
import { defaultGlobal } from '../src/state/store'

describe('getLegHeight', () => {
  it('converts legsHeight from mm to meters for base cabinets', () => {
    const mod = { family: FAMILY.BASE } as Module3D
    const globals: Globals = {
      ...defaultGlobal,
      [FAMILY.BASE]: { ...defaultGlobal[FAMILY.BASE], legsHeight: 150 }
    }
    expect(getLegHeight(mod, globals)).toBe(0.15)
  })

  it('defaults to 0.1m when legsHeight is not specified', () => {
    const mod = { family: FAMILY.BASE } as Module3D
    const globals: Globals = {
      ...defaultGlobal,
      [FAMILY.BASE]: { ...defaultGlobal[FAMILY.BASE], legsHeight: undefined as any }
    }
    expect(getLegHeight(mod, globals)).toBe(0.1)
  })
})

import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { buildCabinetMesh } from '../src/scene/cabinetBuilder'
import { FAMILY } from '../src/core/catalog'

const FRONT_OFFSET = 0.002

describe('buildCabinetMesh', () => {
  it('returns group with expected children for drawers', () => {
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 2,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
    })
    expect(g).toBeInstanceOf(THREE.Group)
    expect(g.children.length).toBe(7)
  })

  it('returns group with expected children for doors', () => {
    const g = buildCabinetMesh({
      width: 1,
      height: 0.9,
      depth: 0.5,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
    })
    expect(g.children.length).toBe(7)
  })

  it('matches provided dimensions', () => {
    const width = 0.8
    const height = 0.7
    const depth = 0.6
    const g = buildCabinetMesh({
      width,
      height,
      depth,
      drawers: 0,
      gaps: { top: 0, bottom: 0 },
      family: FAMILY.BASE,
      showHandles: false,
    })
    g.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(g)
    const size = box.getSize(new THREE.Vector3())
    expect(size.x).toBeCloseTo(width, 5)
    expect(size.y).toBeCloseTo(height, 5)
    const boardThickness = 0.018
    expect(size.z).toBeCloseTo(depth + boardThickness + FRONT_OFFSET, 5)
  })
})

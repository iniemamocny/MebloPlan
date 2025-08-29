import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { buildSinkCabinet } from '../src/core/builders'

describe('buildSinkCabinet', () => {
  it('creates hole for sink and sets userData', () => {
    const width = 600
    const height = 720
    const depth = 500
    const g = buildSinkCabinet({ width, height, depth })
    expect(g.userData.type).toBe('sink')
    expect(g.userData.hasSinkCutout).toBe(true)

    // Raycast straight down through the centre of the top – should miss due to cut-out
    const mesh = g.children[0] as THREE.Mesh
    const ray = new THREE.Raycaster(
      new THREE.Vector3(width / 2000, height / 1000 + 0.1, -depth / 2000),
      new THREE.Vector3(0, -1, 0)
    )
    const hits = ray.intersectObject(mesh)
    expect(hits.length).toBe(0)
  })
})

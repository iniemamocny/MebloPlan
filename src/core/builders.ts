import * as THREE from 'three'
import { ModuleAdv } from '../types'

export interface BuilderOpts {
  width: number // in millimetres
  height: number // in millimetres
  depth: number // in millimetres
  adv?: ModuleAdv
  hardware?: Record<string, number>
}

/**
 * Build a very simple rectangular cabinet carcass.  This helper is used by
 * specialised cabinet builders and keeps geometry creation in one place.
 */
export function buildBasicCabinet({ width, height, depth }: BuilderOpts): THREE.Group {
  const group = new THREE.Group()
  const geo = new THREE.BoxGeometry(width / 1000, height / 1000, depth / 1000)
  const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(width / 2000, height / 2000, -depth / 2000)
  group.add(mesh)
  return group
}

/**
 * Corner cabinet – currently just a basic box but tagged for future
 * enhancements like angled fronts.
 */
export function buildCornerCabinet(opts: BuilderOpts): THREE.Group {
  const g = buildBasicCabinet(opts)
  g.userData.type = 'corner'
  return g
}

/**
 * Sink cabinet – builds a basic box with a rectangular cut‑out in the worktop
 * where a sink would be mounted.
 */
export function buildSinkCabinet({ width, height, depth }: BuilderOpts): THREE.Group {
  const group = new THREE.Group()

  // Dimensions converted to metres for Three.js
  const W = width / 1000
  const H = height / 1000
  const D = depth / 1000

  // Create a rectangular shape with an inner hole representing the sink cut‑out
  const outer = new THREE.Shape()
  outer.moveTo(0, 0)
  outer.lineTo(W, 0)
  outer.lineTo(W, D)
  outer.lineTo(0, D)
  outer.lineTo(0, 0)

  // Simple centered hole – half the cabinet width and 40% of its depth
  const hole = new THREE.Path()
  const sinkW = W * 0.5
  const sinkD = D * 0.4
  const hx1 = (W - sinkW) / 2
  const hx2 = hx1 + sinkW
  const hz1 = (D - sinkD) / 2
  const hz2 = hz1 + sinkD
  hole.moveTo(hx1, hz1)
  hole.lineTo(hx2, hz1)
  hole.lineTo(hx2, hz2)
  hole.lineTo(hx1, hz2)
  hole.lineTo(hx1, hz1)
  outer.holes.push(hole)

  // Extrude the shape to create the cabinet volume
  const geo = new THREE.ExtrudeGeometry(outer, { depth: H, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2) // align so height is along +Y and depth along -Z

  const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc })
  const mesh = new THREE.Mesh(geo, mat)
  group.add(mesh)

  // Tag so the UI knows this is a sink cabinet
  group.userData.type = 'sink'
  group.userData.hasSinkCutout = true

  return group
}

/**
 * Cargo cabinet – typically tall and narrow with baskets.  For now it shares
 * the basic box geometry.
 */
export function buildCargoCabinet(opts: BuilderOpts): THREE.Group {
  const g = buildBasicCabinet(opts)
  g.userData.type = 'cargo'
  return g
}

/**
 * Appliance cabinet – used for oven stacks or built‑in fridges.  Geometry is a
 * simple box; specific appliance cut‑outs can be added later.
 */
export function buildApplianceCabinet(opts: BuilderOpts): THREE.Group {
  const g = buildBasicCabinet(opts)
  g.userData.type = 'appliance'
  return g
}

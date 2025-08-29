import * as THREE from 'three'

export interface BuilderOpts {
  width: number // in millimetres
  height: number // in millimetres
  depth: number // in millimetres
  adv?: any
  hardware?: any
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
 * Sink cabinet – placeholder implementation without cutouts.  Keeping the
 * builder separate allows UI and hardware options to reference this type.
 */
export function buildSinkCabinet(opts: BuilderOpts): THREE.Group {
  const g = buildBasicCabinet(opts)
  g.userData.type = 'sink'
  return g
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

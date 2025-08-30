import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { setupThree } from '../scene/engine'
import { buildCabinetMesh } from '../scene/cabinetBuilder'
import { FAMILY } from '../core/catalog'
import { usePlannerStore } from '../state/store'
import { Module3D, ModuleAdv, Globals } from '../types'

interface ThreeContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  group: THREE.Group
}

interface Props {
  threeRef: React.MutableRefObject<ThreeContext | null>
  addCountertop: boolean
}

export const getLegHeight = (mod: Module3D, globals: Globals): number => {
  if (mod.family !== FAMILY.BASE) return 0
  const famGlobal = globals[mod.family]
  const h = famGlobal?.legsHeight
  if (typeof h === 'number') return h / 1000
  return 0.1
}

const SceneViewer: React.FC<Props> = ({ threeRef, addCountertop }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const store = usePlannerStore()

  useEffect(() => {
    if (!containerRef.current) return
    threeRef.current = setupThree(containerRef.current)
  }, [threeRef])

  const createCabinetMesh = (mod: Module3D) => {
    const W = mod.size.w
    const H = mod.size.h
    const D = mod.size.d
    const adv: ModuleAdv = mod.adv ?? {}
    const legHeight = getLegHeight(mod, store.globals)
    const drawers = Array.isArray(adv.drawerFronts) ? adv.drawerFronts.length : 0
    const hinge = (adv as any).hinge as 'left' | 'right' | undefined
    const group = buildCabinetMesh({
      width: W,
      height: H,
      depth: D,
      drawers,
      gaps: adv.gaps || { top: 0, bottom: 0 },
      drawerFronts: adv.drawerFronts,
      family: mod.family,
      shelves: adv.shelves,
      backPanel: adv.backPanel,
      legHeight,
      showHandles: true,
      hinge
    })
    group.userData.kind = 'cab'
    const fg = group.userData.frontGroups || []
    group.userData.openStates = mod.openStates?.slice(0, fg.length) || new Array(fg.length).fill(false)
    group.userData.openProgress = new Array(fg.length).fill(0)
    group.userData.animSpeed = (adv as any).animationSpeed ?? 0.15
    return group
  }

  const drawScene = () => {
    const group = threeRef.current?.group
    if (!group) return
    ;[...group.children].forEach((c) => {
      if (c.userData?.kind === 'cab' || c.userData?.kind === 'top') {
        group.remove(c)
        c.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
            else obj.material.dispose()
          }
        })
      }
    })
    store.modules.forEach((m: Module3D) => {
      const cabMesh = createCabinetMesh(m)
      const legHeight = getLegHeight(m, store.globals)
      const baseY = m.family === FAMILY.BASE ? 0 : m.position[1]
      cabMesh.position.set(m.position[0], baseY, m.position[2])
      cabMesh.rotation.y = m.rotationY || 0
      group.add(cabMesh)
      if (addCountertop && m.family === FAMILY.BASE) {
        const topThickness = 0.04
        const top = new THREE.Mesh(
          new THREE.BoxGeometry(m.size.w, topThickness, m.size.d),
          new THREE.MeshStandardMaterial({ color: 0xbfa06a })
        )
        const topY = baseY + legHeight + m.size.h + topThickness / 2
        top.position.set(m.position[0], topY, m.position[2])
        top.rotation.y = m.rotationY || 0
        top.userData.kind = 'top'
        group.add(top)
      }
    })
  }
  useEffect(drawScene, [store.modules, addCountertop])

  useEffect(() => {
    const three = threeRef.current
    if (!three || !three.renderer || !three.camera || !three.group) return
    const renderer = three.renderer as THREE.WebGLRenderer
    const camera = three.camera as THREE.PerspectiveCamera
    const group = three.group as THREE.Group
    const raycaster = new THREE.Raycaster()
    const handlePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      )
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(group.children, true)
      if (intersects.length === 0) return
      let obj: THREE.Object3D | null = intersects[0].object
      while (obj && !obj.userData?.type) {
        obj = obj.parent
      }
      if (!obj || !obj.userData) return
      const { frontIndex } = obj.userData as { frontIndex?: number }
      if (frontIndex === undefined) return
      let cab: THREE.Object3D | null = obj
      while (cab && cab.userData?.kind !== 'cab') {
        cab = cab.parent
      }
      if (!cab || !cab.userData) return
      const openStates: boolean[] = cab.userData.openStates || []
      if (frontIndex >= 0 && frontIndex < openStates.length) {
        openStates[frontIndex] = !openStates[frontIndex]
        cab.userData.openStates = openStates
      }
    }
    renderer.domElement.addEventListener('pointerdown', handlePointer)
    return () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointer)
    }
  }, [store.modules])

  useEffect(() => {
    let animId: number
    const animate = () => {
      const three = threeRef.current
      if (three && three.group) {
        const group = three.group as THREE.Group
        group.children.forEach((cab) => {
          if (cab.userData?.kind === 'cab') {
            const openStates: boolean[] = cab.userData.openStates || []
            const openProgress: number[] = cab.userData.openProgress || []
            const frontGroups: THREE.Object3D[] = cab.userData.frontGroups || []
            openStates.forEach((target, idx) => {
              let prog = openProgress[idx] ?? 0
              const dest = target ? 1 : 0
              const diff = dest - prog
              if (Math.abs(diff) > 0.001) {
                const speed = cab.userData.animSpeed || 0.15
                prog += diff * speed
                if (Math.abs(dest - prog) < 0.02) prog = dest
                openProgress[idx] = prog
                const fg = frontGroups[idx]
                if (fg) {
                  if (fg.userData.type === 'door') {
                    const hingeSide = fg.userData.hingeSide || 'left'
                    const sign = hingeSide === 'left' ? -1 : 1
                    fg.rotation.y = (sign * Math.PI) / 2 * prog
                  } else if (fg.userData.type === 'drawer') {
                    const slide = fg.userData.slideDist || 0.45
                    fg.position.z = (fg.userData.closedZ ?? 0) - slide * prog
                  }
                }
              }
            })
          }
        })
      }
      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(animId)
    }
  }, [])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}

export default SceneViewer

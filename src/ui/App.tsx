import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { setupThree } from '../scene/engine'
import { FAMILY, FAMILY_LABELS, Kind, Variant, KIND_SETS } from '../core/catalog'
import { usePlannerStore } from '../state/store'
import GlobalSettings from './panels/GlobalSettings'
import RoomTab from './panels/RoomTab'
import CostsTab from './panels/CostsTab'
import TypePicker, { KindTabs, VariantList } from './panels/CatalogPicker'
import { computeModuleCost } from '../core/pricing'
import { getWallSegments, projectPointToSegment } from '../utils/walls'
import { autoWidthsForRun, placeAlongWall } from '../utils/auto'
import CutlistTab from './panels/CutlistTab'
import BoxPreview from './components/BoxPreview'
import TechDrawing from './components/TechDrawing'
import Cabinet3D from './components/Cabinet3D'
import SingleMMInput from './components/SingleMMInput'

export default function App(){
  const [boardL, setBoardL] = useState<number>(()=>{ try{ return Number(localStorage.getItem('boardL')||2800) }catch{ return 2800 } })
  // Default board width changed from 2100 mm to 2070 mm to reflect updated sheet dimensions
  const [boardW, setBoardW] = useState<number>(()=>{ try{ return Number(localStorage.getItem('boardW')||2070) }catch{ return 2070 } })
  const [boardKerf, setBoardKerf] = useState<number>(()=>{ try{ return Number(localStorage.getItem('boardKerf')||3) }catch{ return 3 } })
  const [boardHasGrain, setBoardHasGrain] = useState<boolean>(()=>{ try{ return (localStorage.getItem('boardHasGrain')||'1')==='1' }catch{ return true } })

  useEffect(()=>{ try{ localStorage.setItem('boardL', String(boardL)) }catch{} }, [boardL])
  useEffect(()=>{ try{ localStorage.setItem('boardW', String(boardW)) }catch{} }, [boardW])
  useEffect(()=>{ try{ localStorage.setItem('boardKerf', String(boardKerf)) }catch{} }, [boardKerf])
  useEffect(()=>{ try{ localStorage.setItem('boardHasGrain', boardHasGrain?'1':'0') }catch{} }, [boardHasGrain])

  const store = usePlannerStore()
  const [tab, setTab] = useState<'cab'|'room'|'costs'|'cut'>('cab')
  const [family, setFamily] = useState<FAMILY>(FAMILY.BASE)
  const [kind, setKind] = useState<Kind|null>(null)
  const [variant, setVariant] = useState<Variant|null>(null)
  const [selWall, setSelWall] = useState(0)
  const [addCountertop, setAddCountertop] = useState(true)
  const [cfgTab, setCfgTab] = useState<'basic'|'adv'>('basic')
  const [widthMM, setWidthMM] = useState(600)
  const [adv, setAdv] = useState<any>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const threeRef = useRef<any>({})

  useEffect(()=>{ if(!containerRef.current) return; threeRef.current = setupThree(containerRef.current) },[])

  useEffect(()=>{
    const g = store.globals[family]
    const defaultShelves = family===FAMILY.TALL ? 4 : 1
    setAdv({
      height:g.height,
      depth:g.depth,
      boardType:g.boardType,
      boardThickness:g.boardThickness ?? 18,
      frontType:g.frontType,
      gaps:{...g.gaps},
      shelves:g.shelves ?? defaultShelves,
      hingeType:g.hingeType,
      drawerSlide:g.drawerSlide,
      aventosType:g.aventosType
    })
  }, [family, store.globals])

  const undo = store.undo
  const redo = store.redo
  useEffect(()=>{
    const handler = (e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey) && e.key==='z'){
        e.preventDefault()
        if(e.shiftKey) redo()
        else undo()
      }else if((e.ctrlKey||e.metaKey) && e.key==='y'){
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return ()=>window.removeEventListener('keydown', handler)
  }, [undo, redo])

  /**
   * Build a detailed cabinet mesh from a module definition.  The returned
   * THREE.Group contains individual parts (sides, top, bottom, back,
   * front boards, handles and feet) assembled relative to the module's
   * local origin.  Board thickness and back thickness are fixed at
   * 18 mm and 3 mm respectively.  Front splits are determined by the
   * module's adv.drawerFronts array (if present); otherwise a single
   * door is rendered.  Gaps are taken from adv.gaps when computing
   * drawer heights.
   */
  const createCabinetMesh = (mod: any) => {
    const W = mod.size.w
    const H = mod.size.h
    const D = mod.size.d
    // board and back thickness in metres
    const tMM = mod.adv?.boardThickness !== undefined ? mod.adv.boardThickness : (store.globals[mod.family]?.boardThickness ?? 18)
    const T = tMM/1000
    const backT = 0.003
    // Determine leg height based on global settings (in metres). Base cabinets use legs, others don't.
    const famGlobal = store.globals[mod.family] || {}
    let legHeight = 0
    if (mod.family === FAMILY.BASE) {
      const label: string = (famGlobal as any).legsType || ''
      const match = label.match(/(\d+\.?\d*)/)
      if (match) {
        legHeight = parseFloat(match[1]) / 100 // convert from cm to m
      } else {
        legHeight = 0.1 // default 10 cm
      }
    }
    // Colour palette
    const carcColour = new THREE.Color(0xf5f5f5)
    const frontColour = new THREE.Color(0x977e65)
    const backColour = new THREE.Color(0xf0f0f0)
    const handleColour = new THREE.Color(0x333333)
    const footColour = new THREE.Color(0x444444)
    const carcMat = new THREE.MeshStandardMaterial({ color: carcColour, metalness:0.1, roughness:0.8 })
    const frontMat = new THREE.MeshStandardMaterial({ color: frontColour, metalness:0.2, roughness:0.6 })
    const backMat = new THREE.MeshStandardMaterial({ color: backColour, metalness:0.05, roughness:0.9 })
    const handleMat = new THREE.MeshStandardMaterial({ color: handleColour, metalness:0.8, roughness:0.4 })
    const footMat = new THREE.MeshStandardMaterial({ color: footColour, metalness:0.3, roughness:0.7 })
    const metalMat = new THREE.MeshStandardMaterial({ color:0x888888, metalness:0.8, roughness:0.3 })
    const group = new THREE.Group()
    group.userData.kind = 'cab'
    // Carcase sides (add legHeight offset on Y axis)
    const sideGeo = new THREE.BoxGeometry(T, H, D)
    const leftSide = new THREE.Mesh(sideGeo, carcMat)
    leftSide.position.set(T / 2, legHeight + H / 2, -D / 2)
    group.add(leftSide)
    const rightSide = new THREE.Mesh(sideGeo.clone(), carcMat)
    rightSide.position.set(W - T / 2, legHeight + H / 2, -D / 2)
    group.add(rightSide)
    // Top and bottom boards
    const horizGeo = new THREE.BoxGeometry(W, T, D)
    const bottom = new THREE.Mesh(horizGeo, carcMat)
    bottom.position.set(W / 2, legHeight + T / 2, -D / 2)
    group.add(bottom)
    const top = new THREE.Mesh(horizGeo.clone(), carcMat)
    top.position.set(W / 2, legHeight + H - T / 2, -D / 2)
    group.add(top)
    // Back panel
    const backGeo = new THREE.BoxGeometry(W, H, backT)
    const back = new THREE.Mesh(backGeo, backMat)
    back.position.set(W / 2, legHeight + H / 2, -D + backT / 2)
    group.add(back)
    // Extract advanced settings once at the beginning
    const adv = mod.adv || {}
    const gaps = adv.gaps || { top: 0, bottom: 0 }
    // Determine if the cabinet has drawers (presence of drawerFronts array)
    const hasDrawers = Array.isArray(adv.drawerFronts) && adv.drawerFronts.length > 0
    // Convert drawer front heights from mm to m; empty array if no drawers
    let fronts: number[] = []
    if (hasDrawers) {
      fronts = adv.drawerFronts!.map((mm: number) => (mm ?? 0) / 1000)
    }
    // Determine number of doors from advanced settings when no drawers are present
    const doorCount = !hasDrawers && typeof adv.doorCount === 'number' && adv.doorCount > 0 ? adv.doorCount : 1
    // If this module has no drawers, add adjustable number of shelves.
    if (!hasDrawers) {
      const shelfWidth = Math.max(0, W - 2 * T)
      const shelfGeo = new THREE.BoxGeometry(shelfWidth, T, D)
      const count = Math.max(0, adv.shelves ?? 1)
      for (let i = 0; i < count; i++) {
        const shelf = new THREE.Mesh(shelfGeo, carcMat)
        const y = legHeight + (H * (i + 1)) / (count + 1)
        shelf.position.set(W / 2, y, -D / 2)
        group.add(shelf)
      }
    }
    // Determine number of front pieces: if drawers are defined, use their count; otherwise use doorCount
    const nFronts = hasDrawers ? fronts.length : doorCount
    // Determine hinge side: default to left if unspecified
    const hingeSide: 'left' | 'right' = (adv.hinge === 'right' ? 'right' : 'left') as 'left' | 'right'
    // Initialize open states array.  Use mod.openStates if provided; otherwise all closed
    const openStates: boolean[] = (mod.openStates && Array.isArray(mod.openStates)) ? [...mod.openStates] : new Array(nFronts).fill(false)
    // Prepare arrays to capture animatable front groups and progress
    const frontGroups: THREE.Group[] = []
    const openProgress: number[] = openStates.map(v => (v ? 1 : 0))
    if (hasDrawers) {
      // Drawers: multiple front panels that slide outward
      let yStart = legHeight + ((gaps.bottom ?? 0) / 1000)
      fronts.forEach((hFront, idx) => {
        const drawerGroup = new THREE.Group()
        drawerGroup.userData = {
          moduleId: mod.id,
          frontIndex: idx,
          type: 'drawer'
        }
        // Determine slide distance based on selected drawer slide type.  Use adv.drawerSlide or default.
        const slideType = adv.drawerSlide || 'BLUM LEGRABOX'
        let slideDist = 0.45
        if (slideType === 'GTV') slideDist = 0.4
        const maxSlide = Math.min(slideDist, D - T - 0.05)
        drawerGroup.userData.slideDist = maxSlide
        drawerGroup.position.set(0, 0, 0)
        const frontGeo = new THREE.BoxGeometry(W, hFront, T)
        const frontMesh = new THREE.Mesh(frontGeo, frontMat)
        frontMesh.position.set(W / 2, yStart + hFront / 2, -T / 2)
        drawerGroup.add(frontMesh)
        // Handle placement for drawer: width up to 40 cm or half of cabinet width
        const handleWidth = Math.min(0.4, W * 0.5)
        const handleHeight = 0.02
        const handleDepth = 0.03
        const handleGeo = new THREE.BoxGeometry(handleWidth, handleHeight, handleDepth)
        const handle = new THREE.Mesh(handleGeo, handleMat)
        handle.position.set(W / 2, yStart + hFront - handleHeight * 1.5, 0.01)
        drawerGroup.add(handle)
        group.add(drawerGroup)
        // Drawer slide rails inside carcass
        const railGeo = new THREE.BoxGeometry(0.01, 0.02, D - 0.05)
        const leftRail = new THREE.Mesh(railGeo, metalMat)
        leftRail.position.set(T / 2, legHeight + yStart + hFront / 2, -D / 2)
        group.add(leftRail)
        const rightRail = leftRail.clone()
        rightRail.position.set(W - T / 2, legHeight + yStart + hFront / 2, -D / 2)
        group.add(rightRail)
        frontGroups[idx] = drawerGroup
        yStart += hFront
      })
    } else {
      if (doorCount > 1) {
        // Multiple doors: split width evenly and assign hinge side per door
        const segmentW = W / doorCount
        for (let i = 0; i < doorCount; i++) {
          // Alternate hinge sides for doors: even index -> left hinge, odd -> right hinge.  For single door, hingeSide is used but will not matter here.
          const isEven = i % 2 === 0
          const doorHinge: 'left' | 'right' = isEven ? 'left' : 'right'
          const doorGroup = new THREE.Group()
          doorGroup.userData = {
            moduleId: mod.id,
            frontIndex: i,
            type: 'door',
            hingeSide: doorHinge
          }
          // Determine pivot x based on hinge side and segment index
          let pivotX: number
          if (doorHinge === 'left') {
            pivotX = i * segmentW
          } else {
            pivotX = (i + 1) * segmentW
          }
          doorGroup.position.set(pivotX, legHeight + H / 2, 0)
          // Door panel geometry
          const doorGeo = new THREE.BoxGeometry(segmentW, H, T)
          const doorMesh = new THREE.Mesh(doorGeo, frontMat)
          // Offset door mesh relative to pivot: left hinge -> centre at +segmentW/2; right hinge -> -segmentW/2
          const offsetX = doorHinge === 'left' ? segmentW / 2 : -segmentW / 2
          doorMesh.position.set(offsetX, 0, -T / 2)
          doorGroup.add(doorMesh)
          // Handle for door: width limited by half of segment, placed at 20% down from top
          const handleWidth = Math.min(0.4, segmentW * 0.5)
          const handleHeight = 0.02
          const handleDepth = 0.03
          const hGeo = new THREE.BoxGeometry(handleWidth, handleHeight, handleDepth)
          const handle = new THREE.Mesh(hGeo, handleMat)
          const handleOffsetX = doorHinge === 'left' ? segmentW / 2 : -segmentW / 2
          handle.position.set(handleOffsetX, H * 0.2, 0.01)
          doorGroup.add(handle)
          // Hinges for each door
          const hingeGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.03, 8)
          ;[H * -0.25, H * 0.25].forEach(yOff => {
            const hinge = new THREE.Mesh(hingeGeo, metalMat)
            hinge.rotation.z = Math.PI / 2
            hinge.position.set(0, yOff, -T / 2)
            doorGroup.add(hinge)
          })
          group.add(doorGroup)
          frontGroups[i] = doorGroup
        }
      } else {
        // Single door: rotate on hinge
        const doorGroup = new THREE.Group()
        doorGroup.userData = {
          moduleId: mod.id,
          frontIndex: 0,
          type: 'door',
          hingeSide
        }
        const pivotX = hingeSide === 'left' ? 0 : W
        doorGroup.position.set(pivotX, legHeight + H / 2, 0)
        const doorGeo = new THREE.BoxGeometry(W, H, T)
        const doorMesh = new THREE.Mesh(doorGeo, frontMat)
        const doorMeshX = hingeSide === 'left' ? W / 2 : -W / 2
        doorMesh.position.set(doorMeshX, 0, -T / 2)
        doorGroup.add(doorMesh)
        const handleWidth = Math.min(0.4, W * 0.5)
        const handleHeight = 0.02
        const handleDepth = 0.03
        const hGeo = new THREE.BoxGeometry(handleWidth, handleHeight, handleDepth)
        const handle = new THREE.Mesh(hGeo, handleMat)
        const handleX = hingeSide === 'left' ? W / 2 : -W / 2
        handle.position.set(handleX, (H * 0.2), 0.01)
        doorGroup.add(handle)
        // Hinges for single door
        const hingeGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.03, 8)
        ;[H * -0.25, H * 0.25].forEach(yOff => {
          const hinge = new THREE.Mesh(hingeGeo, metalMat)
          hinge.rotation.z = Math.PI / 2
          hinge.position.set(0, yOff, -T / 2)
          doorGroup.add(hinge)
        })
        group.add(doorGroup)
        frontGroups[0] = doorGroup
      }
    }
    // Aventos lift mechanism if applicable
    if (!hasDrawers && adv.aventosType && adv.aventosType !== 'Brak') {
      const strutGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.3, 8)
      const leftStrut = new THREE.Mesh(strutGeo, metalMat)
      leftStrut.position.set(T, legHeight + H * 0.6, -D + 0.1)
      leftStrut.rotation.z = -Math.PI / 4
      group.add(leftStrut)
      const rightStrut = leftStrut.clone()
      rightStrut.position.set(W - T, legHeight + H * 0.6, -D + 0.1)
      rightStrut.rotation.z = Math.PI / 4
      group.add(rightStrut)
    }
    // Attach open state, progress, front groups and animation speed to the cabinet group for animation
    group.userData.openStates = openStates
    group.userData.openProgress = openProgress
    group.userData.frontGroups = frontGroups
    // Store animation speed (time constant) on the group; allow override via adv.animationSpeed (in seconds per full cycle).  Default speed factor is 0.15
    const animSpeed = (typeof adv.animationSpeed === 'number' && adv.animationSpeed > 0) ? adv.animationSpeed : 0.15
    group.userData.animSpeed = animSpeed
    // Mounting strips (listwy montażowe) near bottom and top, flush with back
    if (mod.family === FAMILY.BASE) {
      const stripDepth = 0.05 // 5 cm depth
      const stripHeight = T
      const stripWidth = W - 2 * T
      const stripGeo = new THREE.BoxGeometry(stripWidth, stripHeight, stripDepth)
      // Bottom strip: offset 8 cm from carcase bottom
      const bottomY = legHeight + T + 0.08 + stripHeight / 2
      const bs = new THREE.Mesh(stripGeo, carcMat)
      bs.position.set(W / 2, bottomY, -D + backT + stripDepth / 2)
      group.add(bs)
      // Top strip: offset 8 cm from carcase top
      const topY = legHeight + H - T - 0.08 - stripHeight / 2
      const ts = new THREE.Mesh(stripGeo.clone(), carcMat)
      ts.position.set(W / 2, topY, -D + backT + stripDepth / 2)
      group.add(ts)
    }
    // Feet: four cylinders at corners; use legHeight for foot height
    if (legHeight > 0) {
      const footRadius = 0.03
      const footHeight = legHeight
      const footGeo = new THREE.CylinderGeometry(footRadius, footRadius, footHeight, 16)
      // front-left
      const fl = new THREE.Mesh(footGeo, footMat)
      fl.position.set(T + footRadius, footHeight / 2, -T)
      group.add(fl)
      // front-right
      const fr = new THREE.Mesh(footGeo.clone(), footMat)
      fr.position.set(W - T - footRadius, footHeight / 2, -T)
      group.add(fr)
      // back-left
      const bl = new THREE.Mesh(footGeo.clone(), footMat)
      bl.position.set(T + footRadius, footHeight / 2, -D + T)
      group.add(bl)
      // back-right
      const br = new THREE.Mesh(footGeo.clone(), footMat)
      br.position.set(W - T - footRadius, footHeight / 2, -D + T)
      group.add(br)
    }
    return group
  }

  const drawScene = () => {
    const group = threeRef.current?.group
    if (!group) return
    // Remove previous cabinet and countertop meshes
    ;[...group.children].forEach((c: any) => {
      if (c.userData?.kind === 'cab' || c.userData?.kind === 'top') {
        group.remove(c)
        // Dispose geometries and materials
        c.traverse((obj: any) => {
          if (obj.isMesh) {
            obj.geometry?.dispose?.()
            if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose())
            else obj.material?.dispose?.()
          }
        })
      }
    })
    store.modules.forEach((m: any) => {
      // Build a detailed cabinet mesh
      const cabMesh = createCabinetMesh(m)
      // Determine leg height for positioning
      const famGlobal = store.globals[m.family] || {}
      let legHeight = 0
      if (m.family === FAMILY.BASE) {
        const label: string = (famGlobal as any).legsType || ''
        const match = label.match(/(\d+\.?\d*)/)
        if (match) legHeight = parseFloat(match[1]) / 100
        else legHeight = 0.1
      }
      // Position and rotate according to module. Base cabinets sit on legs at ground level (y=0), others preserve original y.
      const baseY = m.family === FAMILY.BASE ? 0 : m.position[1]
      cabMesh.position.set(m.position[0], baseY, m.position[2])
      cabMesh.rotation.y = m.rotationY || 0
      group.add(cabMesh)
      // Add countertop for base cabinets if enabled
      if (addCountertop && m.family === FAMILY.BASE) {
        const topThickness = 0.04
        const top = new THREE.Mesh(
          new THREE.BoxGeometry(m.size.w, topThickness, m.size.d),
          new THREE.MeshStandardMaterial({ color: 0xbfa06a })
        )
        // Place the countertop above the carcase and legs
        const topY = baseY + legHeight + m.size.h + topThickness / 2
        top.position.set(m.position[0], topY, m.position[2])
        top.rotation.y = m.rotationY || 0
        top.userData.kind = 'top'
        group.add(top)
      }
    })
  }
  useEffect(drawScene, [store.modules, addCountertop])

  // Add pointer event listener to enable interactive opening of cabinet doors and drawers.
  useEffect(() => {
    const three = threeRef.current
    if (!three || !three.renderer || !three.camera || !three.group) return
    const renderer = three.renderer as THREE.WebGLRenderer
    const camera = three.camera as THREE.PerspectiveCamera
    const group = three.group as THREE.Group
    const raycaster = new THREE.Raycaster()
    const handlePointer = (event: PointerEvent) => {
      // calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = renderer.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      )
      raycaster.setFromCamera(mouse, camera)
      // intersect with all children of group (recursively)
      const intersects = raycaster.intersectObjects(group.children, true)
      if (intersects.length === 0) return
      // find nearest object with userData indicating a door/drawer
      let obj: any = intersects[0].object
      while (obj && !obj.userData?.type) {
        obj = obj.parent
      }
      if (!obj || !obj.userData) return
      const { moduleId, frontIndex, type } = obj.userData
      if (frontIndex === undefined) return
      // Find the parent cabinet group (userData.kind === 'cab')
      let cab: any = obj
      while (cab && cab.userData?.kind !== 'cab') {
        cab = cab.parent
      }
      if (!cab || !cab.userData) return
      // Toggle open state on cabinet's userData and leave store untouched
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

  // Animation loop to smoothly interpolate door rotation and drawer translation.
  useEffect(() => {
    let animId: number
    const animate = () => {
      const three = threeRef.current
      if (three && three.group) {
        const group = three.group as THREE.Group
        // Iterate over each cabinet group and update its front animations
        group.children.forEach((cab: any) => {
          if (cab.userData?.kind === 'cab') {
            const openStates: boolean[] = cab.userData.openStates || []
            const openProgress: number[] = cab.userData.openProgress || []
            const frontGroups: any[] = cab.userData.frontGroups || []
            openStates.forEach((target, idx) => {
              let prog = openProgress[idx] ?? 0
              const dest = target ? 1 : 0
              const diff = dest - prog
              if (Math.abs(diff) > 0.001) {
                // Smoothly approach the target with a simple ease.  Use cabinet-specific animSpeed if provided.
                const speed = cab.userData.animSpeed || 0.15
                prog += diff * speed
                // Snap to target if close enough
                if (Math.abs(dest - prog) < 0.02) prog = dest
                openProgress[idx] = prog
                const fg = frontGroups[idx]
                if (fg) {
                  if (fg.userData.type === 'door') {
                    const hingeSide = fg.userData.hingeSide || 'left'
                    const sign = hingeSide === 'left' ? -1 : 1
                    fg.rotation.y = sign * Math.PI / 2 * prog
                  } else if (fg.userData.type === 'drawer') {
                    const slide = fg.userData.slideDist || 0.45
                    fg.position.z = -slide * prog
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

  const snapToWalls = (mSize:{w:number;h:number;d:number}, fam:FAMILY) => {
    const segs = getWallSegments()
    if (segs.length===0) return { pos:[(store.modules.reduce((s:any,x:any)=>s+x.size.w,0)) + mSize.w/2, mSize.h/2, 0], rot:0, segIndex:null }
    let best:any=null
    const guess = { x:0, y:0 }
    segs.forEach((seg,i)=>{
      const pr = projectPointToSegment(guess.x, guess.y, seg as any)
      if (!best || pr.dist<best.pr.dist) best={ seg, pr, i }
    })
    const gl = store.globals[fam]
    const offset = (gl.offsetWall||0) / 1000
    const nx = (best.seg.b.y - best.seg.a.y)
    const ny = -(best.seg.b.x - best.seg.a.x)
    const nlen = Math.hypot(nx,ny)||1
    const ux = nx/nlen, uy = ny/nlen
    const x = (best.pr.x/1000) + ux*offset
    const z = (best.pr.y/1000) + uy*offset
    const rot = -best.seg.angle
    const y = mSize.h/2
    return { pos:[x,y,z], rot, segIndex: best.i }
  }

  const collides = (a:any, b:any) => {
    const dx = Math.abs(a.position[0]-b.position[0]), dz=Math.abs(a.position[2]-b.position[2])
    return (dx < (a.size.w+b.size.w)/2) && (dz < (a.size.d+b.size.d)/2)
  }

  const resolveCollisions = (mod:any) => {
    let tryMod = {...mod}
    let loops=0
    const step=0.02
    const segs = getWallSegments()
    const seg = (typeof mod.segIndex==='number') ? segs[mod.segIndex] : null
    const tangent = seg ? { x:(seg.b.x-seg.a.x)/seg.length, y:(seg.b.y-seg.a.y)/seg.length } : { x:1, y:0 }
    while (store.modules.some((m:any)=>collides(tryMod,m)) && loops<500){
      tryMod.position = [ tryMod.position[0] + tangent.x*step, tryMod.position[1], tryMod.position[2] + tangent.y*step ]
      loops++
    }
    const {segIndex, ...rest} = tryMod
    return rest
  }

  const onAdd = (widthMM:number, advLocal:any) => {
    if (!kind || !variant) return
    const g = { ...store.globals[family], ...advLocal, gaps: { ...store.globals[family].gaps, ...(advLocal?.gaps||{}) } }
    const h = (g.height)/1000, d=(g.depth)/1000, w=(widthMM)/1000
    const id = `mod_${Date.now()}_${Math.floor(Math.random()*1e6)}`
    const price = computeModuleCost({ family, kind:kind.key, variant:variant.key, width: widthMM, adv:{ height:g.height, depth:g.depth, boardType:g.boardType, boardThickness:g.boardThickness, frontType:g.frontType, gaps:g.gaps, hingeType:g.hingeType, drawerSlide:g.drawerSlide, aventosType:g.aventosType } })
    const snap = snapToWalls({ w, h, d }, family)
    // Augment advanced settings with defaults for hinge, drawer slide type and animation speed if missing.
    // Additionally, compute drawer front heights based on the selected variant if none were provided.
    const advAugmented: any = { ...g }
    // Merge in provided advLocal properties (e.g. user overrides)
    // They are already in g because advLocal merged into g above.
    // Set default hinge side
    if (!advAugmented.hinge) advAugmented.hinge = 'left'
    // Set default drawer slide and hinge types
    if (!advAugmented.hingeType) advAugmented.hingeType = 'Blum ClipTop'
    if (!advAugmented.drawerSlide) advAugmented.drawerSlide = 'BLUM LEGRABOX'
    if (!advAugmented.aventosType) advAugmented.aventosType = 'Brak'
    // Set default animation speed
    if (advAugmented.animationSpeed === undefined) advAugmented.animationSpeed = 0.15
    // Determine number of drawers implied by the variant key.  Variants starting with 's' encode the number of drawers directly (e.g. 's3');
    // variants containing '+drawer' (e.g. 'd2+drawer') imply a single drawer; otherwise zero.
    let impliedDrawers = 0
    if (variant && variant.key) {
      const vkey = variant.key
      if (vkey.startsWith('s')) {
        const num = Number(vkey.slice(1))
        if (!isNaN(num)) impliedDrawers = num
      } else if (vkey.includes('+drawer')) {
        impliedDrawers = 1
      }
    }
    // Determine number of doors implied by the variant.  For variants that begin with 'd' and do not include '+drawer',
    // extract the numeric count after 'd'.  If absent or invalid, default to 1.  Sink/hob variants are treated as two doors.
    let impliedDoors = 1
    if (variant && variant.key) {
      const vkey = variant.key
      // Only consider base 'doors' kind; other kinds like tall/wall/pawlacz may use different prefixes (e.g. 'wd2', 'p3').
      // Extract the leading digits in the key.
      const m = vkey.match(/^(?:d|wd|p)(\d+)/)
      if (m && m[1]) {
        const n = Number(m[1])
        if (!isNaN(n) && n > 0) impliedDoors = n
      } else if (vkey.startsWith('sink') || vkey.startsWith('hob')) {
        // Sink and hob cabinets typically have two doors
        impliedDoors = 2
      }
      // For variants containing '+drawer', we assume only one door above the drawer even if the key starts with d2.  This simplified
      // assumption means combined variants like 'd2+drawer' will render as a single door and a drawer instead of two doors and a drawer.
      if (vkey.includes('+drawer')) {
        impliedDoors = 1
      }
    }
    // If no custom drawerFronts are provided and drawers are implied, create equal front heights (in mm) and assign to advAugmented.drawerFronts.
    if ((!Array.isArray(advAugmented.drawerFronts) || advAugmented.drawerFronts.length === 0) && impliedDrawers > 0) {
      // Deduct top/bottom gaps from the total available height
      const totalFrontMM = Math.max(50, Math.round(g.height - ((g.gaps.top || 0) + (g.gaps.bottom || 0))))
      const heights: number[] = []
      for (let i = 0; i < impliedDrawers; i++) {
        heights.push(Math.floor(totalFrontMM / impliedDrawers))
      }
      const sum = heights.reduce((a, b) => a + b, 0)
      if (sum !== totalFrontMM) heights[heights.length - 1] += (totalFrontMM - sum)
      advAugmented.drawerFronts = heights
    }
    // Persist implied door count to advanced settings so the mesh can be constructed accordingly when no drawers are specified
    advAugmented.doorCount = impliedDoors
    let mod: any = {
      id,
      label: variant.label,
      family,
      kind: kind.key,
      size: { w, h, d },
      position: snap.pos,
      rotationY: snap.rot,
      segIndex: snap.segIndex,
      price,
      adv: advAugmented,
    }
    // Determine number of front pieces to initialize openStates array.  Use number of drawer fronts if defined; otherwise use door count.
    const nFrontsInit = Array.isArray(advAugmented.drawerFronts) && advAugmented.drawerFronts.length > 0 ? advAugmented.drawerFronts.length : (advAugmented.doorCount || 1)
    mod.openStates = new Array(nFrontsInit).fill(false)
    mod = resolveCollisions(mod)
    store.addModule(mod)
    setVariant(null)
  }

  const doAutoOnSelectedWall = () => {
    const segs = getWallSegments(); if (segs.length===0) return alert('Brak ścian')
    const seg = segs[0 + (selWall % segs.length)]
    const len = seg.length
    const widths = autoWidthsForRun(len)
    const g = store.globals[family]; const h=(g.height)/1000; const d=(g.depth)/1000
    const placed = placeAlongWall(widths, seg, 5)
    placed.forEach((pl,i)=>{
      const wmm = widths[i]; const w=wmm/1000
      const id = `auto_${Date.now()}_${i}_${Math.floor(Math.random()*1e6)}`
      const price = computeModuleCost({ family, kind:(KIND_SETS[family][0]?.key)||'doors', variant:'d1', width: wmm, adv:{ height:g.height, depth:g.depth, boardType:g.boardType, boardThickness:g.boardThickness, frontType:g.frontType, gaps:g.gaps, hingeType:g.hingeType, drawerSlide:g.drawerSlide, aventosType:g.aventosType } })
      let mod:any = { id, label:'Auto', family, kind:(KIND_SETS[family][0]?.key)||'doors', size:{ w,h,d }, position:[pl.center[0]/1000, h/2, pl.center[1]/1000], rotationY:pl.rot, segIndex: selWall, price, adv:g }
      mod = resolveCollisions(mod)
      store.addModule(mod)
    })
  }

  const gLocal = adv || store.globals[family]

  return (
    <div className="app">
      <div className="canvasWrap" >
        <div ref={containerRef} style={{ position:'absolute', inset:0 }} />
        <div className="topbar row">
          <button className="btnGhost" onClick={()=>store.setRole(store.role==='stolarz'?'klient':'stolarz')}>Tryb: {store.role==='stolarz'?'Stolarz':'Klient'}</button>
          <button className="btnGhost" onClick={()=>{ setVariant(null); setKind(null); }}>Reset wyboru</button>
          <button className="btnGhost" onClick={()=>store.undo()} disabled={store.past.length===0}>Cofnij</button>
          <button className="btnGhost" onClick={()=>store.redo()} disabled={store.future.length===0}>Ponów</button>
          <button className="btnGhost" onClick={()=>store.clear()}>Wyczyść</button>
          <select className="btnGhost" value={selWall} onChange={e=>setSelWall(Number((e.target as HTMLSelectElement).value)||0)}>
            {getWallSegments().map((s,i)=> <option key={i} value={i}>Ściana {i+1} ({Math.round(s.length)} mm)</option>)}
          </select>
          <button className="btn" onClick={doAutoOnSelectedWall}>Auto pod ścianę</button>
        </div>
      </div>
      <aside className="sidebar">
        <div className="section card">
          <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
            <div className="h2">Materiał (arkusz)</div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(120px, 1fr))', gap:12, marginTop:10}}>
            <div>
              <div className="small">Wysokość arkusza L (mm)</div>
              <SingleMMInput value={boardL} onChange={v=>setBoardL(v)} max={4000} />
            </div>
            <div>
              <div className="small">Szerokość arkusza W (mm)</div>
              <SingleMMInput value={boardW} onChange={v=>setBoardW(v)} max={4000} />
            </div>
            <div>
              <div className="small">Kerf (mm)</div>
              <input className="input" type="number" min={0} max={10} step={0.1}
                    value={boardKerf}
                    onChange={e=>setBoardKerf(Math.max(0, Math.min(10, Number(e.target.value)||0)))} />
            </div>
            <div style={{display:'flex', alignItems:'end'}}>
              <label className="small" style={{display:'flex', gap:8, alignItems:'center'}}>
                <input type="checkbox" checked={boardHasGrain} onChange={e=>setBoardHasGrain(e.target.checked)} />
                Płyta ma usłojenie
              </label>
            </div>
          </div>
          <div className="tiny muted" style={{marginTop:6}}>
            Bez usłojenia: formatki można obracać (muszą się zmieścić w {boardL}×{boardW} lub {boardW}×{boardL}).
            Z usłojeniem: elementy wymagające słojów bez rotacji (h≤{boardL}, w≤{boardW}).
          </div>
        </div>

        <GlobalSettings />

        <div className="tabs">
          <button className={`tabBtn ${tab==='cab'?'active':''}`} onClick={()=>setTab('cab')}>Kuchnia</button>
          <button className={`tabBtn ${tab==='room'?'active':''}`} onClick={()=>setTab('room')}>Pomieszczenie</button>
          <button className={`tabBtn ${tab==='costs'?'active':''}`} onClick={()=>setTab('costs')}>Koszty</button>
          <button className={`tabBtn ${tab==='cut'?'active':''}`} onClick={()=>setTab('cut')}>Formatki</button>
        </div>

        {tab==='cab' && (<>
          <div>
            <div className="h1">Typ szafki</div>
            <TypePicker family={family} setFamily={(f)=>{ setFamily(f); setKind(null); setVariant(null); }} />
          </div>

          <div className="section">
            <div className="hd"><div><div className="h1">Podkategorie ({FAMILY_LABELS[family]})</div></div></div>
            <div className="bd">
              <KindTabs family={family} kind={kind} setKind={(k)=>{ setKind(k); setVariant(null); }} />
            </div>
          </div>

          {kind && (
            <div className="section">
              <div className="hd"><div><div className="h1">Wariant</div></div></div>
              <div className="bd">
                <VariantList kind={kind} onPick={(v)=>{ setVariant(v); setCfgTab('basic'); }} />
              </div>
            </div>
          )}

          {variant && (
            <div className="section">
              <div className="hd">
                <div><div className="h1">Konfiguracja — {variant.label}</div></div>
                <div className="tabs">
                  <button className={`tabBtn ${cfgTab==='basic'?'active':''}`} onClick={()=>setCfgTab('basic')}>Podstawowe</button>
                  <button className={`tabBtn ${cfgTab==='adv'?'active':''}`} onClick={()=>setCfgTab('adv')}>Zaawansowane</button>
                </div>
              </div>
              <div className="bd">
                {cfgTab==='basic' && (
                  <div>
                    <div className="grid2">
                      <div>
                        <div className="small">Szerokość (mm)</div>
                        <input className="input" type="number" min={200} max={2400} step={1} value={widthMM} onChange={e=>setWidthMM(Number((e.target as HTMLInputElement).value)||0)} onKeyDown={(e)=>{
                          if (e.key==='Enter'){ const v = Number((e.target as HTMLInputElement).value)||0; if(v>0) onAdd(v, gLocal) }
                        }}/>
                      </div>
                      <div className="row" style={{alignItems:'flex-end'}}>
                        <button className="btn" onClick={()=>onAdd(widthMM, gLocal)}>Wstaw szafkę</button>
                      </div>
                    </div>
                    <div style={{marginTop:8}}>
                      <TechDrawing
                        mode="view"
                        family={family}
                        kindKey={kind?.key||'doors'}
                        variantKey={variant?.key||'d1'}
                        widthMM={widthMM}
                        heightMM={gLocal.height}
                        depthMM={gLocal.depth}
                        gaps={gLocal.gaps}
                        drawers={variant?.key?.startsWith('s') ? Number(variant.key.slice(1)) : (variant?.key?.includes('+drawer') ? 1 : 0)}
                        drawerFronts={gLocal.drawerFronts}
                      />
                    </div>
                    <div className="row" style={{marginTop:8}}>
                      <Cabinet3D family={family} widthMM={widthMM} heightMM={gLocal.height} depthMM={gLocal.depth} boardThickness={gLocal.boardThickness} drawers={variant?.key?.startsWith('s') ? Number(variant.key.slice(1)) : (variant?.key?.includes('+drawer') ? 1 : 0)} gaps={{top:gLocal.gaps.top, bottom:gLocal.gaps.bottom}} drawerFronts={gLocal.drawerFronts} shelves={gLocal.shelves} hingeType={gLocal.hingeType} drawerSlide={gLocal.drawerSlide} aventosType={gLocal.aventosType} />
                    </div>
                  </div>
                )}
                {cfgTab==='adv' && (
                  <div>
                    <div className="grid4">
                      <div><div className="small">Wysokość (mm)</div><input className="input" type="number" value={gLocal.height} onChange={e=>setAdv({...gLocal, height:Number((e.target as HTMLInputElement).value)||0})} /></div>
                      <div><div className="small">Głębokość (mm)</div><input className="input" type="number" value={gLocal.depth} onChange={e=>setAdv({...gLocal, depth:Number((e.target as HTMLInputElement).value)||0})} /></div>
                      <div><div className="small">Płyta</div><select className="input" value={gLocal.boardType} onChange={e=>setAdv({...gLocal, boardType:(e.target as HTMLSelectElement).value})}>{Object.keys(store.prices.board).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                      <div><div className="small">Grubość płyty (mm)</div><input className="input" type="number" value={gLocal.boardThickness ?? 18} onChange={e=>setAdv({...gLocal, boardThickness:Number((e.target as HTMLInputElement).value)||0})} /></div>
                      <div><div className="small">Front</div><select className="input" value={gLocal.frontType} onChange={e=>setAdv({...gLocal, frontType:(e.target as HTMLSelectElement).value})}>{Object.keys(store.prices.front).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                      <div><div className="small">Zawias</div><select className="input" value={gLocal.hingeType} onChange={e=>setAdv({...gLocal, hingeType:(e.target as HTMLSelectElement).value})}>{Object.keys(store.prices.hinges).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                      { (variant?.key?.startsWith('s') || variant?.key?.includes('+drawer')) && (
                        <div><div className="small">Prowadnice</div><select className="input" value={gLocal.drawerSlide} onChange={e=>setAdv({...gLocal, drawerSlide:(e.target as HTMLSelectElement).value})}>{Object.keys(store.prices.drawerSlide).map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                      )}
                      <div><div className="small">Aventos</div><select className="input" value={gLocal.aventosType} onChange={e=>setAdv({...gLocal, aventosType:(e.target as HTMLSelectElement).value})}>{['Brak', ...Object.keys(store.prices.aventos)].map(k=><option key={k} value={k}>{k}</option>)}</select></div>
                    </div>
                    {!(variant?.key?.startsWith('s')) && (
                      <div style={{marginTop:8}}>
                        <div className="small">Liczba półek</div>
                        <input className="input" type="number" min={0} value={gLocal.shelves||0} onChange={e=>setAdv({...gLocal, shelves:Number((e.target as HTMLInputElement).value)||0})} />
                      </div>
                    )}
                    <div style={{marginTop:8}}>
                      <div className="small">Szczeliny i wysokości frontów (ustawiaj graficznie)</div>
                      <TechDrawing
                        mode="edit"
                        family={family}
                        kindKey={kind?.key||'doors'}
                        variantKey={variant?.key||'d1'}
                        widthMM={widthMM}
                        heightMM={gLocal.height}
                        depthMM={gLocal.depth}
                        gaps={gLocal.gaps}
                        drawers={variant?.key?.startsWith('s') ? Number(variant.key.slice(1)) : (variant?.key?.includes('+drawer') ? 1 : 0)}
                        drawerFronts={gLocal.drawerFronts}
                        onChangeGaps={(gg)=>setAdv({ ...gLocal, gaps: gg })}
                        onChangeDrawerFronts={(arr)=>setAdv({ ...gLocal, drawerFronts: arr })}
                      />
                    </div>
                    <div className="row" style={{marginTop:8}}>
                      <Cabinet3D family={family} widthMM={widthMM} heightMM={gLocal.height} depthMM={gLocal.depth} boardThickness={gLocal.boardThickness} drawers={variant?.key?.startsWith('s') ? Number(variant.key.slice(1)) : (variant?.key?.includes('+drawer') ? 1 : 0)} gaps={{top:gLocal.gaps.top, bottom:gLocal.gaps.bottom}} drawerFronts={gLocal.drawerFronts} shelves={gLocal.shelves} hingeType={gLocal.hingeType} drawerSlide={gLocal.drawerSlide} aventosType={gLocal.aventosType} />
                    </div>
                    <div className="row" style={{marginTop:8}}>
                      <button className="btn" onClick={()=>onAdd(widthMM, gLocal)}>Wstaw szafkę</button>
                      <button className="btnGhost" onClick={()=>setCfgTab('basic')}>← Podstawowe</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>)}

        {tab==='room' && (<RoomTab three={threeRef} />)}
        {tab==='costs' && (<CostsTab />)}
        {tab==='cut' && (<CutlistTab />)}
        
      </aside>
    </div>
  )
}

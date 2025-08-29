import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FAMILY, FAMILY_COLORS } from '../../core/catalog'

export default function Cabinet3D({ widthMM, heightMM, depthMM, boardThickness=18, drawers, gaps, drawerFronts, family, shelves=1, hingeType, drawerSlide, aventosType, openingMechanism='Standard', backPanel='full' }:{ widthMM:number;heightMM:number;depthMM:number;boardThickness?:number;drawers:number;gaps:{top:number;bottom:number};drawerFronts?:number[];family:FAMILY; shelves?:number; hingeType?:string; drawerSlide?:string; aventosType?:string; openingMechanism?:string; backPanel?:'full'|'split'|'none' }){
  const ref = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    // Wait until our container is available
    if (!ref.current) return
    const w = 260, h = 190
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias:true })
    renderer.setSize(w,h)
    // Replace any previous canvas
    ref.current.innerHTML=''
    ref.current.appendChild(renderer.domElement)
    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    // Camera setup: position slightly above and to the side to reveal depth
    const camera = new THREE.PerspectiveCamera(35, w/h, 0.01, 100)
    camera.position.set(0.9, 0.7, 1.3)
    camera.lookAt(0, 0.4, -0.2)
    // Lighting: directional and ambient for soft shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9)
    dirLight.position.set(2, 3, 2)
    scene.add(dirLight)
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    // Convert millimetres to metres
    const W = widthMM / 1000
    const H = heightMM / 1000
    const D = depthMM / 1000
    // Board thickness (in mm) and back thickness (3 mm)
    const T = boardThickness/1000
    const backT = 0.003
    // Colour palette: carcase (light grey), front (warm wood), back (very light)
    const carcColour = new THREE.Color(0xf5f5f5)
    const frontColour = new THREE.Color(FAMILY_COLORS[family])
    const backColour = new THREE.Color(0xf0f0f0)
    // Materials
    const carcMat = new THREE.MeshStandardMaterial({ color: carcColour, metalness:0.1, roughness:0.8 })
    const frontMat = new THREE.MeshStandardMaterial({ color: frontColour, metalness:0.2, roughness:0.6 })
    const backMat = new THREE.MeshStandardMaterial({ color: backColour, metalness:0.05, roughness:0.9 })
    // Group to hold cabinet parts
    const cabGroup = new THREE.Group()
    scene.add(cabGroup)
    // Build carcase: sides
    // Left side
    const leftSideGeo = new THREE.BoxGeometry(T, H, D)
    const leftSide = new THREE.Mesh(leftSideGeo, carcMat)
    leftSide.position.set(T / 2, H / 2, -D / 2)
    cabGroup.add(leftSide)
    // Right side
    const rightSide = new THREE.Mesh(leftSideGeo.clone(), carcMat)
    rightSide.position.set(W - T / 2, H / 2, -D / 2)
    cabGroup.add(rightSide)
    // Top and bottom
    const horizGeo = new THREE.BoxGeometry(W, T, D)
    const bottomBoard = new THREE.Mesh(horizGeo, carcMat)
    bottomBoard.position.set(W / 2, T / 2, -D / 2)
    cabGroup.add(bottomBoard)
    const topBoard = new THREE.Mesh(horizGeo.clone(), carcMat)
    topBoard.position.set(W / 2, H - T / 2, -D / 2)
    cabGroup.add(topBoard)
    // Back board
    if (backPanel !== 'none') {
      if (backPanel === 'split') {
        const halfH = (H - T) / 2
        const backGeo = new THREE.BoxGeometry(W, halfH, backT)
        const topBack = new THREE.Mesh(backGeo, backMat)
        topBack.position.set(W / 2, H - halfH / 2 - T / 2, -D + backT / 2)
        cabGroup.add(topBack)
        const botBack = new THREE.Mesh(backGeo.clone(), backMat)
        botBack.position.set(W / 2, halfH / 2 + T / 2, -D + backT / 2)
        cabGroup.add(botBack)
      } else {
        const backGeo = new THREE.BoxGeometry(W, H, backT)
        const backBoard = new THREE.Mesh(backGeo, backMat)
        backBoard.position.set(W / 2, H / 2, -D + backT / 2)
        cabGroup.add(backBoard)
      }
    }
    // Shelves: simple horizontal boards (if drawers = 0) else skip
    if (drawers === 0) {
      const shelfGeo = new THREE.BoxGeometry(W - 2 * T, T, D)
      const count = Math.max(0, shelves)
      for (let i = 0; i < count; i++) {
        const shelf = new THREE.Mesh(shelfGeo, carcMat)
        const y = H * (i + 1) / (count + 1)
        shelf.position.set(W / 2, y, -D / 2)
        cabGroup.add(shelf)
      }
    }
    // Front: if drawers > 0, split into drawer fronts; otherwise full door
    if (drawers > 0) {
      // Determine heights of drawer fronts
      const totalFrontHeight = Math.max(50, Math.round(heightMM - (gaps.top + gaps.bottom)))
      const arr = drawerFronts && drawerFronts.length === drawers ? drawerFronts : Array.from({ length: drawers }, () => Math.floor(totalFrontHeight / drawers))
      // Start stacking fronts from the bottom gap (convert mm to m)
      let currentY = gaps.bottom / 1000
      for (let i = 0; i < drawers; i++) {
        const h = arr[i] / 1000
        const frontGeo = new THREE.BoxGeometry(W, h, T)
        const frontMesh = new THREE.Mesh(frontGeo, frontMat)
        // Position each drawer front; note: y is bottom of front + h/2
        frontMesh.position.set(W / 2, currentY + h / 2, -T / 2)
        cabGroup.add(frontMesh)
        if (openingMechanism !== 'TIP-ON') {
          const handleWidth = Math.min(0.4, W * 0.5)
          const handleHeight = 0.02
          const handleDepth = 0.03
          const handleGeo = new THREE.BoxGeometry(handleWidth, handleHeight, handleDepth)
          const handleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness:0.8, roughness:0.4 })
          const handleMesh = new THREE.Mesh(handleGeo, handleMat)
          handleMesh.position.set(W / 2, currentY + h - handleHeight * 1.5, 0.01)
          cabGroup.add(handleMesh)
        }
        // Drawer slide rails on both sides
        const railGeo = new THREE.BoxGeometry(0.01, 0.02, D - 0.05)
        const railMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness:0.6, roughness:0.4 })
        const railY = currentY + h / 2
        const leftRail = new THREE.Mesh(railGeo, railMat)
        leftRail.position.set(T / 2, railY, -D / 2)
        cabGroup.add(leftRail)
        const rightRail = leftRail.clone()
        rightRail.position.set(W - T / 2, railY, -D / 2)
        cabGroup.add(rightRail)
        // Move up by this front's height for the next drawer
        currentY += h
      }
    } else {
      // Single door
      const doorGeo = new THREE.BoxGeometry(W, H, T)
      const door = new THREE.Mesh(doorGeo, frontMat)
      door.position.set(W / 2, H / 2, -T / 2)
      cabGroup.add(door)
      if (openingMechanism !== 'TIP-ON') {
        const handleWidth = Math.min(0.4, W * 0.5)
        const handleHeight = 0.02
        const handleDepth = 0.03
        const handleGeo = new THREE.BoxGeometry(handleWidth, handleHeight, handleDepth)
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness:0.8, roughness:0.4 })
        const handle = new THREE.Mesh(handleGeo, handleMat)
        handle.position.set(W / 2, H * 0.7, 0.01)
        cabGroup.add(handle)
      } else {
        const pushGeo = new THREE.BoxGeometry(0.02,0.02,0.02)
        const pushMat = new THREE.MeshStandardMaterial({ color:0x888888, metalness:0.6, roughness:0.4 })
        const push = new THREE.Mesh(pushGeo, pushMat)
        push.position.set(W/2, H*0.7, -D + 0.05)
        cabGroup.add(push)
      }
      // Hinges
      const hingeMat = new THREE.MeshStandardMaterial({ color:0x888888, metalness:0.8, roughness:0.3 })
      const hingeGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.03, 8)
      ;[H * 0.25, H * 0.75].forEach(y => {
        const hinge = new THREE.Mesh(hingeGeo, hingeMat)
        hinge.rotation.z = Math.PI / 2
        hinge.position.set(0, y, -T / 2)
        cabGroup.add(hinge)
        if (openingMechanism === 'BLUMOTION') {
          const damper = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.02,0.02), hingeMat)
          damper.position.set(T, y, -D + 0.05)
          cabGroup.add(damper)
        }
      })
      // Aventos lift (if selected)
      if (aventosType && aventosType !== 'Brak') {
        const strutGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.25, 8)
        const strutMat = new THREE.MeshStandardMaterial({ color:0x888888, metalness:0.6, roughness:0.4 })
        const leftStrut = new THREE.Mesh(strutGeo, strutMat)
        leftStrut.position.set(T, H * 0.6, -D + 0.1)
        leftStrut.rotation.z = -Math.PI / 4
        cabGroup.add(leftStrut)
        const rightStrut = leftStrut.clone()
        rightStrut.position.set(W - T, H * 0.6, -D + 0.1)
        rightStrut.rotation.z = Math.PI / 4
        cabGroup.add(rightStrut)
      }
    }
    // Legs: only for base and tall cabinets
    if (family === FAMILY.BASE || family === FAMILY.TALL) {
      const footRadius = 0.02
      const footHeight = 0.04
      const footGeo = new THREE.CylinderGeometry(footRadius, footRadius, footHeight, 16)
      const footMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness:0.3, roughness:0.7 })
      const fl = new THREE.Mesh(footGeo, footMat)
      fl.position.set(T + footRadius, -footHeight / 2, -T)
      cabGroup.add(fl)
      const fr = new THREE.Mesh(footGeo.clone(), footMat)
      fr.position.set(W - T - footRadius, -footHeight / 2, -T)
      cabGroup.add(fr)
      const bl = new THREE.Mesh(footGeo.clone(), footMat)
      bl.position.set(T + footRadius, -footHeight / 2, -D + T)
      cabGroup.add(bl)
      const br = new THREE.Mesh(footGeo.clone(), footMat)
      br.position.set(W - T - footRadius, -footHeight / 2, -D + T)
      cabGroup.add(br)
    }
    // Render once
    renderer.render(scene, camera)
    // Clean up on unmount
    return () => {
      renderer.dispose()
    }
  }, [widthMM, heightMM, depthMM, drawers, gaps, drawerFronts, family, shelves, hingeType, drawerSlide, aventosType, openingMechanism, backPanel])
  return <div ref={ref} style={{ width: 260, height: 190, border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff' }} />
}

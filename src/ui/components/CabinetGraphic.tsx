import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type Gaps = { left:number; right:number; top:number; bottom:number; between:number }
type Props = {
  mode:'view'|'edit'
  family:'BASE'|'WALL'|'PAWLACZ'|'TALL'
  kindKey:string
  variantKey:string
  widthMM:number
  heightMM:number
  depthMM:number
  gaps:Gaps
  drawers:number
  drawerFronts?: number[]
  onChangeGaps?:(g:Gaps)=>void
  onChangeDrawerFronts?:(arr:number[])=>void
}

function clamp(n:number, min:number, max:number){ return Math.max(min, Math.min(max, n)) }

export default function CabinetGraphic({
  mode, family, kindKey, variantKey, widthMM, heightMM, depthMM, gaps, drawers, drawerFronts, onChangeGaps, onChangeDrawerFronts
}:Props){
  const W=360, H=230
  const scale = 4
  const inner = { x:10, y:10, w:W-20, h:H-20 }
  const [drag, setDrag] = useState<{tag:string; startY:number; startVals:any} | null>(null)

  const front = useMemo(()=>{
    const gxL = (gaps.left||0)/scale, gxR=(gaps.right||0)/scale, gyT=(gaps.top||0)/scale, gyB=(gaps.bottom||0)/scale
    return { x: inner.x+gxL, y: inner.y+gyT, w: inner.w-gxL-gxR, h: inner.h-gyT-gyB }
  }, [gaps])

  const drawersHeights = useMemo(()=>{
    if (drawers<=0) return []
    const total = Math.max(50, Math.round(heightMM - (gaps.top+gaps.bottom)))
    let arr = drawerFronts && drawerFronts.length===drawers ? drawerFronts.slice() : Array.from({length:drawers}, ()=> Math.floor(total/drawers))
    let s = arr.reduce((a,b)=>a+b,0); if (s!==total) { arr[drawers-1] += (total - s) }
    return arr
  }, [drawers, drawerFronts, gaps, heightMM])

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (mode!=='edit') return
    const el = (e.target as Element)
    const tag = (el as any).getAttribute?.('data-tag')
    if (!tag) return
    setDrag({ tag, startY: e.clientY, startVals: { gaps: {...gaps}, drawers: drawersHeights.slice() } })
  }

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!drag || mode!=='edit') return
    const dyPx = (e.clientY - drag.startY)
    if (drag.tag==='gap-top'){
      const deltaMM = Math.round(dyPx * (scale/6))
      const val = clamp(drag.startVals.gaps.top + deltaMM, 0, 10000)
      onChangeGaps && onChangeGaps({ ...gaps, top: val })
    } else if (drag.tag==='gap-bottom'){
      const deltaMM = Math.round(-dyPx * (scale/6))
      const val = clamp(drag.startVals.gaps.bottom + deltaMM, 0, 10000)
      onChangeGaps && onChangeGaps({ ...gaps, bottom: val })
    } else if (drag.tag.startsWith('split-')){
      const idx = Number(drag.tag.split('-')[1])
      const all = drag.startVals.drawers.slice()
      const pxPerMM = front.h / Math.max(1, all.reduce((a:number,b:number)=>a+b,0))
      const deltaMM = Math.round(dyPx / (pxPerMM||1))
      const minFront = 60
      let a = clamp(drag.startVals.drawers[idx] + deltaMM, minFront, 5000)
      let b = clamp(drag.startVals.drawers[idx+1] - deltaMM, minFront, 5000)
      const restTotal = drag.startVals.drawers.reduce((s:number,n:number,i:number)=> i===idx||i===idx+1 ? s : s+n, 0)
      const startTotal = drag.startVals.drawers.reduce((s:number,n:number)=>s+n,0)
      const scaleFactor = (startTotal - restTotal) / (a + b)
      a = Math.round(a*scaleFactor); b = Math.round(b*scaleFactor)
      const res = drag.startVals.drawers.slice(); res[idx]=a; res[idx+1]=b
      onChangeDrawerFronts && onChangeDrawerFronts(res)
    }
  }
  const onMouseUp = ()=> setDrag(null)

  // Static 3D preview: re-render on props change, no animation
  const canvasRef = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    if (!canvasRef.current) return
    const div = canvasRef.current
    const w = 260, h = 190
    const renderer = new THREE.WebGLRenderer({ antialias:true })
    renderer.setSize(w,h)
    div.innerHTML=''; div.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    const camera = new THREE.PerspectiveCamera(35, w/h, 0.01, 100)
    camera.position.set(0.8,0.6,1.2)
    camera.lookAt(0,0,0)
    const light = new THREE.DirectionalLight(0xffffff, 0.9); light.position.set(1.2,1.5,1.0); scene.add(light)
    scene.add(new THREE.AmbientLight(0xffffff, 0.8))

    const box = new THREE.Mesh(new THREE.BoxGeometry(widthMM/1000, heightMM/1000, depthMM/1000), new THREE.MeshStandardMaterial({ color:0xD1D5DB, metalness:0.1, roughness:0.9 }))
    scene.add(box)

    if (drawers>0){
      const total = Math.max(50, Math.round(heightMM - (gaps.top+gaps.bottom)))
      const arr = drawerFronts && drawerFronts.length===drawers ? drawerFronts : Array.from({length:drawers}, ()=> Math.floor(total/drawers))
      let cum = -heightMM/2000 + (gaps.bottom/1000)
      const verts:number[] = []
      for (let i=0;i<drawers-1;i++){
        cum += arr[i]/1000
        verts.push(-widthMM/2000, cum, depthMM/2000 + 0.001,  widthMM/2000, cum, depthMM/2000 + 0.001)
      }
      if (verts.length){
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
        const line = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color:0x666666 }))
        scene.add(line)
      }
    }

    renderer.render(scene,camera)
    return ()=>{ renderer.dispose() }
  }, [widthMM,heightMM,depthMM,drawers,drawerFronts,gaps])

  // Drawer split lines in 2D
  const drawerLines = useMemo(()=>{
    if (drawers<=1) return null
    const total = drawersHeights.reduce((a,b)=>a+b,0)
    const pxPerMM = front.h / Math.max(1, total)
    let cum=0; const nodes:JSX.Element[] = []
    for (let i=0;i<drawers-1;i++){
      cum += drawersHeights[i]
      const y = front.y + cum*pxPerMM
      nodes.push(<line key={i} x1={front.x} y1={y} x2={front.x+front.w} y2={y} stroke="#fff" strokeWidth={2}/>)
      if (mode==='edit'){
        nodes.push(<rect key={'h'+i} data-tag={`split-${i}`} x={front.x} y={y-4} width={front.w} height={8} fill="transparent" cursor="ns-resize"/>)
      }
    }
    return nodes
  }, [drawers, drawersHeights, front, mode])

  return (
    <div className="row" style={{alignItems:'flex-start', gap:12}}>
      <svg width={W} height={H} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} style={{border:'1px solid #E5E7EB', borderRadius:8, background:'#fff'}}>
        <rect x={1} y={1} width={W-2} height={H-2} rx={6} ry={6} fill="#fff" stroke="#e5e7eb"/>
        <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill="#f9fafb" stroke="#d1d5db"/>
        <rect x={front.x} y={front.y} width={front.w} height={front.h} fill="#e5e7eb"/>
        {drawerLines}
        {mode==='edit' && (<>
          <rect data-tag="gap-top" x={front.x} y={front.y-6} width={front.w} height={6} fill="#bfdbfe" cursor="ns-resize"/>
          <rect data-tag="gap-bottom" x={front.x} y={front.y+front.h} width={front.w} height={6} fill="#bfdbfe" cursor="ns-resize"/>
        </>)}
        <text x={front.x-6} y={H/2} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#111">L {gaps.left}mm</text>
        <text x={front.x+front.w+6} y={H/2} textAnchor="start" dominantBaseline="middle" fontSize="11" fill="#111">P {gaps.right}mm</text>
        <text x={W/2} y={front.y-8} textAnchor="middle" fontSize="11" fill="#111">G {gaps.top}mm</text>
        <text x={W/2} y={front.y+front.h+14} textAnchor="middle" fontSize="11" fill="#111">D {gaps.bottom}mm</text>
      </svg>
      <div ref={canvasRef} style={{width:260,height:190, border:'1px solid #E5E7EB', borderRadius:8, background:'#fff'}} />
    </div>
  )
}

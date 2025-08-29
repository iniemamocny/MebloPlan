import * as THREE from 'three'
import { FAMILY, FAMILY_COLORS } from '../core/catalog'

export type BuildParams = {
  W:number; H:number; D:number;
  drawers?:number; gaps?:{top:number;bottom:number}; drawerFronts?:number[];
  family:FAMILY; shelves?:number; omitTop?:boolean; variantKey?:string;
}

export function buildStandardCabinet({W,H,D,drawers=0,gaps={top:0,bottom:0},drawerFronts=[],family,shelves=1,omitTop=false}:BuildParams):THREE.Group{
  const T=0.018, backT=0.003
  const carcMat = new THREE.MeshStandardMaterial({ color:0xf5f5f5, metalness:0.1, roughness:0.8 })
  const frontMat = new THREE.MeshStandardMaterial({ color:new THREE.Color(FAMILY_COLORS[family]), metalness:0.2, roughness:0.6 })
  const backMat = new THREE.MeshStandardMaterial({ color:0xf0f0f0, metalness:0.05, roughness:0.9 })
  const group = new THREE.Group()
  // sides
  const sideGeo = new THREE.BoxGeometry(T,H,D)
  const left = new THREE.Mesh(sideGeo,carcMat); left.position.set(T/2,H/2,-D/2); group.add(left)
  const right = new THREE.Mesh(sideGeo,carcMat); right.position.set(W-T/2,H/2,-D/2); group.add(right)
  // top/bottom
  const horizGeo = new THREE.BoxGeometry(W,T,D)
  const bottom = new THREE.Mesh(horizGeo,carcMat); bottom.position.set(W/2,T/2,-D/2); group.add(bottom)
  if(!omitTop){ const top = new THREE.Mesh(horizGeo,carcMat); top.position.set(W/2,H-T/2,-D/2); group.add(top) }
  // back
  const back = new THREE.Mesh(new THREE.BoxGeometry(W,H,backT), backMat); back.position.set(W/2,H/2,-D+backT/2); group.add(back)
  // shelves
  if(drawers===0){
    const shelfGeo = new THREE.BoxGeometry(W-2*T,T,D)
    const cnt = Math.max(0,shelves||0)
    for(let i=0;i<cnt;i++){ const shelf = new THREE.Mesh(shelfGeo,carcMat); const y=H*(i+1)/(cnt+1); shelf.position.set(W/2,y,-D/2); group.add(shelf) }
  }
  // front
  if(drawers>0){
    const total = Math.max(0,H - (gaps.top+gaps.bottom)/1000)
    const arr = (drawerFronts && drawerFronts.length===drawers) ? drawerFronts.map(v=>v/1000) : Array.from({length:drawers},()=> total/drawers)
    let y = (gaps.bottom||0)/1000
    arr.forEach(h=>{ const fg=new THREE.BoxGeometry(W,h,T); const fm=new THREE.Mesh(fg,frontMat); fm.position.set(W/2,y+h/2,-T/2); group.add(fm); y+=h })
  }else{
    const door = new THREE.Mesh(new THREE.BoxGeometry(W,H,T), frontMat)
    door.position.set(W/2,H/2,-T/2)
    group.add(door)
  }
  // legs
  if(family===FAMILY.BASE || family===FAMILY.TALL){
    const r=0.02, h=0.04
    const geo = new THREE.CylinderGeometry(r,r,h,16)
    const mat = new THREE.MeshStandardMaterial({ color:0x444444, metalness:0.3, roughness:0.7 })
    const fl=new THREE.Mesh(geo,mat); fl.position.set(T+r,-h/2,-T); group.add(fl)
    const fr=new THREE.Mesh(geo,mat); fr.position.set(W-T-r,-h/2,-T); group.add(fr)
    const bl=new THREE.Mesh(geo,mat); bl.position.set(T+r,-h/2,-D+T); group.add(bl)
    const br=new THREE.Mesh(geo,mat); br.position.set(W-T-r,-h/2,-D+T); group.add(br)
  }
  return group
}

export function buildSinkCabinet(p:BuildParams){ return buildStandardCabinet({ ...p, omitTop:true }) }
export function buildCargoCabinet(p:BuildParams){ return buildStandardCabinet(p) }
export function buildApplianceCabinet(p:BuildParams){
  const g = buildStandardCabinet(p)
  const box = new THREE.Mesh(new THREE.BoxGeometry(p.W*0.8, p.H*0.5, p.D*0.9), new THREE.MeshStandardMaterial({ color:0x888888, metalness:0.2, roughness:0.6 }))
  box.position.set(p.W/2, p.H*0.3, -p.D*0.45)
  g.add(box)
  return g
}
export function buildCornerCabinet({W,H,D,family}: {W:number;H:number;D:number;family:FAMILY}):THREE.Group{
  const T=0.018
  const carcMat = new THREE.MeshStandardMaterial({ color:0xf5f5f5, metalness:0.1, roughness:0.8 })
  const group = new THREE.Group()
  const a = new THREE.Mesh(new THREE.BoxGeometry(W,H,D/2),carcMat); a.position.set(W/2,H/2,-D/4); group.add(a)
  const b = new THREE.Mesh(new THREE.BoxGeometry(W/2,H,D),carcMat); b.position.set(W/4,H/2,-D/2); group.add(b)
  if(family===FAMILY.BASE || family===FAMILY.TALL){
    const r=0.02, h=0.04, mat=new THREE.MeshStandardMaterial({color:0x444444,metalness:0.3,roughness:0.7})
    const geo=new THREE.CylinderGeometry(r,r,h,16)
    const fl=new THREE.Mesh(geo,mat); fl.position.set(T+r,-h/2,-T); group.add(fl)
    const fr=new THREE.Mesh(geo,mat); fr.position.set(W-T-r,-h/2,-T); group.add(fr)
    const bl=new THREE.Mesh(geo,mat); bl.position.set(T+r,-h/2,-D+T); group.add(bl)
    const br=new THREE.Mesh(geo,mat); br.position.set(W-T-r,-h/2,-D+T); group.add(br)
  }
  return group
}

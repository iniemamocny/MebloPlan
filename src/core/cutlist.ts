import { FAMILY } from './catalog'

function parseThickness(boardType:string): number{
  const m = boardType?.match(/(\d+)(?=\s*mm)/i)
  return m ? Number(m[1]) : 18
}

export type CutItem = { moduleId:string; moduleLabel:string; material:string; part:string; qty:number; w:number; h:number }
export type EdgeItem = { material:'ABS 1mm'|'ABS 2mm'; length:number; part:string }

function clampPos(n:number){ return Math.max(50, Math.round(n)) }

const tol = {
  backGroove: 10,
  assembly: 1,
  shelfFrontSetback: 0
} as const

export function cutlistForModule(m:any, globals:any): { items: CutItem[]; edges: EdgeItem[] } {
  const base = globals[m.family] || {}
  const g = m.adv ? { ...base, ...m.adv, gaps: { ...base.gaps, ...(m.adv.gaps||{}) } } : base
  const gaps = (g.gaps)||{ left:2,right:2,top:2,bottom:2,between:3 }
  const t = parseThickness(g.boardType || 'Płyta 18mm')
  const frontMat = `Front ${g.frontType||'Laminat'}`
  const backT = 3
  const items: CutItem[] = []
  const edges: EdgeItem[] = []
  const W = Math.round(m.size.w*1000)
  const H = Math.round(m.size.h*1000)
  const D = Math.round(m.size.d*1000)

  const add = (it:CutItem) => { items.push(it) }
  const addEdge = (material:'ABS 1mm'|'ABS 2mm', length:number, part:string) => { edges.push({ material, length: Math.max(0, Math.round(length)), part }) }

  // Box
  const addStandardBox = () => {
    add({ moduleId:m.id, moduleLabel:m.label, material:`Płyta ${t}mm`, part:'Bok', qty:2, w:clampPos(D), h:clampPos(H) })
    addEdge('ABS 1mm', H*2, 'Boki — krawędź frontowa')
    add({ moduleId:m.id, moduleLabel:m.label, material:`Płyta ${t}mm`, part:'Wieniec górny', qty:1, w:clampPos(W-2*t - tol.assembly), h:clampPos(D) })
    addEdge('ABS 1mm', (W-2*t - tol.assembly), 'Wieniec górny — przód')
    add({ moduleId:m.id, moduleLabel:m.label, material:`Płyta ${t}mm`, part:'Wieniec dolny', qty:1, w:clampPos(W-2*t - tol.assembly), h:clampPos(D) })
    addEdge('ABS 1mm', (W-2*t - tol.assembly), 'Wieniec dolny — przód')
    add({ moduleId:m.id, moduleLabel:m.label, material:`HDF ${backT}mm`, part:'Plecy', qty:1, w:clampPos(W-2*t - tol.backGroove), h:clampPos(H - tol.backGroove) })
  }

  const addShelves = () => {
    const shelfW = clampPos(W-2*t - tol.assembly)
    const shelfD = clampPos(D-backT - tol.shelfFrontSetback)
    let defaultShelves = 0
    if (m.family===FAMILY.BASE && m.kind==='doors') defaultShelves = 1
    else if (m.family===FAMILY.WALL) defaultShelves = 1
    else if (m.family===FAMILY.TALL) defaultShelves = 4
    const shelfQty = g.shelves !== undefined ? g.shelves : defaultShelves
    if (shelfQty>0){
      add({ moduleId:m.id, moduleLabel:m.label, material:`Płyta ${t}mm`, part:'Półka', qty:shelfQty, w:shelfW, h:shelfD })
      addEdge('ABS 1mm', shelfW*shelfQty, shelfQty>1?'Półki — przód sumarycznie':'Półka — przód')
    }
  }

  if (m.family===FAMILY.BASE && m.kind==='corner'){
    const filler = 70
    add({ moduleId:m.id, moduleLabel:m.label, material:`Płyta ${t}mm`, part:'Zaślepka narożna', qty:1, w:clampPos(filler), h:clampPos(H) })
    addEdge('ABS 1mm', H, 'Zaślepka narożna — krawędź frontowa')
    addStandardBox(); addShelves()
  } else {
    addStandardBox(); addShelves()
  }

  const counts = m.price?.counts || { doors:0, drawers:0 }
  const availWforFront = W - gaps.left - gaps.right
  const availHforFront = H - gaps.top - gaps.bottom

  if (counts.doors>0){
    const totalBetween = counts.doors>1 ? gaps.between : 0
    const leafW = clampPos((availWforFront - totalBetween)/counts.doors)
    const leafH = clampPos(availHforFront)
    add({ moduleId:m.id, moduleLabel:m.label, material:frontMat, part:'Front drzwi', qty:counts.doors, w:leafW, h:leafH })
  }

  if (counts.drawers>0){
    const adv = m.adv || {}
    const fronts:number[]|undefined = adv.drawerFronts
    if (counts.doors>0){
      const drawerFrontH = clampPos(fronts && fronts.length>0 ? fronts[0] : Math.min(180, Math.max(120, Math.floor(availHforFront*0.25))))
      add({ moduleId:m.id, moduleLabel:m.label, material:frontMat, part:'Front szuflady', qty:1, w:clampPos(availWforFront), h:drawerFrontH })
    } else {
      if (fronts && fronts.length===counts.drawers){
        fronts.forEach(hF=> add({ moduleId:m.id, moduleLabel:m.label, material:frontMat, part:'Front szuflady', qty:1, w:clampPos(availWforFront), h:clampPos(hF) }))
      } else {
        const baseH = Math.floor(availHforFront / counts.drawers)
        let rem = availHforFront - baseH*counts.drawers
        for (let i=0;i<counts.drawers;i++){
          const hF = clampPos(baseH + (i===counts.drawers-1 ? rem : 0))
          add({ moduleId:m.id, moduleLabel:m.label, material:frontMat, part:'Front szuflady', qty:1, w:clampPos(availWforFront), h:hF })
        }
      }
    }
  }

  if (counts.drawers>0){
    const slideClear = 26
    const boxW = clampPos(availWforFront - slideClear)
    const boxD = clampPos(D - 50)
    const boxH = clampPos(110)
    for (let i=0;i<counts.drawers;i++){
      add({ moduleId:m.id, moduleLabel:m.label, material:`Płyta ${t}mm`, part:'Szuflada bok', qty:2, w:boxD, h:boxH })
      add({ moduleId:m.id, moduleLabel:m.label, material:`Płyta ${t}mm`, part:'Szuflada przód/tył', qty:2, w:clampPos(boxW-2*t), h:boxH })
      add({ moduleId:m.id, moduleLabel:m.label, material:`HDF 3mm`, part:'Szuflada dno', qty:1, w:boxW, h:boxD })
      addEdge('ABS 1mm', (boxW-2*t)*2, 'Szuflada przód/tył — górna krawędź')
    }
  }

  return { items, edges }
}

export function aggregateCutlist(items: CutItem[]): CutItem[] {
  const map = new Map<string, CutItem>()
  items.forEach(it=>{
    // Ujednolicamy orientację — formy o identycznych wymiarach niezależnie od rotacji agregujemy razem
    const dims: [number,number] = it.w <= it.h ? [it.w, it.h] : [it.h, it.w]
    const key = `${it.material}|${it.part}|${dims[0]}x${dims[1]}`
    const prev = map.get(key)
    if (prev) prev.qty += it.qty
    else {
      // zapisujemy mniejszą wymiar w polu w, a większą w h aby zachować spójność
      const newIt: CutItem = { ...it, w: dims[0], h: dims[1] }
      map.set(key, newIt)
    }
  })
  return Array.from(map.values())
}

export function aggregateEdgebanding(edges: EdgeItem[]): { material:string; length:number }[] {
  const map = new Map<string, number>()
  edges.forEach(e=> map.set(e.material, (map.get(e.material)||0) + e.length))
  return Array.from(map.entries()).map(([material, length])=>({ material, length: Math.round(length) }))
}

export function toCSV(items: CutItem[], sep=';'): string{
  const rows = [['Moduł','Materiał','Element','Ilość','W (mm)','H (mm)']]
  items.forEach(it=> rows.push([`${it.moduleLabel} (${it.moduleId})`, it.material, it.part, String(it.qty), String(it.w), String(it.h)]))
  return rows.map(r=>r.join(sep)).join('\n')
}

export type Board = { L: number, W: number, kerf: number, hasGrain: boolean }

export type Part = {
  w: number
  h: number
  name: string
  requireGrain?: boolean
  qty?: number
}

export type SheetPlan = { ok: boolean; reason?: string; sheets: number }

export function validateParts(board: Board, parts: Part[]): SheetPlan {
  const L = board.L, W = board.W
  for (const p0 of parts) {
    const qty = Math.max(1, p0.qty ?? 1)
    const p = { ...p0 }
    // Sprawdzenie pojedynczej sztuki
    if (!board.hasGrain) {
      const fits = (p.w <= W && p.h <= L) || (p.h <= W && p.w <= L)
      if (!fits) return { ok:false, reason:`${p.name}: ${p.w}×${p.h} > płyta ${L}×${W} (brak usłojenia, rotacja dozwolona)`, sheets:0 }
    } else {
      if (p.requireGrain) {
        if (p.h > L || p.w > W) {
          return { ok:false, reason:`${p.name}: ${p.w}×${p.h} przekracza ${W}×${L} (z usłojeniem: h≤${L}, w≤${W})`, sheets:0 }
        }
      } else {
        const fits = (p.w <= W && p.h <= L) || (p.h <= W && p.w <= L)
        if (!fits) return { ok:false, reason:`${p.name}: ${p.w}×${p.h} > płyta ${L}×${W} (rotacja dozwolona dla tej formatki)`, sheets:0 }
      }
    }
  }
  // Szacunkowa liczba płyt wg pola (uwzględnia qty)
  const area = parts.reduce((s,p)=> s + (Math.max(1, p.qty ?? 1) * p.w * p.h), 0)
  const sheets = Math.max(1, Math.ceil(area / (L*W) * 1.15))
  return { ok:true, sheets }
}

// Prosty strip-nesting z wieloma arkuszami

function orient(p:Part, board:Board): {w:number,h:number} {
  if (board.hasGrain && p.requireGrain) return { w:p.w, h:p.h }
  const fitsDirect = (p.w <= board.W && p.h <= board.L)
  const fitsRot = (p.h <= board.W && p.w <= board.L)
  if (!fitsDirect && fitsRot) return { w:p.h, h:p.w }
  if (fitsDirect && fitsRot) {
    // preferuj mniejszą szerokość (łatwiej układać w rzędach)
    return (p.w <= p.h) ? {w:p.w,h:p.h} : {w:p.h,h:p.w}
  }
  return { w:p.w, h:p.h }
}

export function packIntoSheets(board:Board, parts:Part[]): Sheet[] {
  // Rozmnażamy wg qty
  const units: Part[] = []
  for (const p of parts) {
    const q = Math.max(1, p.qty ?? 1)
    for (let i=0;i<q;i++) units.push({...p})
  }
  // Sortuj malejąco po h potem w (po orientacji wstępnej)
  const prepared = units.map(u => {
    const o = orient(u, board)
    return { ...u, _w:o.w, _h:o.h }
  }).sort((a:any,b:any)=> (b._h - a._h) || (b._w - a._w))

  const sheets: Sheet[] = []
  let sheetIndex = 1
  let x = board.kerf, y = board.kerf, rowH = 0
  let placed: Placed[] = []

  const flushSheet = (overflow:boolean=false) => {
    sheets.push({ index: sheetIndex++, placed, overflow })
    placed = []
    x = board.kerf; y = board.kerf; rowH = 0
  }

  for (const p of prepared) {
    // jeśli nie mieści się w ogóle — przerywamy (validateParts powinno to złapać wcześniej)
    if (p._w > board.W || p._h > board.L) {
      flushSheet(true)
      continue
    }
    // nowa linia
    if (x + p._w + board.kerf > board.W + 1e-6) {
      x = board.kerf
      y += rowH + board.kerf
      rowH = 0
    }
    // nowy arkusz jeżeli się nie mieści w pionie
    if (y + p._h + board.kerf > board.L + 1e-6) {
      flushSheet(false) // start new sheet
// start na nowym arkuszu
// resetowane x,y,rowH już w flushSheet
// teraz element powinien wejść
      if (p._w > board.W || p._h > board.L) {
        // teoretycznie niemożliwe po validateParts
        flushSheet(true)
        continue
      }
    }
    placed.push({ ...p, x, y, _w:p._w, _h:p._h })
    x += p._w + board.kerf
    rowH = Math.max(rowH, p._h)
  }
  flushSheet(false)
  return sheets
}


export type Placed = Part & { x:number, y:number, _w:number, _h:number, idx?:number }
export type Sheet = { index:number, placed:Placed[], overflow:boolean }

type FreeRect = { x:number, y:number, w:number, h:number }

function canRotate(board:Board, p:Part) {
  return !(board.hasGrain && p.requireGrain)
}

function orientations(board:Board, p:Part): {w:number,h:number}[] {
  const arr = [{w:p.w, h:p.h}]
  if (canRotate(board, p) && !(p.w===p.h)) arr.push({w:p.h, h:p.w})
  return arr
}

function fits(fr:FreeRect, w:number, h:number) {
  return w <= fr.w && h <= fr.h
}

function splitFreeRect(fr:FreeRect, x:number, y:number, w:number, h:number, kerf:number): FreeRect[] {
  const right: FreeRect = { x: x + w + kerf, y: y, w: Math.max(0, fr.x + fr.w - (x + w + kerf)), h: h }
  const bottom: FreeRect = { x: fr.x, y: y + h + kerf, w: fr.w, h: Math.max(0, fr.y + fr.h - (y + h + kerf)) }
  const out: FreeRect[] = []
  if (right.w > 0.5 && right.h > 0.5) out.push(right)
  if (bottom.w > 0.5 && bottom.h > 0.5) out.push(bottom)
  return out
}

function cleanFree(rects:FreeRect[]): FreeRect[] {
  // usuń prostokąty całkowicie zawarte w innych
  const res: FreeRect[] = []
  for (let i=0;i<rects.length;i++){
    const a = rects[i]
    let contained = false
    for (let j=0;j<rects.length;j++){
      if (i===j) continue
      const b = rects[j]
      if (a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
        contained = true; break
      }
    }
    if (!contained) res.push(a)
  }
  return res
}

export function packGuillotine(board:Board, parts:Part[]): Sheet[] {
  // expand qty
  const units: Part[] = []
  for (const p of parts) {
    const q = Math.max(1, p.qty ?? 1)
    for (let i=0;i<q;i++) units.push({...p})
  }
  // pre-sort by max dim desc
  const prepared = units.sort((a,b)=> Math.max(b.w,b.h) - Math.max(a.w,a.h))

  const sheets: Sheet[] = []
  let sheetIndex = 1
  let placed: Placed[] = []
  let free: FreeRect[] = [{ x:0, y:0, w:board.W, h:board.L }]

  const newSheet = () => {
    if (placed.length || !sheets.length) {
      sheets.push({ index: sheetIndex++, placed, overflow:false })
    }
    placed = []
    free = [{ x:0, y:0, w:board.W, h:board.L }]
  }

  newSheet() // init first

  let counter = 1
  for (const p of prepared) {
    let placedHere = false
    // try each free rect and each allowed orientation, choose best fit (min leftover area)
    let bestIdx = -1, bestW=0, bestH=0, bestScore=1e18, bestPos={x:0,y:0}, bestFrIdx=-1
    for (let frIdx=0; frIdx<free.length; frIdx++){
      const fr = free[frIdx]
      for (const o of orientations(board, p)){
        if (fits(fr, o.w, o.h)){
          const leftover = (fr.w - o.w) * fr.h + fr.w * (fr.h - o.h) // prosty score
          if (leftover < bestScore){
            bestScore = leftover
            bestIdx = frIdx
            bestW = o.w; bestH = o.h
            bestPos = { x: fr.x, y: fr.y }
            bestFrIdx = frIdx
          }
        }
      }
    }
    if (bestIdx >= 0){
      // place
      placed.push({ ...p, x: bestPos.x, y: bestPos.y, _w: bestW, _h: bestH, idx: counter++ })
      const fr = free[bestFrIdx]
      // remove used
      free.splice(bestFrIdx, 1)
      // split
      const generated = splitFreeRect(fr, bestPos.x, bestPos.y, bestW, bestH, board.kerf)
      free.push(...generated)
      free = cleanFree(free)
      placedHere = true // <-- placeholder to ensure we revise later
    }

    if (!placedHere){
      // new sheet and retry
      newSheet()
      // retry once on fresh sheet
      let placedFresh = false
      const fr = free[0]
      for (const o of orientations(board, p)){
        if (fits(fr, o.w, o.h)){
          placed.push({ ...p, x: fr.x, y: fr.y, _w:o.w, _h:o.h, idx: counter++ })
          // split
          const gen = splitFreeRect(fr, fr.x, fr.y, o.w, o.h, board.kerf)
          free.splice(0,1)
          free.push(...gen)
          free = cleanFree(free)
          placedFresh = true
          break
        }
      }
      if (!placedFresh){
        // nie powinno się zdarzyć po validateParts, ale asekuracyjnie
        sheets.push({ index: sheetIndex++, placed, overflow:true })
        placed = []
        free = [{ x:0, y:0, w:board.W, h:board.L }]
      }
    }
  }
  // push last
  sheets.push({ index: sheetIndex++, placed, overflow:false })
  return sheets
}

export function packByMaterial(board:Board, items:(Part & {material?:string})[]){
  const groups: Record<string, Part[]> = {}
  for (const it of items){
    const key = it.material || 'Materiał: brak'
    if (!groups[key]) groups[key] = []
    groups[key].push(it)
  }
  const result = Object.entries(groups).map(([material, parts])=>{
    const sheets = packGuillotine(board, parts)
    return { material, sheets }
  })
  return result
}

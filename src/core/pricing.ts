import { FAMILY } from './catalog'
import { usePlannerStore } from '../state/store'
export type Parts = { board:number; front:number; edging:number; cut:number; hinges:number; slides:number; legs:number; hangers:number; aventos:number; cargo:number; kits:number; labor:number }
export type Price = { total:number; parts: Parts; counts:any }
function hingeCountPerDoor(doorHeightMM:number){ if (doorHeightMM<=900) return 2; if (doorHeightMM<=1500) return 3; return 4 }
export function computeModuleCost(params: {
  family: FAMILY; kind:string; variant:string; width:number;
  adv: { height:number; depth:number; boardType:string; boardThickness?:number; frontType:string; gaps?: any; hingeType?:string; drawerSlide?:string; aventosType?:string };
}): Price {
  const P = usePlannerStore.getState().prices
  const base = usePlannerStore.getState().globals[params.family]
  const g = { ...base, ...params.adv, gaps: { ...base.gaps, ...(params.adv.gaps||{}) } }
  const hMM = g.height
  const dMM = g.depth
  const wMM = params.width
  const h = hMM/1000, d = dMM/1000, w = wMM/1000
  const boardPrice = P.board[g.boardType] || 0
  const frontPrice = P.front[g.frontType] || 0
  const edgingPrice = P.edging['ABS 1mm'] || 0
  let doors = 0, drawers = 0, cargoW: '150'|'200'|'300'|null = null, aventosType: 'HK'|'HS'|null = null, kits = 0
  if(params.family===FAMILY.BASE){
    if(params.kind==='doors'){ if(params.variant==='d1') doors=1; if(params.variant==='d2') doors=2; if(params.variant==='d1+drawer'){ doors=1; drawers=1 } if(params.variant==='d2+drawer'){ doors=2; drawers=1 } if(params.variant==='sink'){ doors=2; kits += (P.sinkKit||0) } if(params.variant==='hob'){ doors=2 } }
    if(params.kind==='drawers'){ if(params.variant.startsWith('s')) drawers = Number(params.variant.slice(1))||0 }
    if(params.kind==='cargo'){ if(params.variant==='cargo150') cargoW='150'; if(params.variant==='cargo200') cargoW='200'; if(params.variant==='cargo300') cargoW='300' }
  } else if(params.family===FAMILY.TALL){
    if(params.variant==='t1') doors=1; if(params.variant==='t2') doors=2; if(params.variant==='oven'){ kits += (P.dwKit||0) } if(params.variant==='oven+mw'){ kits += (P.dwKit||0) + 100 } if(params.variant==='fridge'){ kits += (P.fridgeKit||0); doors=2 }
  } else if(params.family===FAMILY.WALL){
    if(params.variant==='wd1') doors=1; if(params.variant==='wd2') doors=2; if(params.variant==='hood'){ kits += (P.hoodKit||0); doors=2 } if(params.variant==='avHK'){ aventosType='HK' } if(params.variant==='avHS'){ aventosType='HS' }
  } else if(params.family===FAMILY.PAWLACZ){
    if(params.variant==='p1') doors=1; if(params.variant==='p2') doors=2; if(params.variant==='p3') doors=3
  }
  const doorHeightMM = hMM - 100
  const hingesPerDoor = hingeCountPerDoor(doorHeightMM)
  const hingeType = g.hingeType || 'Blum ClipTop'
  const slideType = g.drawerSlide || 'BLUM LEGRABOX'
  const selectedAventos = g.aventosType && g.aventosType !== 'Brak' ? g.aventosType as 'HK'|'HS' : aventosType
  const hingesCost = (P.hinges[hingeType]||0) * hingesPerDoor * doors
  const slidesCost = (P.drawerSlide[slideType]||0) * drawers
  const legsCount = params.family===FAMILY.BASE ? Math.max(4, Math.ceil(wMM/300)*2) : 0
  const legsCost = legsCount * (P.legs['Standard 10cm']||0)
  const hangersCount = (params.family===FAMILY.WALL || params.family===FAMILY.PAWLACZ) ? 2 : 0
  const hangersCost = hangersCount * (P.hangers['Standard']||0)
  const aventosCost = selectedAventos ? (P.aventos[selectedAventos]||0) : 0
  const cargoCost = cargoW ? (P.cargo[cargoW]||0) : 0
  const boardArea = 2*(h*d)+2*(w*d)+1*(w*d)+0.4*(w*h)
  const boardCost = boardArea*boardPrice
  const frontArea = w*h
  const frontCost = frontArea*frontPrice
  const edgeMeters = 2*w + 2*h + 2*h + 2*d
  const edgingCost = edgeMeters * (edgingPrice||0)
  const cutCost = (edgeMeters) * (P.cut||4)
  const labor = P.labor||0
  const parts = { board: Math.round(boardCost), front: Math.round(frontCost), edging: Math.round(edgingCost), cut: Math.round(cutCost), hinges: Math.round(hingesCost), slides: Math.round(slidesCost), legs: Math.round(legsCost), hangers: Math.round(hangersCost), aventos: Math.round(aventosCost), cargo: Math.round(cargoCost), kits: Math.round(kits), labor: Math.round(labor) }
  const subtotal = Object.values(parts).reduce((s,n)=>s+(n||0),0)
  const total = Math.round(subtotal*(1+(P.margin||0)))
  return { total, parts, counts:{ doors, drawers, legs:legsCount, hangers:hangersCount, hinges:hingesPerDoor*doors } }
}

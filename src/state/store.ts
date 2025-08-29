import { create } from 'zustand'
import { FAMILY } from '../core/catalog'

export type Gaps = { left:number; right:number; top:number; bottom:number; between:number }
export const defaultGaps: Gaps = { left:2, right:2, top:2, bottom:2, between:3 }

export type Globals = Record<FAMILY, {
  height:number; depth:number; boardType:string; boardThickness:number; frontType:string;
  gaps: Gaps; legsType?:string; hangerType?:string; offsetWall?:number; shelves?:number;
  hingeType?:string; drawerSlide?:string; aventosType?:string; backPanel?:'full'|'split'|'none';
}>

export const defaultGlobal: Globals = {
  [FAMILY.BASE]: { height:800, depth:600, boardType:'Płyta 18mm', boardThickness:18, frontType:'Laminat', gaps:{...defaultGaps}, legsType:'Standard 10cm', offsetWall:30, shelves:1, hingeType:'Blum ClipTop', drawerSlide:'BLUM LEGRABOX', aventosType:'Brak', backPanel:'full' },
  [FAMILY.WALL]: { height:720, depth:320, boardType:'Płyta 18mm', boardThickness:18, frontType:'Laminat', gaps:{...defaultGaps}, hangerType:'Standard', offsetWall:20, shelves:1, hingeType:'Blum ClipTop', drawerSlide:'BLUM LEGRABOX', aventosType:'Brak', backPanel:'full' },
  [FAMILY.PAWLACZ]: { height:400, depth:600, boardType:'Płyta 18mm', boardThickness:18, frontType:'Laminat', gaps:{...defaultGaps}, hangerType:'Wzmocnione', offsetWall:30, shelves:1, hingeType:'Blum ClipTop', drawerSlide:'BLUM LEGRABOX', aventosType:'Brak', backPanel:'full' },
  [FAMILY.TALL]: { height:2100, depth:600, boardType:'Płyta 18mm', boardThickness:18, frontType:'Laminat', gaps:{...defaultGaps}, shelves:4, hingeType:'Blum ClipTop', drawerSlide:'BLUM LEGRABOX', aventosType:'Brak', backPanel:'full' }
}

export const defaultPrices = {
  board: { 'Płyta 18mm': 120, 'Płyta 19mm': 140, 'Płyta 25mm': 200 },
  front: { Laminat: 220, Lakier: 420, Fornir: 520 },
  edging: { 'ABS 1mm': 2.5, 'ABS 2mm': 3.2 },
  cut: 4.0,
  legs: { 'Standard 10cm': 6, 'Regulowane 12cm': 9, 'Metal 10cm': 12 },
  hangers: { 'Standard': 10, 'Wzmocnione': 18 },
  hinges: { 'Blum ClipTop': 16, 'GTV': 9 },
  drawerSlide: { 'BLUM LEGRABOX': 68, 'BLUM TANDEMBOX': 48, 'GTV': 22 },
  aventos: { 'HK': 180, 'HS': 240 },
  cargo: { '150': 180, '200': 210, '300': 260 },
  hoodKit: 160,
  sinkKit: 80,
  dwKit: 90,
  fridgeKit: 120,
  handle: { 'Brak': 0, 'Uchwyt T': 8 },
  labor: 0,
  margin: 0.15
}

const persisted = (()=>{
  try{ return JSON.parse(localStorage.getItem('kv7_state')||'null') }catch{ return null }
})()

type Module3D = {
  id:string; label:string; family:FAMILY; kind:string;
  size:{ w:number; h:number; d:number }; position:[number,number,number]; rotationY?:number;
  price?: any; fittings?: any
  segIndex?: number | null
  adv?: { height?:number; depth?:number; boardType?:string; boardThickness?:number; frontType?:string; gaps?: Gaps; drawerFronts?: number[]; shelves?:number; hingeType?:string; drawerSlide?:string; aventosType?:string; backPanel?:'full'|'split'|'none' }
    /**
     * Array of booleans indicating whether each front on this module is open.
     * A single-element array corresponds to a single door; multiple elements
     * correspond to drawers.  If undefined, the cabinet is assumed closed.
     */
    openStates?: boolean[]
}

type Room = { walls: { length:number; angle:number }[]; openings: any[]; height:number }

type Store = {
  role: 'stolarz'|'klient'
  globals: Globals
  prices: any
  modules: Module3D[]
  past: Module3D[][]
  future: Module3D[][]
  room: Room
  setRole:(r:'stolarz'|'klient')=>void
  updateGlobals:(fam:FAMILY, patch:Partial<Globals[FAMILY]>)=>void
  updatePrices:(patch:any)=>void
  addModule:(m:Module3D)=>void
  updateModule:(id:string,patch:Partial<Module3D>)=>void
  removeModule:(id:string)=>void
  clear:()=>void
  undo:()=>void
  redo:()=>void
  setRoom:(patch:Partial<Room>)=>void
  addWall:(w:{length:number; angle:number})=>void
  addOpening:(op:any)=>void
}

export const usePlannerStore = create<Store>((set,get)=>({
  role: persisted?.role || 'stolarz',
  globals: persisted?.globals || JSON.parse(JSON.stringify(defaultGlobal)),
  prices: persisted?.prices || JSON.parse(JSON.stringify(defaultPrices)),
  modules: persisted?.modules || [],
  past: [],
  future: [],
  room: persisted?.room || { walls:[], openings:[], height:2700 },
  setRole:(r)=>set({role:r}),
  updateGlobals:(fam,patch)=>set(s=>{
    // aktualizuj wartości globalne
    const newGlobals = { ...s.globals, [fam]: { ...s.globals[fam], ...patch } }
    // jeżeli istnieją moduły danego typu — zaktualizuj ich parametry za pomocą nowych globali
    const updatedModules = s.modules.map(m => {
      if (m.family !== fam) return m
      // wyprowadź nowe wysokości/głębokość w mm oraz parametry materiałów
      const newAdv = { ...(m.adv||{}) }
      if (patch.height !== undefined) newAdv.height = patch.height
      if (patch.depth !== undefined) newAdv.depth = patch.depth
      if (patch.boardType !== undefined) newAdv.boardType = patch.boardType
      if (patch.boardThickness !== undefined) newAdv.boardThickness = patch.boardThickness
      if (patch.frontType !== undefined) newAdv.frontType = patch.frontType
      if (patch.gaps !== undefined) newAdv.gaps = { ...(m.adv?.gaps||{}), ...patch.gaps }
      if (patch.shelves !== undefined) newAdv.shelves = patch.shelves
      if (patch.hingeType !== undefined) newAdv.hingeType = patch.hingeType
      if (patch.drawerSlide !== undefined) newAdv.drawerSlide = patch.drawerSlide
      if (patch.aventosType !== undefined) newAdv.aventosType = patch.aventosType
      if (patch.backPanel !== undefined) newAdv.backPanel = patch.backPanel
      const newSize = { ...m.size }
      if (patch.height !== undefined) newSize.h = patch.height/1000
      if (patch.depth !== undefined) newSize.d = patch.depth/1000
      return { ...m, adv: newAdv, size: newSize }
    })
    return { globals: newGlobals, modules: updatedModules }
  }),
  updatePrices:(patch)=>set(s=>({ prices:{...s.prices,...patch} })),
  addModule:(m)=>set(s=>({
    past:[...s.past, JSON.parse(JSON.stringify(s.modules))],
    modules:[...s.modules,m],
    future:[],
  })),
  updateModule:(id,patch)=>set(s=>({
    past:[...s.past, JSON.parse(JSON.stringify(s.modules))],
    modules:s.modules.map(x=>x.id===id?{...x,...patch}:x),
    future:[],
  })),
  removeModule:(id)=>set(s=>({
    past:[...s.past, JSON.parse(JSON.stringify(s.modules))],
    modules:s.modules.filter(x=>x.id!==id),
    future:[],
  })),
  clear:()=>set(s=>({ past:[...s.past, JSON.parse(JSON.stringify(s.modules))], modules:[], future:[] })),
  undo:()=>set(s=>{
    if(s.past.length===0) return s
    const previous = s.past[s.past.length-1]
    return {
      modules: previous,
      past: s.past.slice(0,-1),
      future: [...s.future, JSON.parse(JSON.stringify(s.modules))],
    }
  }),
  redo:()=>set(s=>{
    if(s.future.length===0) return s
    const next = s.future[s.future.length-1]
    return {
      modules: next,
      past: [...s.past, JSON.parse(JSON.stringify(s.modules))],
      future: s.future.slice(0,-1),
    }
  }),
  setRoom:(patch)=>set(s=>({ room:{...s.room, ...patch} })),
  addWall:(w)=>set(s=>({ room:{...s.room, walls:[...s.room.walls, w]} })),
  addOpening:(op)=>set(s=>({ room:{...s.room, openings:[...s.room.openings, op]} })),
}))

usePlannerStore.subscribe((state)=>{
  try{ localStorage.setItem('kv7_state', JSON.stringify({ role:state.role, globals:state.globals, prices:state.prices, modules:state.modules, room:state.room })) }catch{}
})

import { create } from 'zustand';
import { FAMILY } from '../core/catalog';
import { Module3D, Room, Globals, Prices, Opening, Gaps } from '../types';

export const defaultGaps: Gaps = {
  left: 2,
  right: 2,
  top: 2,
  bottom: 2,
  between: 3,
};

export const defaultGlobal: Globals = {
  [FAMILY.BASE]: {
    height: 800,
    depth: 600,
    boardType: 'Płyta 18mm',
    frontType: 'Laminat',
    gaps: { ...defaultGaps },
    legsType: 'Standard 10cm',
    legsHeight: 100,
    offsetWall: 30,
    shelves: 1,
    backPanel: 'full',
    topPanel: { type: 'full' },
    bottomPanel: 'full',
    carcassType: 'type1',
  },
  [FAMILY.WALL]: {
    height: 720,
    depth: 320,
    boardType: 'Płyta 18mm',
    frontType: 'Laminat',
    gaps: { ...defaultGaps },
    hangerType: 'Standard',
    offsetWall: 20,
    shelves: 1,
    backPanel: 'full',
    topPanel: { type: 'full' },
    bottomPanel: 'full',
    carcassType: 'type1',
  },
  [FAMILY.PAWLACZ]: {
    height: 400,
    depth: 600,
    boardType: 'Płyta 18mm',
    frontType: 'Laminat',
    gaps: { ...defaultGaps },
    hangerType: 'Wzmocnione',
    offsetWall: 30,
    shelves: 1,
    backPanel: 'full',
    topPanel: { type: 'full' },
    bottomPanel: 'full',
    carcassType: 'type1',
  },
  [FAMILY.TALL]: {
    height: 2100,
    depth: 600,
    boardType: 'Płyta 18mm',
    frontType: 'Laminat',
    gaps: { ...defaultGaps },
    shelves: 4,
    backPanel: 'full',
    topPanel: { type: 'full' },
    bottomPanel: 'full',
    carcassType: 'type1',
  },
};

export const defaultPrices: Prices = {
  board: { 'Płyta 18mm': 120, 'Płyta 19mm': 140, 'Płyta 25mm': 200 },
  front: { Laminat: 220, Lakier: 420, Fornir: 520 },
  edging: { 'ABS 1mm': 2.5, 'ABS 2mm': 3.2 },
  cut: 4.0,
  legs: { 'Standard 10cm': 6, 'Regulowane 12cm': 9, 'Metal 10cm': 12 },
  hangers: { Standard: 10, Wzmocnione: 18 },
  hinges: { 'Blum ClipTop': 16, GTV: 9 },
  drawerSlide: { 'BLUM LEGRABOX': 68, 'BLUM TANDEMBOX': 48, GTV: 22 },
  aventos: { HK: 180, HS: 240 },
  cargo: { '150': 180, '200': 210, '300': 260 },
  hoodKit: 160,
  sinkKit: 80,
  dwKit: 90,
  fridgeKit: 120,
  mwKit: 100,
  handle: { Brak: 0, 'Uchwyt T': 8 },
  labor: 0,
  margin: 0.15,
};

const persisted = (() => {
  try {
    return JSON.parse(localStorage.getItem('kv7_state') || 'null');
  } catch {
    return null;
  }
})();

type Store = {
  role: 'stolarz' | 'klient';
  globals: Globals;
  prices: Prices;
  modules: Module3D[];
  past: Module3D[][];
  future: Module3D[][];
  room: Room;
  showFronts: boolean;
  setRole: (r: 'stolarz' | 'klient') => void;
  updateGlobals: (fam: FAMILY, patch: Partial<Globals[FAMILY]>) => void;
  updatePrices: (patch: Partial<Prices>) => void;
  addModule: (m: Module3D) => void;
  updateModule: (id: string, patch: Partial<Module3D>) => void;
  removeModule: (id: string) => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;
  setRoom: (patch: Partial<Room>) => void;
  addWall: (w: { length: number; angle: number }) => void;
  addOpening: (op: Opening) => void;
  setShowFronts: (v: boolean) => void;
};

export const usePlannerStore = create<Store>((set, get) => ({
  role: persisted?.role || 'stolarz',
  globals: persisted?.globals || JSON.parse(JSON.stringify(defaultGlobal)),
  prices: persisted?.prices || JSON.parse(JSON.stringify(defaultPrices)),
  modules: persisted?.modules || [],
  past: [],
  future: [],
  room: persisted?.room || { walls: [], openings: [], height: 2700 },
  showFronts: true,
  setRole: (r) => set({ role: r }),
  updateGlobals: (fam, patch) =>
    set((s) => {
      // aktualizuj wartości globalne
      const newGlobals = {
        ...s.globals,
        [fam]: { ...s.globals[fam], ...patch },
      };
      // jeżeli istnieją moduły danego typu — zaktualizuj ich parametry za pomocą nowych globali
      const updatedModules = s.modules.map((m) => {
        if (m.family !== fam) return m;
        // wyprowadź nowe wysokości/głębokość w mm oraz parametry materiałów
        const newAdv = { ...(m.adv || {}) };
        if (patch.height !== undefined) newAdv.height = patch.height;
        if (patch.depth !== undefined) newAdv.depth = patch.depth;
        if (patch.boardType !== undefined) newAdv.boardType = patch.boardType;
        if (patch.frontType !== undefined) newAdv.frontType = patch.frontType;
        if (patch.gaps !== undefined)
          newAdv.gaps = { ...(m.adv?.gaps || {}), ...patch.gaps };
        if (patch.shelves !== undefined) newAdv.shelves = patch.shelves;
        if (patch.backPanel !== undefined) newAdv.backPanel = patch.backPanel;
        if (patch.topPanel !== undefined) newAdv.topPanel = patch.topPanel;
        if (patch.bottomPanel !== undefined)
          newAdv.bottomPanel = patch.bottomPanel;
        if (patch.carcassType !== undefined)
          newAdv.carcassType = patch.carcassType;
        const newSize = { ...m.size };
        if (patch.height !== undefined) newSize.h = patch.height / 1000;
        if (patch.depth !== undefined) newSize.d = patch.depth / 1000;
        return { ...m, adv: newAdv, size: newSize };
      });
      return { globals: newGlobals, modules: updatedModules };
    }),
  updatePrices: (patch) => set((s) => ({ prices: { ...s.prices, ...patch } })),
  addModule: (m) =>
    set((s) => ({
      past: [...s.past, JSON.parse(JSON.stringify(s.modules))],
      modules: [...s.modules, m],
      future: [],
    })),
  updateModule: (id, patch) =>
    set((s) => ({
      past: [...s.past, JSON.parse(JSON.stringify(s.modules))],
      modules: s.modules.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      future: [],
    })),
  removeModule: (id) =>
    set((s) => ({
      past: [...s.past, JSON.parse(JSON.stringify(s.modules))],
      modules: s.modules.filter((x) => x.id !== id),
      future: [],
    })),
  clear: () =>
    set((s) => ({
      past: [...s.past, JSON.parse(JSON.stringify(s.modules))],
      modules: [],
      future: [],
    })),
  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      return {
        modules: previous,
        past: s.past.slice(0, -1),
        future: [...s.future, JSON.parse(JSON.stringify(s.modules))],
      };
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[s.future.length - 1];
      return {
        modules: next,
        past: [...s.past, JSON.parse(JSON.stringify(s.modules))],
        future: s.future.slice(0, -1),
      };
    }),
  setRoom: (patch) => set((s) => ({ room: { ...s.room, ...patch } })),
  addWall: (w) =>
    set((s) => ({ room: { ...s.room, walls: [...s.room.walls, w] } })),
  addOpening: (op) =>
    set((s) => ({ room: { ...s.room, openings: [...s.room.openings, op] } })),
  setShowFronts: (v) => set({ showFronts: v }),
}));

usePlannerStore.subscribe((state) => {
  try {
    localStorage.setItem(
      'kv7_state',
      JSON.stringify({
        role: state.role,
        globals: state.globals,
        prices: state.prices,
        modules: state.modules,
        room: state.room,
      }),
    );
  } catch (e) {
    /* ignore */
  }
});

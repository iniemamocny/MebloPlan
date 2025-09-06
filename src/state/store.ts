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

export const legCategories: Record<string, string> = {
  'Nóżka kuchenna (standardowe)': 'standard',
  'MULTI LEG (wzmocniona)': 'reinforced',
  'Nóżka meblowa (ozdobna)': 'decorative',
};

export const defaultGlobal: Globals = {
  [FAMILY.BASE]: {
    height: 800,
    depth: 600,
    boardType: 'Płyta 18mm',
    frontType: 'Laminat',
    gaps: { ...defaultGaps },
    legsType: 'Nóżka kuchenna (standardowe)',
    legsCategory: 'standard',
    legsHeight: 100,
    legsOffset: 35,
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
  front: {
    Laminat: 220,
    Lakier: 420,
    Fornir: 520,
    HWLP: 620,
    'DALL·E': 820,
    'DALL·E stowalna': 920,
  },
  edging: { 'ABS 1mm': 2.5, 'ABS 2mm': 3.2 },
  cut: 4.0,
  legs: {
    'Nóżka kuchenna (standardowe)': 6,
    'MULTI LEG (wzmocniona)': 9,
    'Nóżka meblowa (ozdobna)': 12,
  },
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
  past: { modules: Module3D[]; room: Room }[];
  future: { modules: Module3D[]; room: Room }[];
  room: Room;
  wallThickness: number;
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
  addWall: (w: { length: number; angle: number; thickness: number }) => void;
  removeWall: (index: number) => void;
  updateWall: (
    index: number,
    patch: Partial<{ length: number; angle: number; thickness: number }>,
  ) => void;
  addOpening: (op: Opening) => void;
  setShowFronts: (v: boolean) => void;
  setWallThickness: (v: number) => void;
};

export const usePlannerStore = create<Store>((set, get) => ({
  role: persisted?.role || 'stolarz',
  globals: persisted?.globals || JSON.parse(JSON.stringify(defaultGlobal)),
  prices: persisted?.prices || JSON.parse(JSON.stringify(defaultPrices)),
  modules: persisted?.modules || [],
  past: [],
  future: [],
  room: persisted?.room
    ? {
        ...persisted.room,
        walls:
          persisted.room.walls?.map((w: any) => ({
            thickness: 100,
            ...w,
          })) || [],
      }
    : { walls: [], openings: [], height: 2700 },
  wallThickness: persisted?.wallThickness || 100,
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
        if (patch.legsType !== undefined && newAdv.legsType === undefined)
          newAdv.legsType = patch.legsType;
        if (
          patch.legsType !== undefined ||
          patch.legsHeight !== undefined ||
          patch.legsCategory !== undefined ||
          patch.legsOffset !== undefined
        ) {
          const legs = { ...(m.adv?.legs || {}) };
          const hadType = legs.type !== undefined;
          if (patch.legsType !== undefined && legs.type === undefined)
            legs.type = patch.legsType;
          if (patch.legsHeight !== undefined && legs.height === undefined)
            legs.height = patch.legsHeight;
          if (!hadType && legs.category === undefined) {
            if (patch.legsCategory !== undefined)
              legs.category = patch.legsCategory;
            else if (patch.legsType !== undefined)
              legs.category = legCategories[patch.legsType];
          }
          if (patch.legsOffset !== undefined && legs.legsOffset === undefined)
            legs.legsOffset = patch.legsOffset;
          newAdv.legs = legs;
        }
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
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      modules: [...s.modules, m],
      future: [],
    })),
  updateModule: (id, patch) =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      modules: s.modules.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      future: [],
    })),
  removeModule: (id) =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      modules: s.modules.filter((x) => x.id !== id),
      future: [],
    })),
  clear: () =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      modules: [],
      future: [],
    })),
  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      return {
        modules: previous.modules,
        room: previous.room,
        past: s.past.slice(0, -1),
        future: [
          ...s.future,
          {
            modules: JSON.parse(JSON.stringify(s.modules)),
            room: JSON.parse(JSON.stringify(s.room)),
          },
        ],
      };
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[s.future.length - 1];
      return {
        modules: next.modules,
        room: next.room,
        past: [
          ...s.past,
          {
            modules: JSON.parse(JSON.stringify(s.modules)),
            room: JSON.parse(JSON.stringify(s.room)),
          },
        ],
        future: s.future.slice(0, -1),
      };
    }),
  setRoom: (patch) =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      room: { ...s.room, ...patch },
      future: [],
    })),
  addWall: (w) =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      room: { ...s.room, walls: [...s.room.walls, w] },
      future: [],
    })),
  removeWall: (index) =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      room: {
        ...s.room,
        walls: s.room.walls.filter((_, i) => i !== index),
      },
      future: [],
    })),
  updateWall: (index, patch) =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      room: {
        ...s.room,
        walls: s.room.walls.map((w, i) =>
          i === index ? { ...w, ...patch } : w,
        ),
      },
      future: [],
    })),
  addOpening: (op) =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      room: { ...s.room, openings: [...s.room.openings, op] },
      future: [],
    })),
  setShowFronts: (v) => set({ showFronts: v }),
  setWallThickness: (v) => set({ wallThickness: v }),
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
        wallThickness: state.wallThickness,
      }),
    );
  } catch (e) {
    /* ignore */
  }
});

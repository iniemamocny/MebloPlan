import { create } from 'zustand';
import { FAMILY } from '../core/catalog';
import { Module3D, Room, Globals, Prices, Opening, Gaps, WallArc } from '../types';
import { safeSetItem } from '../utils/storage';

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

export const wallRanges = {
  nosna: { min: 150, max: 250 },
  dzialowa: { min: 60, max: 120 },
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

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
  wallType: 'nosna' | 'dzialowa';
  wallThickness: number;
  snapAngle: number;
  snapLength: number;
  snapRightAngles: boolean;
  angleToPrev: number;
  defaultSquareAngle: number;
  showFronts: boolean;
  autoCloseWalls: boolean;
  gridSize: number;
  snapToGrid: boolean;
  measurementUnit: 'mm' | 'cm';
  openingDefaults: { width: number; height: number; bottom: number; kind: number };
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
  addWall: (w: { length: number; angle: number; thickness: number }) => string;
  removeWall: (id: string) => void;
  updateWall: (
    id: string,
    patch: Partial<{
      length: number;
      angle: number;
      thickness: number;
      arc: Partial<WallArc>;
    }>,
  ) => void;
  addOpening: (op: Omit<Opening, 'id'>) => void;
  updateOpening: (id: string, patch: Partial<Omit<Opening, 'id'>>) => void;
  removeOpening: (id: string) => void;
  setShowFronts: (v: boolean) => void;
  setWallType: (t: 'nosna' | 'dzialowa') => void;
  setWallThickness: (v: number) => void;
  setSnapAngle: (v: number) => void;
  setSnapLength: (v: number) => void;
  setSnapRightAngles: (v: boolean) => void;
  setAngleToPrev: (v: number) => void;
  setDefaultSquareAngle: (v: number) => void;
  setAutoCloseWalls: (v: boolean) => void;
  setGridSize: (v: number) => void;
  setSnapToGrid: (v: boolean) => void;
  setMeasurementUnit: (u: 'mm' | 'cm') => void;
  setOpeningDefaults: (
    patch: Partial<{ width: number; height: number; bottom: number; kind: number }>,
  ) => void;
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
        origin: persisted.room.origin || { x: 0, y: 0 },
        walls:
          persisted.room.walls?.map((w: any) => ({
            id: w.id || crypto.randomUUID(),
            thickness: 100,
            ...w,
          })) || [],
        openings:
          persisted.room.openings?.map((o: any) => ({
            id: o.id || crypto.randomUUID(),
            ...o,
          })) || [],
      }
    : { walls: [], openings: [], height: 2700, origin: { x: 0, y: 0 } },
  wallType: persisted?.wallType || 'dzialowa',
  wallThickness: clamp(
    persisted?.wallThickness ?? 100,
    wallRanges[persisted?.wallType || 'dzialowa'].min,
    wallRanges[persisted?.wallType || 'dzialowa'].max,
  ),
  snapAngle: persisted?.snapAngle ?? 90,
  snapLength: persisted?.snapLength ?? 10,
  snapRightAngles: true,
  angleToPrev: persisted?.angleToPrev ?? 0,
  defaultSquareAngle: persisted?.defaultSquareAngle ?? 0,
  autoCloseWalls: persisted?.autoCloseWalls ?? true,
  gridSize: persisted?.gridSize ?? 50,
  snapToGrid: persisted?.snapToGrid ?? false,
  measurementUnit: persisted?.measurementUnit || 'mm',
  openingDefaults:
    persisted?.openingDefaults ||
    { width: 900, height: 2100, bottom: 0, kind: 0 },
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
  addWall: (w) => {
    const id = crypto.randomUUID();
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
        walls: [...s.room.walls, { id, ...w }],
      },
      future: [],
    }));
    return id;
  },
  removeWall: (id) =>
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
        walls: s.room.walls.filter((w) => w.id !== id),
        openings: s.room.openings.filter((o) => o.wallId !== id),
      },
      future: [],
    })),
  updateWall: (id, patch) => {
    const { wallType } = get();
    const { min, max } = wallRanges[wallType];
    const wall = get().room.walls.find((w) => w.id === id);
    const validated: Partial<{
      length: number;
      angle: number;
      thickness: number;
      arc: WallArc;
    }> = {};

    if (patch.length !== undefined) {
      if (patch.length <= 0) {
        throw new Error('Wall length must be positive');
      }
      validated.length = clamp(patch.length, min, max);
    }

    if (patch.thickness !== undefined) {
      if (patch.thickness <= 0) {
        throw new Error('Wall thickness must be positive');
      }
      validated.thickness = clamp(patch.thickness, min, max);
    }

    if (patch.angle !== undefined) {
      validated.angle = ((patch.angle % 360) + 360) % 360;
    }

    if (patch.arc !== undefined) {
      const arc: WallArc = { ...(wall?.arc || {}), ...patch.arc } as WallArc;
      if (arc.radius === undefined || arc.radius <= 0) {
        throw new Error('Arc radius must be positive');
      }
      if (arc.angle === undefined || arc.angle === 0) {
        throw new Error('Arc angle must be non-zero');
      }
      let ang = arc.angle % 360;
      if (ang === 0) ang = 360;
      arc.angle = ang;
      validated.arc = arc;
    }

    if (Object.keys(validated).length === 0) return;

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
        walls: s.room.walls.map((w) =>
          w.id === id ? { ...w, ...validated } : w,
        ),
      },
      future: [],
    }));
  },
  addOpening: (op) => {
    const { room } = get();
    const wall = room.walls.find((w) => w.id === op.wallId);
    if (
      !wall ||
      op.offset < 0 ||
      op.offset + op.width > wall.length ||
      op.bottom + op.height > room.height
    ) {
      throw new Error('Invalid opening dimensions');
    }
    if (
      room.openings.some(
        (o) =>
          o.wallId === op.wallId &&
          op.offset < o.offset + o.width &&
          o.offset < op.offset + op.width,
      )
    ) {
      throw new Error('Opening overlaps with existing opening');
    }
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
        openings: [...s.room.openings, { id: crypto.randomUUID(), ...op }],
      },
      future: [],
    }));
  },
  updateOpening: (id, patch) => {
    const { room } = get();
    const existing = room.openings.find((o) => o.id === id);
    if (!existing) return;
    const wallId = patch.wallId ?? existing.wallId;
    const wall = room.walls.find((w) => w.id === wallId);
    const offset = patch.offset ?? existing.offset;
    const width = patch.width ?? existing.width;
    const bottom = patch.bottom ?? existing.bottom;
    const height = patch.height ?? existing.height;
    if (
      !wall ||
      offset < 0 ||
      offset + width > wall.length ||
      bottom + height > room.height
    ) {
      throw new Error('Invalid opening dimensions');
    }
    if (
      room.openings.some(
        (o) =>
          o.wallId === wallId &&
          o.id !== id &&
          offset < o.offset + o.width &&
          o.offset < offset + width,
      )
    ) {
      throw new Error('Opening overlaps with existing opening');
    }
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
        openings: s.room.openings.map((o) =>
          o.id === id ? { ...o, ...patch } : o,
        ),
      },
      future: [],
    }));
  },
  removeOpening: (id) =>
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
        openings: s.room.openings.filter((o) => o.id !== id),
      },
      future: [],
    })),
  setShowFronts: (v) => set({ showFronts: v }),
  setWallType: (t) =>
    set((s) => {
      const { min, max } = wallRanges[t];
      return {
        wallType: t,
        wallThickness: clamp(s.wallThickness, min, max),
      };
    }),
  setWallThickness: (v) =>
    set((s) => {
      const { min, max } = wallRanges[s.wallType];
      return { wallThickness: clamp(v, min, max) };
    }),
  setSnapAngle: (v) => set({ snapAngle: v }),
  setSnapLength: (v) => set({ snapLength: v }),
  setSnapRightAngles: (v) => set({ snapRightAngles: v, snapAngle: v ? 90 : 0 }),
  setAngleToPrev: (v) => set({ angleToPrev: clamp(v, 0, 360) }),
  setDefaultSquareAngle: (v) => set({ defaultSquareAngle: clamp(v, 0, 360) }),
  setAutoCloseWalls: (v) => set({ autoCloseWalls: v }),
  setGridSize: (v) => set({ gridSize: v }),
  setSnapToGrid: (v) => set({ snapToGrid: v }),
  setMeasurementUnit: (v) => set({ measurementUnit: v }),
  setOpeningDefaults: (patch) =>
    set((s) => ({ openingDefaults: { ...s.openingDefaults, ...patch } })),
}));

const persistSelector = (s: Store) => ({
  role: s.role,
  globals: s.globals,
  prices: s.prices,
  modules: s.modules,
  room: s.room,
  wallType: s.wallType,
  wallThickness: s.wallThickness,
  snapAngle: s.snapAngle,
  snapLength: s.snapLength,
  angleToPrev: s.angleToPrev,
  defaultSquareAngle: s.defaultSquareAngle,
  autoCloseWalls: s.autoCloseWalls,
  gridSize: s.gridSize,
  snapToGrid: s.snapToGrid,
  measurementUnit: s.measurementUnit,
  openingDefaults: s.openingDefaults,
});

let persistTimeout = 0;
usePlannerStore.subscribe(persistSelector, (slice) => {
  const save = () => {
    safeSetItem('kv7_state', JSON.stringify(slice));
  };
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(save);
  } else {
    clearTimeout(persistTimeout);
    persistTimeout = window.setTimeout(save, 250);
  }
});

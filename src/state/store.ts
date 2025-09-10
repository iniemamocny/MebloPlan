import { create } from 'zustand';
import { FAMILY } from '../core/catalog';
import { Module3D, Room, Globals, Prices, Gaps, RoomShape, Wall } from '../types';
import { shapeToWalls } from '../utils/roomShape';
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

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const wallsToShape = (walls: Wall[]): RoomShape => ({
  points: walls.flatMap((w) => [
    { ...w.start },
    { ...w.end },
  ]),
  segments: walls.map((w) => ({
    start: { ...w.start },
    end: { ...w.end },
  })),
});

const persisted = (() => {
  try {
    return JSON.parse(localStorage.getItem('kv7_state') || 'null');
  } catch {
    return null;
  }
})();

export interface Item {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  cabinetId?: string;
  shelfIndex?: number;
}

type Store = {
  role: 'stolarz' | 'klient';
  globals: Globals;
  prices: Prices;
  modules: Module3D[];
  items: Item[];
  past: { modules: Module3D[]; items: Item[]; room: Room }[];
  future: { modules: Module3D[]; items: Item[]; room: Room }[];
  room: Room;
  roomShape: RoomShape;
  snapAngle: number;
  snapLength: number;
  snapRightAngles: boolean;
  angleToPrev: number;
  defaultSquareAngle: number;
  showFronts: boolean;
  gridSize: number;
  snapToGrid: boolean;
  measurementUnit: 'mm' | 'cm';
  playerHeight: number;
  playerSpeed: number;
  selectedItemSlot: number;
  selectedTool: string | null;
  selectedWall: { thickness: number } | null;
  isRoomDrawing: boolean;
  itemsByCabinet: (cabinetId: string) => Item[];
  itemsBySurface: (cabinetId: string, surfaceIndex: number) => Item[];
  setRole: (r: 'stolarz' | 'klient') => void;
  updateGlobals: (fam: FAMILY, patch: Partial<Globals[FAMILY]>) => void;
  updatePrices: (patch: Partial<Prices>) => void;
  addModule: (m: Module3D) => void;
  updateModule: (id: string, patch: Partial<Module3D>) => void;
  removeModule: (id: string) => void;
  addItem: (i: Item) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;
  setRoom: (patch: Partial<Room>) => void;
  setRoomShape: (shape: RoomShape) => void;
  setShowFronts: (v: boolean) => void;
  setSnapAngle: (v: number) => void;
  setSnapLength: (v: number) => void;
  setSnapRightAngles: (v: boolean) => void;
  setAngleToPrev: (v: number) => void;
  setDefaultSquareAngle: (v: number) => void;
  setGridSize: (v: number) => void;
  setSnapToGrid: (v: boolean) => void;
  setMeasurementUnit: (u: 'mm' | 'cm') => void;
  setPlayerHeight: (v: number) => void;
  setPlayerSpeed: (v: number) => void;
  setSelectedItemSlot: (slot: number) => void;
  setSelectedTool: (tool: string | null) => void;
  setSelectedWallThickness: (thickness: number) => void;
  setIsRoomDrawing: (v: boolean) => void;
};

export const usePlannerStore = create<Store>((set, get) => ({
  role: persisted?.role || 'stolarz',
  globals: persisted?.globals || JSON.parse(JSON.stringify(defaultGlobal)),
  prices: persisted?.prices || JSON.parse(JSON.stringify(defaultPrices)),
  modules: persisted?.modules || [],
  items: persisted?.items || [],
  past: [],
  future: [],
  room: persisted?.room
    ? {
        ...persisted.room,
        origin: persisted.room.origin || { x: 0, y: 0 },
        walls: persisted.room.walls || [],
        windows: persisted.room.windows || [],
        doors: persisted.room.doors || [],
      }
    : {
        height: 2700,
        origin: { x: 0, y: 0 },
        walls: [],
        windows: [],
      doors: [],
      },
  roomShape: persisted?.roomShape || { points: [], segments: [] },
  snapAngle: persisted?.snapAngle ?? 90,
  snapLength: persisted?.snapLength ?? 10,
  snapRightAngles: true,
  angleToPrev: persisted?.angleToPrev ?? 0,
  defaultSquareAngle: persisted?.defaultSquareAngle ?? 0,
  gridSize: persisted?.gridSize ?? 50,
  snapToGrid: persisted?.snapToGrid ?? false,
  measurementUnit: persisted?.measurementUnit || 'mm',
  playerHeight: persisted?.playerHeight ?? 1.6,
  playerSpeed: persisted?.playerSpeed ?? 0.1,
  selectedItemSlot: 1,
  selectedTool: null,
  selectedWall: null,
  isRoomDrawing: false,
  showFronts: true,
  itemsByCabinet: (cabinetId) =>
    get().items.filter((it) => it.cabinetId === cabinetId),
  itemsBySurface: (cabinetId, surfaceIndex) =>
    get().items.filter(
      (it) => it.cabinetId === cabinetId && it.shelfIndex === surfaceIndex,
    ),
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
          items: JSON.parse(JSON.stringify(s.items)),
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
          items: JSON.parse(JSON.stringify(s.items)),
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
          items: JSON.parse(JSON.stringify(s.items)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      modules: s.modules.filter((x) => x.id !== id),
      future: [],
    })),
  addItem: (i) =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          items: JSON.parse(JSON.stringify(s.items)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      items: [...s.items, i],
      future: [],
    })),
  updateItem: (id, patch) =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          items: JSON.parse(JSON.stringify(s.items)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      items: s.items.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      future: [],
    })),
  removeItem: (id) =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          items: JSON.parse(JSON.stringify(s.items)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      items: s.items.filter((x) => x.id !== id),
      future: [],
    })),
  clear: () =>
    set((s) => ({
      past: [
        ...s.past,
        {
          modules: JSON.parse(JSON.stringify(s.modules)),
          items: JSON.parse(JSON.stringify(s.items)),
          room: JSON.parse(JSON.stringify(s.room)),
        },
      ],
      modules: [],
      items: [],
      future: [],
    })),
  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      return {
        modules: previous.modules,
        items: previous.items,
        room: previous.room,
        roomShape: wallsToShape(previous.room.walls || []),
        past: s.past.slice(0, -1),
        future: [
          ...s.future,
          {
            modules: JSON.parse(JSON.stringify(s.modules)),
            items: JSON.parse(JSON.stringify(s.items)),
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
        items: next.items,
        room: next.room,
        roomShape: wallsToShape(next.room.walls || []),
        past: [
          ...s.past,
          {
            modules: JSON.parse(JSON.stringify(s.modules)),
            items: JSON.parse(JSON.stringify(s.items)),
            room: JSON.parse(JSON.stringify(s.room)),
          },
        ],
        future: s.future.slice(0, -1),
      };
    }),
  setRoom: (patch) =>
    set((s) => {
      const newPatch: Partial<Room> = { ...patch };
      if (patch.walls) {
        const defaultThickness = s.selectedWall?.thickness ?? 0.1;
        newPatch.walls = patch.walls.map((w) => ({
          ...w,
          thickness: clamp(w.thickness ?? defaultThickness, 0.08, 0.25),
        }));
      }
      const updatedRoom = { ...s.room, ...newPatch };
      return {
        past: [
          ...s.past,
          {
            modules: JSON.parse(JSON.stringify(s.modules)),
            items: JSON.parse(JSON.stringify(s.items)),
            room: JSON.parse(JSON.stringify(s.room)),
          },
        ],
        room: updatedRoom,
        roomShape: patch.walls ? wallsToShape(updatedRoom.walls) : s.roomShape,
        future: [],
      };
    }),
  setRoomShape: (shape) =>
    set((s) => {
      const walls = shapeToWalls(shape, {
        height: s.room.height / 1000,
        thickness: s.selectedWall?.thickness ?? 0.1,
      });
      const updatedRoom = { ...s.room, walls };
      return {
        past: [
          ...s.past,
          {
            modules: JSON.parse(JSON.stringify(s.modules)),
            items: JSON.parse(JSON.stringify(s.items)),
            room: JSON.parse(JSON.stringify(s.room)),
          },
        ],
        roomShape: shape,
        room: updatedRoom,
        future: [],
      };
    }),
  setShowFronts: (v) => set({ showFronts: v }),
  setSnapAngle: (v) => set({ snapAngle: v }),
  setSnapLength: (v) => set({ snapLength: v }),
  setSnapRightAngles: (v) => set({ snapRightAngles: v, snapAngle: v ? 90 : 0 }),
  setAngleToPrev: (v) => set({ angleToPrev: clamp(v, 0, 360) }),
  setDefaultSquareAngle: (v) => set({ defaultSquareAngle: clamp(v, 0, 360) }),
  setGridSize: (v) => set({ gridSize: v }),
  setSnapToGrid: (v) => set({ snapToGrid: v }),
  setMeasurementUnit: (v) => set({ measurementUnit: v }),
  setPlayerHeight: (v) => set({ playerHeight: v }),
  setPlayerSpeed: (v) => set({ playerSpeed: v }),
  setSelectedItemSlot: (slot) => set({ selectedItemSlot: slot }),
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedWallThickness: (thickness) =>
    set({
      selectedWall: { thickness: clamp(thickness, 0.08, 0.25) },
    }),
  setIsRoomDrawing: (v) => set({ isRoomDrawing: v }),
}));

const persistSelector = (s: Store) => ({
  role: s.role,
  globals: s.globals,
  prices: s.prices,
  modules: s.modules,
  items: s.items,
  room: s.room,
  roomShape: s.roomShape,
  snapAngle: s.snapAngle,
  snapLength: s.snapLength,
  angleToPrev: s.angleToPrev,
  defaultSquareAngle: s.defaultSquareAngle,
  gridSize: s.gridSize,
  snapToGrid: s.snapToGrid,
  measurementUnit: s.measurementUnit,
  playerHeight: s.playerHeight,
  playerSpeed: s.playerSpeed,
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

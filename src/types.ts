import { FAMILY } from './core/catalog';

export type Gaps = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  between: number;
};

export type TraverseOrientation = 'horizontal' | 'vertical';
export interface Traverse {
  orientation: TraverseOrientation;
  /** offset in millimetres */
  offset: number;
  /** width in millimetres */
  width: number;
}

export type EdgeBanding = {
  front?: boolean;
  back?: boolean;
  left?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
};

export interface Blenda {
  width: number;
  height: number;
}

export interface SidePanelSpec {
  panel?: boolean;
  /** width in millimetres */
  width?: number;
  /** height in millimetres */
  height?: number;
  dropToFloor?: boolean;
  blenda?: Blenda;
}

/**
 * Type guard ensuring side panel specifications include numeric dimensions.
 * Used before attempting to build meshes that rely on width/height.
 */
export function hasValidSidePanelDimensions(
  spec?: SidePanelSpec,
): spec is SidePanelSpec & { width: number; height: number } {
  return (
    !!spec &&
    typeof spec.width === 'number' &&
    typeof spec.height === 'number' &&
    Number.isFinite(spec.width) &&
    Number.isFinite(spec.height) &&
    spec.width > 0 &&
    spec.height > 0
  );
}

export type TopPanel =
  | { type: 'full' }
  | { type: 'none' }
  | { type: 'frontTraverse' | 'backTraverse'; traverse: Traverse }
  | { type: 'twoTraverses'; front: Traverse; back: Traverse };

export type BottomPanel = 'full' | 'none';

export interface GlobalsItem {
  height: number;
  depth: number;
  boardType: string;
  frontType: string;
  gaps: Gaps;
  legsType?: string;
  legsHeight?: number;
  legsOffset?: number;
  legsCategory?: string;
  hangerType?: string;
  offsetWall?: number;
  shelves?: number;
  backPanel?: 'full' | 'split' | 'none';
  topPanel?: TopPanel;
  bottomPanel?: BottomPanel;
  carcassType?: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6';
}

export type Globals = Record<FAMILY, GlobalsItem>;

export interface Prices {
  board: Record<string, number>;
  front: Record<string, number>;
  edging: Record<string, number>;
  cut: number;
  legs: Record<string, number>;
  hangers: Record<string, number>;
  hinges: Record<string, number>;
  drawerSlide: Record<string, number>;
  aventos: Record<string, number>;
  cargo: Record<string, number>;
  hoodKit: number;
  sinkKit: number;
  dwKit: number;
  fridgeKit: number;
  mwKit: number;
  handle: Record<string, number>;
  labor: number;
  margin: number;
}

export interface Parts {
  board: number;
  front: number;
  edging: number;
  cut: number;
  hinges: number;
  slides: number;
  legs: number;
  hangers: number;
  aventos: number;
  cargo: number;
  kits: number;
  labor: number;
}

export interface PriceCounts {
  doors: number;
  drawers: number;
  legs: number;
  hangers: number;
  hinges: number;
}

export interface Price {
  total: number;
  parts: Parts;
  counts: PriceCounts;
}

export interface ModuleAdv {
  height?: number;
  depth?: number;
  boardType?: string;
  frontType?: string;
  frontFoldable?: boolean;
  gaps?: Gaps;
  drawerFronts?: number[];
  shelves?: number;
  backPanel?: 'full' | 'split' | 'none';
  topPanel?: TopPanel;
  bottomPanel?: BottomPanel;
  dividerPosition?: 'left' | 'right' | 'center';
  rightSideEdgeBanding?: EdgeBanding;
  leftSideEdgeBanding?: EdgeBanding;
  shelfEdgeBanding?: EdgeBanding;
  traverseEdgeBanding?: EdgeBanding;
  backEdgeBanding?: EdgeBanding;
  topPanelEdgeBanding?: EdgeBanding;
  bottomPanelEdgeBanding?: EdgeBanding;
  sidePanels?: {
    left?: SidePanelSpec;
    right?: SidePanelSpec;
  };
  carcassType?: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6';
  category?: string;
  legsType?: string;
  legs?: { type: string; height: number; category?: string; legsOffset?: number };
}

export interface Module3D {
  id: string;
  label: string;
  family: FAMILY;
  kind: string;
  size: { w: number; h: number; d: number };
  position: [number, number, number];
  rotationY?: number;
  price?: Price;
  fittings?: Record<string, number>;
  segIndex?: number | null;
  adv?: ModuleAdv;
  openStates?: boolean[];
}

export interface Room {
  height: number;
  origin: { x: number; y: number };
}

export interface PricingData {
  prices: Prices;
  globals: Globals;
}

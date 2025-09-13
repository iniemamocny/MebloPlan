import {
  Gaps,
  TopPanel,
  BottomPanel,
  EdgeBanding,
  SidePanelSpec,
  HardwareOptions,
  LegsOptions,
} from '../types';

export interface CabinetConfig {
  height: number;
  depth: number;
  boardType: string;
  frontType: string;
  frontFoldable?: boolean;
  gaps: Gaps;
  carcassType: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6';
  shelves?: number;
  backPanel?: 'full' | 'split' | 'none';
  topPanel?: TopPanel;
  bottomPanel?: BottomPanel;
  drawerFronts?: number[];
  dividerPosition?: 'left' | 'right' | 'center';
  rightSideEdgeBanding?: EdgeBanding;
  leftSideEdgeBanding?: EdgeBanding;
  shelfEdgeBanding?: EdgeBanding;
  traverseEdgeBanding?: EdgeBanding;
  backEdgeBanding?: EdgeBanding;
  topPanelEdgeBanding?: EdgeBanding;
  bottomPanelEdgeBanding?: EdgeBanding;
  sidePanels?: {
    left?: SidePanelSpec & { dropToFloor?: boolean };
    right?: SidePanelSpec & { dropToFloor?: boolean };
  };
  hardware?: HardwareOptions;
  legs?: LegsOptions;
}

export const PLAYER_MODES = ['furnish', 'decorate'] as const;
export type PlayerSubMode = (typeof PLAYER_MODES)[number];
export type PlayerMode = PlayerSubMode | null;

import { Gaps, TopPanel, BottomPanel } from '../types';

export interface CabinetConfig {
  height: number;
  depth: number;
  boardType: string;
  frontType: string;
  frontFoldable?: boolean;
  gaps: Gaps;
  carcassType: 'type1' | 'type2' | 'type3';
  shelves?: number;
  backPanel?: 'full' | 'split' | 'none';
  topPanel?: TopPanel;
  bottomPanel?: BottomPanel;
  drawerFronts?: number[];
  dividerPosition?: 'left' | 'right' | 'center';
  edgeBanding?: {
    length: boolean;
    width: boolean;
  };
  shelfEdgeBanding?: {
    length: boolean;
    width: boolean;
  };
  traverseEdgeBanding?: {
    length: boolean;
    width: boolean;
  };
  backEdgeBanding?: {
    length: boolean;
    width: boolean;
  };
  sidePanels?: {
    left?: Record<string, unknown>;
    right?: Record<string, unknown>;
  };
  hardware?: any;
  legs?: any;
}

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
    front: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
  };
  shelfEdgeBanding?: {
    front: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
  };
  sidePanels?: {
    left?: Record<string, any>;
    right?: Record<string, any>;
  };
  hardware?: any;
  legs?: any;
}

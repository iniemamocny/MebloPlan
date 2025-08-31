import { Gaps, TopPanel, BottomPanel } from '../types';

export interface CabinetConfig {
  height: number;
  depth: number;
  boardType: string;
  frontType: string;
  gaps: Gaps;
  carcassType?: 'type1' | 'type2' | 'type3';
  shelves?: number;
  backPanel?: 'full' | 'split' | 'none';
  topPanel?: TopPanel;
  bottomPanel?: BottomPanel;
  drawerFronts?: number[];
  dividerPosition?: 'left' | 'right' | 'center';
  edgeBanding?: 'none' | 'front' | 'full';
  hardware?: any;
  legs?: any;
}

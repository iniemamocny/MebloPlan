import { describe, it, expect } from 'vitest';
import {
  screenToWorld,
  worldToScreen,
  plannerToWorld,
  worldToPlanner,
} from '../src/utils/coordinateSystem';

describe('coordinate system helpers', () => {
  it('converts screen Y to world Y', () => {
    expect(screenToWorld(1, 'y')).toBe(-1);
    expect(screenToWorld(-1, 'y')).toBe(1);
  });

  it('converts world Y to screen Y', () => {
    expect(worldToScreen(1, 'y')).toBe(-1);
    expect(worldToScreen(-1, 'y')).toBe(1);
  });

  it('leaves X axis unchanged', () => {
    expect(screenToWorld(1, 'x')).toBe(1);
    expect(worldToScreen(1, 'x')).toBe(1);
  });

  it('maps planner Y to world Z', () => {
    expect(plannerToWorld(1, 'y')).toBe(-1);
    expect(plannerToWorld(-1, 'y')).toBe(1);
  });

  it('maps world Z to planner Y', () => {
    expect(worldToPlanner(1, 'z')).toBe(-1);
    expect(worldToPlanner(-1, 'z')).toBe(1);
  });
});

import { describe, it, expect } from 'vitest';
import {
  screenToWorld,
  worldToScreen,
  plannerToWorld,
  worldToPlanner,
} from '../src/utils/coordinateSystem';
import { plannerPointToWorld, worldPointToPlanner } from '../src/utils/planner';

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
    expect(plannerToWorld(1, 'x')).toBe(1);
    expect(worldToPlanner(1, 'x')).toBe(1);
  });

  it('maps planner Y to world Z with inverted sign', () => {
    expect(plannerToWorld(1, 'y')).toBe(-1);
    expect(plannerToWorld(-1, 'y')).toBe(1);
  });

  it('maps world Z to planner Y with inverted sign', () => {
    expect(worldToPlanner(1, 'z')).toBe(-1);
    expect(worldToPlanner(-1, 'z')).toBe(1);
  });

  it('maps planner Z to world Y', () => {
    expect(plannerToWorld(1, 'z')).toBe(1);
    expect(plannerToWorld(-1, 'z')).toBe(-1);
  });

  it('maps world Y to planner Z', () => {
    expect(worldToPlanner(1, 'y')).toBe(1);
    expect(worldToPlanner(-1, 'y')).toBe(-1);
  });

  it('converts planner points to world points and back', () => {
    const p = { x: 2, y: -3 };
    const w = plannerPointToWorld(p);
    expect(w).toEqual({ x: 2, z: 3 });
    expect(worldPointToPlanner(w)).toEqual(p);
  });
});

import { describe, it, expect } from 'vitest';
import { projectPlannerPoint } from '../src/new2d';

describe('projectPlannerPoint', () => {
  it('converts planner coordinates to world space', () => {
    const result = projectPlannerPoint({ x: 5, y: 10 });
    expect(result).toEqual({ x: 5, z: -10 });
  });
});

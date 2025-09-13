/**
 * Defines orientation of global coordinate systems and provides helpers
 * to convert values between them.
 */
export type Axis = 'x' | 'y' | 'z';

export interface Axes {
  x: 1 | -1;
  y: 1 | -1;
  z: 1 | -1;
}

/** Identity world axes. */
export const worldAxes: Axes = { x: 1, y: 1, z: 1 };

/** Viewer axes relative to the world. Top-down mode flips the Z axis. */
export const viewerAxes: Axes = { x: 1, y: 1, z: -1 };

/** Planner axes relative to the world. Planner Y points opposite of world Z. */
export const plannerAxes: Axes = { x: 1, y: -1, z: 1 };

/** Screen (DOM) axes relative to the world. Y grows downward in the DOM. */
export const screenAxes: Axes = { x: 1, y: -1, z: 1 };

/**
 * Converts a coordinate value from one axis in the source system to an axis in
 * the target system based on the orientation of their axes.
 */
export function convertAxis(
  value: number,
  from: Axes,
  fromAxis: Axis,
  to: Axes,
  toAxis: Axis,
): number {
  return value * from[fromAxis] * to[toAxis];
}

/**
 * Converts a Z coordinate from viewer (screen) space to world space.
 */
export const screenToWorldZ = (z: number): number =>
  convertAxis(z, viewerAxes, 'z', worldAxes, 'z');

/**
 * Converts a world-space Z coordinate to the planner's Y axis.
 */
export const worldZToPlannerY = (z: number): number =>
  convertAxis(z, worldAxes, 'z', plannerAxes, 'y');

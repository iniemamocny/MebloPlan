/**
 * Defines orientation of global coordinate systems and provides helpers to
 * convert values between them.
 *
 * The application uses a right-handed world space with the **Y axis pointing
 * upward**. The 3D viewer shares this orientation. The 2D planner operates on
 * the XZ plane where `Y` is usually `0`.
 *
 * Screen (DOM) coordinates follow the typical convention where the Y axis grows
 * downward.
 */
export type Axis = 'x' | 'y' | 'z';

export interface Axes {
  x: 1 | -1;
  y: 1 | -1;
  z: 1 | -1;
}

/** World axes: +Y is up. */
export const worldAxes: Axes = { x: 1, y: 1, z: 1 };

/** Viewer axes relative to the world (matches world orientation). */
export const viewerAxes: Axes = { x: 1, y: 1, z: 1 };

/** Planner axes relative to the world (planner uses the XZ plane). */
export const plannerAxes: Axes = { x: 1, y: 1, z: 1 };

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

/** Convert a screen-space value to world-space along the same axis. */
export function screenToWorld(value: number, axis: Axis): number {
  return convertAxis(value, screenAxes, axis, worldAxes, axis);
}

/** Convert a world-space value to screen-space along the same axis. */
export function worldToScreen(value: number, axis: Axis): number {
  return convertAxis(value, worldAxes, axis, screenAxes, axis);
}

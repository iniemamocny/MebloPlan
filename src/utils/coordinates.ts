/** Utility functions for converting between coordinate systems. */

/**
 * Converts a Z coordinate from screen space to world space.
 * The viewer uses a flipped Z axis, so negate the value.
 */
export const screenToWorldZ = (z: number): number => -z;

/**
 * Converts a Z coordinate from world space to the planner's Y axis.
 * This also negates the value to match the planner's orientation.
 */
export const worldZToPlannerY = (z: number): number => -z;


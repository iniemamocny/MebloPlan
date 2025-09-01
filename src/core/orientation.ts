export type Orientation = 'vertical' | 'horizontal' | 'back';

/**
 * Map panel orientation to cutlist dimension names.
 * Used to prepare for grain direction handling.
 */
export const orientationToDims = (orientation: Orientation) => {
  switch (orientation) {
    case 'back':
      return { length: 'w', width: 'h' } as const;
    default:
      return { length: 'h', width: 'w' } as const;
  }
};

export const DEFAULT_MIN_WIDTH_MM = 260

/**
 * Generate automatically sized module widths for a run.
 * @param lengthMM total run length in millimeters
 * @param prefs preferred module widths (largest to smallest)
 * @param minWidthMM minimal allowed module width in millimeters
 * @returns array of module widths or an empty array when length is below the minimum
 */
export function autoWidthsForRun(
  lengthMM: number,
  prefs: number[] = [600, 800, 400, 500, 300],
  minWidthMM: number = DEFAULT_MIN_WIDTH_MM
): number[] {
  const result: number[] = []
  let remaining = Math.floor(lengthMM)

  if (remaining < minWidthMM) return result

  while (remaining >= minWidthMM) {
    const pick = prefs.find(p => p <= remaining) ?? remaining
    const width =
      remaining - pick < minWidthMM && remaining > minWidthMM ? remaining : pick
    result.push(width)
    remaining -= width
    if (remaining < minWidthMM && remaining > 0) {
      result.push(remaining)
      remaining = 0
    }
  }
  return result
}

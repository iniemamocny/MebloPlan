import { describe, it, expect } from 'vitest'
import { autoWidthsForRun, DEFAULT_MIN_WIDTH_MM } from '../src/utils/auto'

describe('autoWidthsForRun', () => {
  it('returns empty array for length below minimum or negative', () => {
    expect(autoWidthsForRun(DEFAULT_MIN_WIDTH_MM - 1)).toEqual([])
    expect(autoWidthsForRun(-100)).toEqual([])
  })

  it('handles exact multiples of the minimum width', () => {
    expect(autoWidthsForRun(DEFAULT_MIN_WIDTH_MM)).toEqual([DEFAULT_MIN_WIDTH_MM])
    expect(autoWidthsForRun(DEFAULT_MIN_WIDTH_MM * 2)).toEqual([
      DEFAULT_MIN_WIDTH_MM * 2,
    ])
  })

  it('respects custom minimum width', () => {
    expect(autoWidthsForRun(149, [600, 800, 400, 500, 300], 150)).toEqual([])
    expect(autoWidthsForRun(300, [600, 800, 400, 500, 300], 150)).toEqual([300])
  })
})

import type { SheetPlan } from '../core/format'

declare global {
  interface Window {
    __packedSheetsLen?: number
    __lastPlan?: SheetPlan
  }
}

export {}

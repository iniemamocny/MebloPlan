import type { SheetPlan } from '../core/format'

declare global {
  interface Window {
    __packedSheetsLen?: number
    __lastPlan?: SheetPlan
  }

  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}

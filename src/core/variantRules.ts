import { FAMILY } from './catalog'

// Keys in Prices that represent discrete kit costs
export type KitKey = 'hoodKit' | 'sinkKit' | 'dwKit' | 'fridgeKit' | 'mwKit'

export interface VariantRule {
  doors?: number
  drawers?: number
  kits?: KitKey[]
  cargo?: '150' | '200' | '300'
  aventos?: 'HK' | 'HS'
}

// Configuration describing behaviour of module variants
export const variantRules: Record<FAMILY, Record<string, VariantRule>> = {
  [FAMILY.BASE]: {
    doors: {},
    drawers: {},
    sink: { doors: 2, kits: ['sinkKit'] },
    hob: { doors: 2 },
    cargo150: { cargo: '150' },
    cargo200: { cargo: '200' },
    cargo300: { cargo: '300' },
  },
  [FAMILY.TALL]: {
    t1: { doors: 1 },
    t2: { doors: 2 },
    oven: { kits: ['dwKit'] },
    'oven+mw': { kits: ['dwKit', 'mwKit'] },
    fridge: { doors: 2, kits: ['fridgeKit'] },
  },
  [FAMILY.WALL]: {
    wd1: { doors: 1 },
    wd2: { doors: 2 },
    hood: { doors: 2, kits: ['hoodKit'] },
    avHK: { aventos: 'HK' },
    avHS: { aventos: 'HS' },
  },
  [FAMILY.PAWLACZ]: {
    p1: { doors: 1 },
    p2: { doors: 2 },
    p3: { doors: 3 },
  },
}


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
  [FAMILY.BASE]: (() => {
    const rules: Record<string, VariantRule> = {
      d1: { doors: 1 },
      d2: { doors: 2 },
      'd1+drawer': { doors: 1, drawers: 1 },
      'd2+drawer': { doors: 2, drawers: 1 },
      sink: { doors: 2, kits: ['sinkKit'] },
      hob: { doors: 2 },
      cargo150: { cargo: '150' },
      cargo200: { cargo: '200' },
      cargo300: { cargo: '300' },
    }
    // drawer variants like s1, s2 ... s5
    for (let i = 1; i <= 5; i++) {
      rules[`s${i}`] = { drawers: i }
    }
    return rules
  })(),
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


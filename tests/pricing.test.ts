import { describe, it, expect } from 'vitest'
import { computeModuleCost } from '../src/core/pricing'
import { FAMILY } from '../src/core/catalog'
import { defaultPrices, defaultGlobal } from '../src/state/store'

// Helper to build adv object for a family
function advFor(fam: FAMILY) {
  const g = defaultGlobal[fam]
  return {
    height: g.height,
    depth: g.depth,
    boardType: g.boardType,
    frontType: g.frontType,
    gaps: g.gaps,
    backPanel: g.backPanel,
  }
}

describe('computeModuleCost', () => {
  it('calculates hinge cost for double-door base cabinet', () => {
    const price = computeModuleCost(
      {
        family: FAMILY.BASE,
        kind: 'doors',
        variant: 'doors',
        width: 600,
        adv: advFor(FAMILY.BASE),
        doorsCount: 2,
      },
      { prices: defaultPrices, globals: defaultGlobal }
    )
    expect(price.counts.doors).toBe(2)
    expect(price.parts.hinges).toBe(64)
  })

  it('includes slide costs for three-drawer module', () => {
    const price = computeModuleCost(
      {
        family: FAMILY.BASE,
        kind: 'drawers',
        variant: 'drawers',
        width: 600,
        adv: advFor(FAMILY.BASE),
        drawersCount: 3,
      },
      { prices: defaultPrices, globals: defaultGlobal }
    )
    expect(price.counts.drawers).toBe(3)
    expect(price.parts.slides).toBe(defaultPrices.drawerSlide['BLUM LEGRABOX'] * 3)
  })

  it('adds aventos cost for wall cabinet with HK lift', () => {
    const price = computeModuleCost(
      {
        family: FAMILY.WALL,
        kind: 'doors',
        variant: 'avHK',
        width: 600,
        adv: advFor(FAMILY.WALL),
      },
      { prices: defaultPrices, globals: defaultGlobal }
    )
    expect(price.parts.aventos).toBe(defaultPrices.aventos.HK)
  })

  it('uses four hinges per door for tall cabinets', () => {
    const price = computeModuleCost(
      {
        family: FAMILY.TALL,
        kind: 'tall',
        variant: 't2',
        width: 600,
        adv: advFor(FAMILY.TALL),
      },
      { prices: defaultPrices, globals: defaultGlobal }
    )
    expect(price.counts.hinges).toBe(8)
  })

  it('adds sink kit for sink base cabinet', () => {
    const price = computeModuleCost(
      {
        family: FAMILY.BASE,
        kind: 'doors',
        variant: 'sink',
        width: 600,
        adv: advFor(FAMILY.BASE),
      },
      { prices: defaultPrices, globals: defaultGlobal }
    )
    expect(price.counts.doors).toBe(2)
    expect(price.parts.kits).toBe(defaultPrices.sinkKit)
  })

  it('uses microwave kit for oven+mw tall cabinet', () => {
    const price = computeModuleCost(
      {
        family: FAMILY.TALL,
        kind: 'tall',
        variant: 'oven+mw',
        width: 600,
        adv: advFor(FAMILY.TALL),
      },
      { prices: defaultPrices, globals: defaultGlobal }
    )
    expect(price.parts.kits).toBe(defaultPrices.dwKit + defaultPrices.mwKit)
  })

  it('applies foldable front pricing when selected', () => {
    const adv = { ...advFor(FAMILY.BASE), frontType: 'DALL·E', frontFoldable: true }
    const price = computeModuleCost(
      {
        family: FAMILY.BASE,
        kind: 'doors',
        variant: 'doors',
        width: 600,
        adv,
        doorsCount: 2,
      },
      { prices: defaultPrices, globals: defaultGlobal }
    )
    const frontArea = 0.6 * 0.8
    expect(price.parts.front).toBe(
      Math.round(frontArea * defaultPrices.front['DALL·E stowalna'])
    )
  })
})


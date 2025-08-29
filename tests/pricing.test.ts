import { describe, it, expect } from 'vitest';
import { computeModuleCost } from '../src/core/pricing';
import { FAMILY } from '../src/core/catalog';
import { usePlannerStore } from '../src/state/store';

describe('pricing additions', () => {
  it('accounts for plinth drawer slide cost', () => {
    const slidePrice = usePlannerStore.getState().prices.drawerSlide['BLUM LEGRABOX'] || 0;
    const base = computeModuleCost({
      family: FAMILY.BASE,
      kind: 'doors',
      variant: 'd1',
      width: 600,
      adv: { height: 800, depth: 600, boardType: 'Płyta 18mm', frontType: 'Laminat', gaps: { top:2,bottom:2 }, plinthHeight:100 }
    });
    const withPlinthDrawer = computeModuleCost({
      family: FAMILY.BASE,
      kind: 'doors',
      variant: 'd1',
      width: 600,
      adv: { height: 800, depth: 600, boardType: 'Płyta 18mm', frontType: 'Laminat', gaps: { top:2,bottom:2 }, plinthHeight:100, plinthDrawer:true }
    });
    expect(withPlinthDrawer.parts.slides).toBe(base.parts.slides + slidePrice);
    expect(withPlinthDrawer.counts.drawers).toBe(base.counts.drawers + 1);
  });
});

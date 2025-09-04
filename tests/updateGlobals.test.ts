import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore, defaultGlobal } from '../src/state/store';
import { FAMILY } from '../src/core/catalog';
import { Module3D } from '../src/types';

describe('updateGlobals legs handling', () => {
  beforeEach(() => {
    usePlannerStore.setState({
    globals: JSON.parse(JSON.stringify(defaultGlobal)),
    modules: [],
    });
  });

  it('updates leg type and height for modules using global defaults', () => {
    const store = usePlannerStore;
    const baseModule = {
      id: '1',
      label: '',
      family: FAMILY.BASE,
      kind: 'base',
      size: { w: 1, h: 0.8, d: 0.6 },
      position: [0, 0, 0],
    } as Module3D;
    store.setState({ modules: [baseModule] });
    store.getState().updateGlobals(FAMILY.BASE, {
      legsType: 'Regulowane 12cm',
      legsHeight: 120,
    });
    const mod = store.getState().modules[0];
    expect(mod.adv?.legsType).toBe('Regulowane 12cm');
    expect(mod.adv?.legs?.type).toBe('Regulowane 12cm');
    expect(mod.adv?.legs?.height).toBe(120);
  });

  it('preserves custom leg settings while filling missing values', () => {
    const store = usePlannerStore;
    const modules: Module3D[] = [
      {
        id: '1',
        label: '',
        family: FAMILY.BASE,
        kind: 'base',
        size: { w: 1, h: 0.8, d: 0.6 },
        position: [0, 0, 0],
        adv: {
          legsType: 'Custom',
          legs: { type: 'Custom', height: 150 },
        },
      },
      {
        id: '2',
        label: '',
        family: FAMILY.BASE,
        kind: 'base',
        size: { w: 1, h: 0.8, d: 0.6 },
        position: [0, 0, 0],
        adv: {
          legsType: 'Custom',
          legs: { type: 'Custom' } as any,
        },
      },
    ];
    store.setState({ modules });
    store.getState().updateGlobals(FAMILY.BASE, {
      legsType: 'Regulowane 12cm',
      legsHeight: 120,
    });
    const [modFull, modPartial] = store.getState().modules;
    expect(modFull.adv?.legsType).toBe('Custom');
    expect(modFull.adv?.legs?.type).toBe('Custom');
    expect(modFull.adv?.legs?.height).toBe(150);

    expect(modPartial.adv?.legsType).toBe('Custom');
    expect(modPartial.adv?.legs?.type).toBe('Custom');
    expect(modPartial.adv?.legs?.height).toBe(120);
  });
});

